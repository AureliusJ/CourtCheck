# CourtCheck — Claude Code Kickoff Prompt (Week 2)

> Paste everything below the horizontal line into Claude Code.
> Also drag and drop these files into the Claude Code context:
> - docs/PRD.md
> - docs/TECH_DESIGN.md
> - Any Variant AI design screenshots you've saved locally
>
> Use this exact message to start the session:
> "Read docs/PRD.md, docs/TECH_DESIGN.md, and docs/CLAUDE_CODE_WEEK2_KICKOFF.md
> fully before doing anything. Also look at the screenshots in docs/design/.
> When you've read everything, ask me clarifying questions, confirm the commit
> discipline, then tell me your build order before writing any code."

---

## Paste this into Claude Code:

```
You are helping me build CourtCheck — a mobile-first public web app for
Ramsden Park tennis courts in Toronto. Players use it to check real-time
queue counts for 3 queue boards (covering 8 courts) before deciding to
head over.

I've attached two spec documents:
- PRD.md — what and why (product requirements)
- TECH_DESIGN.md — how (architecture, schema, API contracts, types, tokens)

Read both documents fully before writing any code. When something in the
PRD conflicts with the TECH_DESIGN, the TECH_DESIGN wins on implementation
details.

================================================================================
PROJECT STATE (what's already done)
================================================================================

- Next.js 14+ project scaffolded with TypeScript, Tailwind, App Router
- Supabase project provisioned with all 4 tables created and seeded:
  parks (1 row: Ramsden), boards (3 rows: A/B/C), reports (empty),
  busy_times_hourly (empty)
- All npm dependencies installed (see package.json)
- Design tokens wired into tailwind.config.ts (brand colors, fonts, radii)
- Google Fonts (Inter + Playfair Display) added to app/layout.tsx
- .env.local has: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY,
  SUPABASE_SERVICE_ROLE_KEY, UPSTASH_REDIS_REST_URL,
  UPSTASH_REDIS_REST_TOKEN, HASH_SALT, CRON_SECRET

================================================================================
WEEK 2 SCOPE — BUILD EXACTLY THIS, NOTHING MORE
================================================================================

1. LIB LAYER
   Create these files following TECH_DESIGN.md exactly:
   - lib/api/types.ts         (all shared TypeScript types from TDD §6.2)
   - lib/db/client.ts         (Supabase client setup for server + client)
   - lib/sun.ts               (suncalc wrapper from TDD §7.1)

2. API ENDPOINT
   Create app/api/park/current/route.ts
   - Follows the contract in TECH_DESIGN.md §5.2 exactly
   - Returns all three boards with current state per board
   - "Current" = median queue_count over reports in the last 30 minutes
     per board (or null/stale if none)
   - Computes: queueCount, courtCondition, photoUrl, lastUpdatedAt,
     minutesAgo, isStale, confirmationCount, waitMinutes,
     waitDisplayLow, waitDisplayHigh
   - Wait formula: base = (queueCount / courtsOnBoard) × 30,
     low = round(base × 0.83), high = round(base × 1.33)
   - If queueCount = 0: waitMinutes = 0, display "No wait" (handle in UI)
   - weatherHint: return null for now (weather integration is Week 3)
   - Cache: add Next.js revalidate of 30 seconds
   - No rate limiting yet (that's Week 4)

3. REACT QUERY SETUP
   - Create lib/api/client.ts following TDD §6.3
   - Create hooks/useCurrentPark.ts following TDD §6.4
   - Wrap app/layout.tsx with QueryClientProvider

4. HOME SCREEN (read-only, no submit yet)
   Replace app/page.tsx with the real home screen.
   Follow the design system exactly:
   - Background: bg-brand-bg (#EAE5DB)
   - Font: font-serif for display headings, font-sans for body
   - All colors from the brand.* Tailwind tokens

   Layout (top to bottom):
   a) HEADER
      - Small-caps sans: "RAMSDEN PARK"
      - Large serif display: "Tennis Courts"
      - Sun glyph icon top-right (use lucide-react Sunrise icon)

   b) SUN STATUS STRIP
      Use lib/sun.ts to compute sunrise/sunset for today.
      Three states:
      - Daytime: "Sunrise {time} · Sunset {time}"
      - Pre-sunset (≤30 min): "Sunset in {N} minutes" in amber
      - Post-sunset: "Courts likely closed — sunset was at {time}"
      Apply sunset hue to the page background via a data-sun-state
      attribute on the body, with CSS transitions:
        [data-sun-state="day"]         → bg: #EAE5DB
        [data-sun-state="pre-sunset"]  → bg: warm amber tint
        [data-sun-state="post-sunset"] → bg: gradient #2a1b4f → #1a1530

   c) COURT MAP
      The defining visual element. Top-down schematic of all 8 courts.
      - West cluster (left): Courts 1-2 (Board A, top row),
        Courts 3-4 (Board B, bottom row)
      - Walking path divider: dashed vertical line in the middle
      - East cluster (right): Courts 5-6 (Board C, top row),
        Courts 7-8 (Board C, bottom row)
      Each court tile:
      - Rounded corners (radius-court = 12px)
      - Court number in large serif
      - Background color based on the BOARD's status:
          FREE (waitMinutes = 0):        #7C8B70 (brand-sage)
          MODERATE (1-40 min):           #D49A4C (brand-amber)
          LONG WAIT (>40 min):           #BC5F48 (brand-terracotta)
          STALE (isStale = true):        #A8A49C (brand-gray)
          NO DATA (queueCount = null):   #EAE5DB with border (cream/sand)
          POST-SUNSET (after sunset):    #4A5D70 (brand-dusk)
      ALL courts on the same board share the same status color.
      This is critical — do not compute per-court status.
      Tapping a court tile navigates to /update?board={boardId}
      (the update page doesn't exist yet — just wire the navigation,
      it'll show a 404 for now which is fine)
      Each tile must have aria-label:
      "Court {N}, {boardLabel}, {statusText}"

   d) CONDENSED LEGEND (below the map)
      Three lines, one per board:
      "Board A (1-2)    4 rackets · >40 min"
      "Board B (3-4)    2 rackets · ~25 min"
      "Board C (5-8)    0 rackets · No wait"
      If no data: "Board A (1-2)    No data yet"
      If stale:   "Board A (1-2)    Last update 3h ago"
      Bold board name, regular weight details, right-aligned stats.

   e) THREE BOARD SUMMARY CARDS (below the legend)
      One card per board, stacked vertically.
      Board A → bg-brand-terracotta
      Board B → bg-brand-amber
      Board C → bg-brand-sage
      Each card contains:
      - Top row: status pill left ("ACTIVE"/"STALE"/"FREE"/"CLOSED"),
        courts pill right ("COURTS 1–2")
      - Big serif board name: "Board A"
      - Queue line: "4 rackets · >40 min, typically 45–60"
        Or if no data: "No data yet"
        Or if queue=0: "No wait — courts likely open"
      - Divider line
      - "Updated 4 min ago · 3 confirmed" (or "No recent reports")
      - Bottom row: condition badge left (Dry/Wet/Unknown),
        "Update +" button right (dark charcoal pill)
      Post-sunset: cards show "CLOSED" pill, reduced opacity on stats

   f) STICKY PRIMARY CTA
      Fixed to bottom of viewport.
      Full-width dark charcoal pill: "I'm at the court — update +"
      Add padding-bottom to the scroll area equal to CTA height + 16px
      so cards aren't hidden behind it.
      Clicking navigates to /update (404 for now, fine)

   g) SECONDARY LINK
      "View busy times" — above the sticky CTA, centered, underlined
      Clicking navigates to /busy-times (404 for now, fine)

5. EMPTY STATE
   When all boards return queueCount = null (no data):
   - Court tiles render cream/sand with subtle border (not gray)
   - Board cards show "Be the first to update" serif heading
   - Body copy: "No reports yet today. Tap a court to share what
     you see."
   - Legend shows "No data yet" for all three boards

6. POLLING
   useCurrentPark hook polls every 60 seconds and refetches on
   window focus. Pause polling when on /update route (check pathname).

================================================================================
WHAT NOT TO BUILD THIS WEEK
================================================================================
- The /update page (Week 4)
- The /busy-times page (Week 4-5)
- Photo upload (Week 5)
- Weather hint (Week 3)
- Rate limiting (Week 4)
- The after-sunset modal (Week 4)
- Sentry error tracking (Week 5-6)
- Any form of authentication

================================================================================
CODE STANDARDS
================================================================================
- TypeScript strict mode — no `any`, no implicit types
- All shared types from lib/api/types.ts — never inline type the API
  response shape in a component
- Tailwind only for styling — no inline styles, no CSS modules
- All colors from brand.* tokens — no hardcoded hex values in components
- Components go in components/ — page.tsx should be thin, delegating
  to components
- Server components by default; add 'use client' only when needed
  (polling hook requires client, court map tile tap requires client)
- lucide-react for all icons

================================================================================
FILE STRUCTURE FOR THIS WEEK
================================================================================
lib/
  api/
    types.ts
    client.ts
  db/
    client.ts
  sun.ts
hooks/
  useCurrentPark.ts
components/
  CourtMap.tsx
  CourtTile.tsx
  BoardCard.tsx
  SunStatusStrip.tsx
  StickyUpdateCTA.tsx
app/
  layout.tsx          (update: add QueryClientProvider)
  page.tsx            (replace: real home screen)
  api/
    park/
      current/
        route.ts

================================================================================
COMMIT DISCIPLINE — THIS IS MANDATORY
================================================================================
You must commit frequently. Target 5–15 commits for this week's work.
Never batch more than one logical unit into a single commit.

COMMIT AFTER EVERY ONE OF THESE:
- Each new file created (even if incomplete)
- Each function that works and is tested
- Each API endpoint that returns correct data
- Each component that renders correctly in isolation
- Each bug fixed
- Each type definition completed
- Any refactor, even small ones

COMMIT MESSAGE FORMAT (follow this exactly):
  feat: add {thing}         — new functionality
  fix: {what was broken}    — bug fix
  chore: {setup/config}     — config, deps, tooling
  refactor: {what changed}  — restructure without behavior change
  test: add tests for {X}   — test files
  docs: update {what}       — documentation only

EXAMPLES OF GOOD COMMITS FOR THIS WEEK:
  feat: add shared TypeScript types (lib/api/types.ts)
  feat: add Supabase server client (lib/db/client.ts)
  feat: add suncalc sun window helper (lib/sun.ts)
  feat: add GET /api/park/current endpoint
  fix: median calculation returns null when no reports
  feat: add React Query client and QueryClientProvider
  feat: add useCurrentPark polling hook
  feat: add CourtTile component with status color logic
  feat: add CourtMap component with west/east cluster layout
  feat: add SunStatusStrip with 3 states
  feat: add BoardCard component with all states
  feat: add StickyUpdateCTA component
  feat: assemble home screen page.tsx
  fix: sticky CTA overlapping board cards, add bottom padding
  feat: add empty state for no-data condition

AFTER EVERY COMMIT, RUN:
  git push origin main

Do not wait until the end of a session to commit and push.
Each commit should be a working, non-broken state of the code.
If something is half-done and broken, stash it — don't commit broken code.

================================================================================
BEFORE YOU START CODING
================================================================================
1. Read PRD.md and TECH_DESIGN.md fully
2. Ask me any clarifying questions you have
3. Tell me the order you plan to build these pieces
4. Confirm you understand the commit discipline above
5. Then start with lib/api/types.ts and work outward from there

Do not write any component code until the types and API route are done
and verified. Build inside-out: types → DB client → API route → hooks →
components → page assembly.
```
