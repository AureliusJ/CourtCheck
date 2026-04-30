# CourtCheck — Claude Code Kickoff Prompt (Week 4)

> Add this file to docs/ in your repo.
> Start Claude Code with:
> "Read docs/CLAUDE_CODE_WEEK4_KICKOFF.md, docs/PRD.md, and
>  docs/TECH_DESIGN.md. Ask clarifying questions, confirm the
>  commit discipline, then tell me your build order before
>  writing any code."

---

## Paste this into Claude Code:

```
We are continuing to build CourtCheck. Week 3 is complete and
tagged (v0.3-week3). The busy-times screen and weather hint
are working.

Read docs/PRD.md and docs/TECH_DESIGN.md before starting.
This week makes the app fully interactive — users can submit
queue updates for the first time.

================================================================================
PROJECT STATE (what exists)
================================================================================
- Home screen: all 5 states working
- GET /api/park/current: median queue, wait formula, staleness,
  weather hint
- GET /api/park/busy-times: hourly aggregation, daylight clipping
- /busy-times page: board selector, day selector, Recharts chart
- lib/weather.ts: Open-Meteo integration with 15-min cache
- All shared types in lib/api/types.ts
- Supabase clients in lib/db/client.ts
- suncalc wrapper in lib/sun.ts

================================================================================
WEEK 4 SCOPE — BUILD EXACTLY THIS, NOTHING MORE
================================================================================

────────────────────────────────────────────────────────────────────────────────
1. lib/hashing.ts — device and IP hashing
────────────────────────────────────────────────────────────────────────────────

File: lib/hashing.ts (server-side only)

Two functions:
- hashDevice(deviceHash: string): string
  HMAC-SHA256 of deviceHash using HASH_SALT env var
  Use Node.js crypto module: createHmac('sha256', salt)
- hashIp(ip: string): string
  Same approach for IP addresses

Never store raw IPs or device tokens. Always hash first.
The HASH_SALT env var is already in .env.local.

────────────────────────────────────────────────────────────────────────────────
2. lib/ratelimit.ts — Upstash sliding window
────────────────────────────────────────────────────────────────────────────────

File: lib/ratelimit.ts (server-side only)

Use @upstash/ratelimit + @upstash/redis (already installed).
Two rate limiters:

PER_BOARD_DEVICE: 1 request per 90 seconds
  key: `report:device:{hashedDevice}:{boardId}`

PER_IP_GLOBAL: 30 requests per hour
  key: `report:ip:{hashedIp}`

Export a single function:
checkRateLimit(hashedDevice: string, hashedIp: string, boardId: string)
  → { allowed: boolean; retryAfter?: number }

If Upstash is unreachable: fail closed on writes
(return allowed: false with retryAfter: 30).
Log the error but never throw to the caller.

────────────────────────────────────────────────────────────────────────────────
3. POST /api/reports — submit a queue update
────────────────────────────────────────────────────────────────────────────────

File: app/api/reports/route.ts

Follow TECH_DESIGN.md §5.2 exactly.

Request body:
{
  boardId: string
  queueCount: number
  courtCondition: 'dry' | 'wet' | 'unknown'
  afterSunsetConfirmed?: boolean
}

Also read from request headers:
- X-Device-Hash: the client's random device token (unhashed)
- X-Forwarded-For or request IP: for rate limiting (unhashed)

Processing order (strict — do not reorder):
1. Parse and validate request body
   - boardId: must exist in boards table
   - queueCount: integer 0–15
   - courtCondition: one of dry/wet/unknown
   - Return 400 on any failure
2. Extract device hash from X-Device-Hash header
   If missing: generate a random fallback (don't block the request)
3. Extract IP from X-Forwarded-For header
4. Hash both: hashDevice(deviceHash), hashIp(ip)
5. Check rate limit: checkRateLimit(hashedDevice, hashedIp, boardId)
   If not allowed: return 429 { error: { code: 'rate_limited' },
   retryAfter: N }
6. Server-side sunset check:
   Compute isAfterSunset using getSunWindow() for Ramsden coords
   If isAfterSunset AND afterSunsetConfirmed !== true:
   Return 409 { error: { code: 'after_sunset_unconfirmed' } }
7. Get park_id from the board record (query boards table)
8. Insert report:
   INSERT INTO reports (
     park_id, board_id, queue_count, court_condition,
     photo_url, photo_status, photo_expires_at,
     device_hash, ip_hash
   ) VALUES (
     $park_id, $boardId, $queueCount, $courtCondition,
     null, 'none', null,
     $hashedDevice, $hashedIp
   )
9. Return 201 { reportId: uuid, photoStatus: 'none' }

No photo upload yet — that is Week 5.
No moderation yet — that is Week 5.

────────────────────────────────────────────────────────────────────────────────
4. lib/device.ts — client-side device hash
────────────────────────────────────────────────────────────────────────────────

File: lib/device.ts (client-side only, 'use client')

Already specced in TECH_DESIGN.md §6.5.
Generate a random 32-char hex token on first visit,
store in localStorage under 'court_device_hash',
return the same token on subsequent visits.

Export: getOrCreateDeviceHash(): string

────────────────────────────────────────────────────────────────────────────────
5. hooks/useSubmitReport.ts
────────────────────────────────────────────────────────────────────────────────

File: hooks/useSubmitReport.ts

Use TanStack useMutation.
Calls POST /api/reports with:
- body: { boardId, queueCount, courtCondition, afterSunsetConfirmed }
- headers: { 'X-Device-Hash': getOrCreateDeviceHash() }

Handle these response codes explicitly:
- 201: success → invalidate ['current-park'] query so home 
  screen refreshes immediately
- 409 code 'after_sunset_unconfirmed': set a local state flag
  so the update page can show the after-sunset modal
- 429: extract retryAfter from response, surface to UI
- 400/500: surface generic error message

Export: useSubmitReport()
Returns: { mutate, isPending, error, isAfterSunsetConflict,
           retryAfter }

────────────────────────────────────────────────────────────────────────────────
6. /update page — the full update flow
────────────────────────────────────────────────────────────────────────────────

File: app/update/page.tsx
New components:
- components/BoardPicker.tsx  (if tapped from CTA, not from map)
- components/QueueStepper.tsx
- components/ConditionToggle.tsx
- components/AfterSunsetModal.tsx

ROUTING:
The page receives an optional ?board= query param.
- If ?board=ramsden-a (or b or c): skip the board picker,
  go straight to the update form for that board.
  This is how court tile taps work on the home screen.
- If no ?board= param (user tapped the sticky CTA):
  Show the court map as a board picker first.
  Tapping a court tile sets the board and advances to the form.

Update the home screen court tile tap and sticky CTA:
- Court tile tap: navigate to /update?board={boardId}
- Sticky CTA: navigate to /update (no param)

LAYOUT — STEP 1 (board picker, only shown when no ?board= param):
- "< BACK" link top-left
- Small-caps eyebrow: "SELECT A BOARD"
- Serif heading: "Which courts are you at?"
- The full court map component (reuse CourtMap.tsx)
  but in "picker mode" — tapping a tile sets the board
  and advances to step 2, does not navigate away
- Below the map: same condensed legend as home screen

LAYOUT — STEP 2 (update form):
- "< BACK" link top-left (goes back to step 1 or to / if
  board was pre-selected via query param)
- Small-caps eyebrow: board label e.g. "BOARD B"
- Serif heading: "Updating Court 3"
  (show the first court number for the selected board:
   A→1, B→3, C→5)

a) QUEUE STEPPER
   Two large circular tap buttons (− and +)
   Uses board's brand color for the + button
   (terracotta for A, amber for B, sage for C)
   − button: outlined in brand color
   Big serif number in the middle: 0–15
   Below: "rackets in queue" in small sans
   Default value: last reported count for this board
   (fetch from useCurrentPark data if available, else 0)

b) CONDITION TOGGLE
   Three pills side by side: Dry / Wet / Unknown
   Selected: filled bg-brand-text (charcoal), cream text
   Unselected: outlined
   Default: last reported condition for this board, else 'unknown'

c) PHOTO UPLOAD TILE (placeholder — not functional yet)
   Dashed border tile: "Add a photo (optional)"
   Camera icon centered
   Tapping shows a toast: "Photo upload coming soon"
   Do NOT wire up actual upload — that is Week 5
   Style it correctly so Week 5 just needs to replace the handler

d) SUBMIT BUTTON
   Full-width dark charcoal pill: "Submit update +"
   Shows loading spinner while isPending
   Disabled while isPending

e) SUCCESS STATE
   On 201: show a full-screen or overlay thank-you state:
   - Serif heading: "Thanks for updating!"
   - Sans body: "Board {X} updated. Your report helps 
     everyone at Ramsden."
   - After 2 seconds: automatically navigate back to /
   - Do not show a toast (the auto-navigate is enough)

f) ERROR STATE
   On 429: show inline message below submit button:
   "You just updated — please wait {N} seconds"
   On 400/500: "Something went wrong. Please try again."
   Both in small sans, muted color

────────────────────────────────────────────────────────────────────────────────
7. AfterSunsetModal component
────────────────────────────────────────────────────────────────────────────────

File: components/AfterSunsetModal.tsx

Triggered when useSubmitReport returns isAfterSunsetConflict=true.
This means the server rejected the submission because it detected
the user is submitting after sunset without confirming.

Modal content (match Variant design exactly):
- Centered moon icon (lucide-react Moon, amber color)
- Serif heading: "Courts likely closed"
- Sans body: "Sunset was at {time}. The courts are unlit.
  Are you sure you want to submit an update?"
- Two buttons:
  Primary (full-width charcoal pill): "Yes, update anyway"
    → retries the submission with afterSunsetConfirmed: true
  Secondary (full-width outlined pill): "Cancel"
    → dismisses the modal, stays on the update page

Modal overlay: semi-transparent dark backdrop
Modal card: warm cream background (#F8F6F1), radius-modal (24px)
Animation: fade in from below (simple CSS transition)

================================================================================
WHAT NOT TO BUILD THIS WEEK
================================================================================
- Photo upload (Week 5)
- Vision SafeSearch moderation (Week 5)
- Cron jobs (Week 5)
- Sentry error tracking (Week 6)
- Plausible analytics (Week 6)
- About page (Week 6)
- Any testing beyond manual verification

================================================================================
COMMIT DISCIPLINE — MANDATORY
================================================================================
Target: 10–15 commits this week. This is the biggest week.
Push after every commit. No batching across logical units.

Expected commits:
  feat: add device and IP hashing (lib/hashing.ts)
  feat: add Upstash rate limiter (lib/ratelimit.ts)
  feat: add POST /api/reports endpoint
  feat: add client-side device hash (lib/device.ts)
  feat: add useSubmitReport mutation hook
  feat: add QueueStepper component
  feat: add ConditionToggle component
  feat: add AfterSunsetModal component
  feat: add BoardPicker step to /update page
  feat: add update form step to /update page
  feat: wire court tile taps to /update?board=X
  feat: wire sticky CTA to /update (no param)
  feat: add success state with auto-navigate
  feat: add photo upload placeholder tile
  fix: (any bugs that come up)

================================================================================
BUILD ORDER (strict — inside-out)
================================================================================
1. lib/hashing.ts
2. lib/ratelimit.ts
3. app/api/reports/route.ts
   → Test with curl before touching UI:
   curl -X POST http://localhost:3000/api/reports \
     -H "Content-Type: application/json" \
     -H "X-Device-Hash: test-device-123" \
     -d '{"boardId":"ramsden-a","queueCount":3,
          "courtCondition":"dry"}'
   Expected: 201 with reportId
   Check Supabase table editor — row should appear in reports table
4. lib/device.ts
5. hooks/useSubmitReport.ts
6. components/QueueStepper.tsx
7. components/ConditionToggle.tsx
8. components/AfterSunsetModal.tsx
9. components/BoardPicker.tsx
10. app/update/page.tsx (assemble everything)
11. Wire home screen navigation (court tiles + sticky CTA)
12. Test the full flow end-to-end

DO NOT start the /update page until the API endpoint is tested
with curl and a real row appears in Supabase.
DO NOT wire navigation until the form itself works in isolation.

================================================================================
CRITICAL THINGS TO GET RIGHT
================================================================================

1. RATE LIMIT KEY INCLUDES BOARD ID
   A user can submit to Board A, then immediately to Board B.
   This is intentional (they may be reporting multiple boards
   as they walk through the park). Rate limit is per-board,
   not global per device.

2. SERVER-SIDE SUNSET CHECK IS MANDATORY
   Never trust the client's afterSunsetConfirmed field without
   independently computing sunset server-side. The client can
   lie. Server uses getSunWindow() with Ramsden coords.

3. STEPPER DEFAULT VALUE
   Default to the last reported queueCount for the selected board
   from useCurrentPark data. If no data: default to 0.
   This makes updates faster for regulars who usually increment
   or decrement by 1.

4. QUERY PARAM ROUTING
   /update?board=ramsden-a must skip the board picker entirely.
   /update (no param) must show the board picker first.
   Both end up at the same form — the difference is just step 1.

5. INVALIDATE THE CACHE ON SUCCESS
   After a successful 201, call queryClient.invalidateQueries
   on ['current-park']. This forces the home screen to refetch
   immediately when the user navigates back, so they see their
   own report reflected instantly.

================================================================================
BEFORE YOU START
================================================================================
1. Read PRD.md §6.2 (reporter flow), §8 (F3 quick queue update,
   F7 anti-spam, F11 photo placeholder) and TECH_DESIGN.md
   §5.2 (POST /api/reports), §6.5 (device hash), §10 (security)
2. Ask clarifying questions
3. Confirm commit discipline
4. Confirm build order
5. Start with lib/hashing.ts
```
