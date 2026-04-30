# CourtCheck — Claude Code Kickoff Prompt (Week 3)

> Add this file to docs/ in your repo.
> Start Claude Code with:
> "Read docs/CLAUDE_CODE_WEEK3_KICKOFF.md, docs/PRD.md, and 
>  docs/TECH_DESIGN.md. Ask clarifying questions, confirm the 
>  commit discipline, then tell me your build order before 
>  writing any code."

---

## Paste this into Claude Code:

```
We are continuing to build CourtCheck. Week 2 is complete and 
tagged (v0.2-week2). The read-only home screen works with all 
5 states verified.

Read docs/PRD.md and docs/TECH_DESIGN.md before starting.
This week adds three things: the busy-times endpoint, the 
busy-times screen, and the weather hint.

================================================================================
PROJECT STATE (what exists)
================================================================================
- Home screen complete with all 5 states (day/empty/stale/pre-sunset/post-sunset)
- GET /api/park/current working with median queue, wait formula, staleness
- useCurrentPark polling hook (60s, paused on /update)
- All shared types in lib/api/types.ts
- Supabase clients in lib/db/client.ts
- suncalc wrapper in lib/sun.ts
- Design tokens in tailwind.config.ts

================================================================================
WEEK 3 SCOPE — BUILD EXACTLY THIS, NOTHING MORE
================================================================================

────────────────────────────────────────────────────────────────────────────────
1. GET /api/park/busy-times
────────────────────────────────────────────────────────────────────────────────

File: app/api/park/busy-times/route.ts

Query params:
- boardId: string (e.g. "ramsden-a")
- day: string (e.g. "monday")

Logic:
- day maps to day_of_week integer (0=sunday, 1=monday ... 6=saturday)
- Query busy_times_hourly table for matching board_id + day_of_week
- If no rows exist (table is empty — it will be until the cron runs):
  fall back to querying raw reports table directly:
  SELECT 
    EXTRACT(HOUR FROM created_at AT TIME ZONE 'America/Toronto') as hour,
    AVG(queue_count) as avg_queue,
    COUNT(*) as sample_size
  FROM reports
  WHERE board_id = $boardId
    AND EXTRACT(DOW FROM created_at AT TIME ZONE 'America/Toronto') = $dow
    AND created_at > NOW() - INTERVAL '7 days'
  GROUP BY hour
  ORDER BY hour
- Return hourly array even if empty (empty array = no data yet, not an error)
- Also return sunriseHour and sunsetHour for today (integer hours, 
  computed server-side using suncalc for Ramsden coords)
  These are used by the chart to clip the x-axis to daylight hours.
- Cache: Cache-Control: public, s-maxage=3600, stale-while-revalidate=7200

Response shape (add to lib/api/types.ts):
{
  boardId: string
  day: string
  hourly: Array<{ hour: number; avgQueue: number; sampleSize: number }>
  sunriseHour: number
  sunsetHour: number
  computedAt: string
}

Validation:
- boardId must be one of: ramsden-a, ramsden-b, ramsden-c
- day must be one of: monday, tuesday, wednesday, thursday, 
  friday, saturday, sunday
- Return 400 with { error: { code: 'validation_failed', message } } 
  if either is invalid

────────────────────────────────────────────────────────────────────────────────
2. useBusyTimes hook
────────────────────────────────────────────────────────────────────────────────

File: hooks/useBusyTimes.ts

- Calls GET /api/park/busy-times?boardId=X&day=Y
- No polling (historical data, no need to refetch)
- staleTime: 60 * 60 * 1000 (1 hour, matches cache TTL)
- Add getBusyTimes to lib/api/client.ts

────────────────────────────────────────────────────────────────────────────────
3. /busy-times page
────────────────────────────────────────────────────────────────────────────────

File: app/busy-times/page.tsx
Components needed:
- components/BoardSelector.tsx
- components/DaySelector.tsx  
- components/BusyTimesChart.tsx

LAYOUT (top to bottom):
a) HEADER
   - "< BACK" link top-left (navigates to /)
   - Small-caps eyebrow: "HISTORICAL"
   - Large serif display: "Busy Times"

b) BOARD SELECTOR
   Three pill chips: A / B / C
   Default selected: A
   Selected state: filled with that board's brand color
     A selected → bg-brand-terracotta, cream text
     B selected → bg-brand-amber, cream text  
     C selected → bg-brand-sage, cream text
   Unselected: outlined, brand-text color

c) DAY SELECTOR
   Seven pill chips: Mo Tu We Th Fr Sa Su
   Default selected: current day of week
   Selected state: filled bg-brand-text (charcoal), cream text
   Unselected: outlined

d) CHART (Recharts)
   Use BarChart from recharts.
   Data: hourly array from the API
   X-axis: hours from sunriseHour to sunsetHour only
     Format hours as "6 AM", "12 PM", "6 PM" etc.
     Show only hours within the daylight window — clip anything 
     outside sunrise/sunset. Add a note below:
     "Courts unlit — daylight hours only"
   Y-axis: hidden (bar length is self-explanatory)
   Bars: 
     Color = selected board's brand color
     (terracotta for A, amber for B, sage for C)
     Rounded top corners on bars (radius={[4,4,0,0]})
   Label top-right above chart: "QUEUE SIZE" in small-caps sans
   
   EMPTY STATE (no data / empty hourly array):
     Don't render the chart.
     Show instead: 
       serif heading "No data yet"
       sans body "Reports will appear here after the first 
       week of use."
   
   SAMPLE SIZE NOTE below chart:
     "Based on {N} reports over the last 7 days."
     "Courts unlit — daylight hours only."
     Small sans, muted color.
     If N = 0: show "No reports yet — be the first to update!"

e) NO POLLING
   This page does not poll. User taps back to get fresh data.

────────────────────────────────────────────────────────────────────────────────
4. WEATHER HINT
────────────────────────────────────────────────────────────────────────────────

File: lib/weather.ts (server-side only, never imported in client components)

Use Open-Meteo API (free, no key required):
GET https://api.open-meteo.com/v1/forecast
  ?latitude=43.6772
  &longitude=-79.3919
  &current=precipitation,rain
  &hourly=precipitation
  &past_hours=6
  &forecast_hours=0
  &timezone=America%2FToronto

Parse the response to produce a WeatherSnapshot:
- currentlyRaining: boolean (current.precipitation > 0)
- lastRainMinutesAgo: number | null
  Find the most recent hour in hourly.precipitation where 
  precipitation > 0. Compute how many minutes ago that was.
  If no rain in the last 6 hours: null
- summary: string
  "Currently raining — courts likely wet"         (if currentlyRaining)
  "Last rain ~{N} min ago — possibly still wet"   (if lastRainMinutesAgo <= 120)
  "Last rain ~{N}h ago — likely dry by now"       (if lastRainMinutesAgo > 120)
  ""                                               (if no rain at all)

Cache: in-memory cache with 15-minute TTL (see TECH_DESIGN.md §7.2).
Fail silently: if Open-Meteo is down or returns an error, 
return null. Never throw, never block the parent request.

Add WeatherSnapshot type to lib/api/types.ts.

INTEGRATE INTO /api/park/current:
- After computing board states, check if ANY board has 
  isStale=true OR queueCount=null
- If yes: call getWeatherSnapshot(43.6772, -79.3919)
- If no: skip (don't waste the weather call when data is fresh)
- Return weatherHint in the response (currently returns null)

UPDATE BoardCard.tsx:
- Accept an optional weatherHint prop (WeatherSnapshot | null)
- Show the weatherHint.summary as a soft italic line below the 
  condition badge, ONLY when:
  (a) weatherHint is not null AND
  (b) weatherHint.summary is not empty AND
  (c) the board's courtCondition is 'unknown' OR the board 
      has no recent data (queueCount=null or isStale=true)
- Style: small italic sans, muted color (brand-muted #7A766F)
- Example: "Last rain ~45 min ago — possibly still wet"
- User-reported condition always takes visual priority over 
  the weather hint. If courtCondition is 'dry' or 'wet' 
  (actively reported), don't show the hint.

================================================================================
WHAT NOT TO BUILD THIS WEEK
================================================================================
- The /update page (Week 4)
- Photo upload (Week 5)
- Rate limiting (Week 4)
- The after-sunset modal (Week 4)
- Cron jobs (Week 5)
- Sentry / analytics (Week 6)

================================================================================
COMMIT DISCIPLINE — SAME AS LAST WEEK, MANDATORY
================================================================================
Target: 8–12 commits this week.
Commit after every logical unit. Push after every commit.

Expected commits this week:
  feat: add BusyTimesResponse type to lib/api/types.ts
  feat: add WeatherSnapshot type to lib/api/types.ts
  feat: add GET /api/park/busy-times endpoint
  feat: add getBusyTimes to api client and useBusyTimes hook
  feat: add BoardSelector component
  feat: add DaySelector component
  feat: add BusyTimesChart component with empty state
  feat: add /busy-times page
  feat: add Open-Meteo weather snapshot service (lib/weather.ts)
  feat: integrate weather hint into GET /api/park/current
  feat: render weather hint on BoardCard when stale or no data
  fix: (any bug fixes that come up)

================================================================================
BUILD ORDER
================================================================================
1. Add new types to lib/api/types.ts
2. app/api/park/busy-times/route.ts
3. lib/api/client.ts + hooks/useBusyTimes.ts
4. components/BoardSelector.tsx
5. components/DaySelector.tsx
6. components/BusyTimesChart.tsx
7. app/busy-times/page.tsx
8. lib/weather.ts
9. Integrate weather into /api/park/current route
10. Update BoardCard.tsx to render hint

Do not touch the home screen or existing components until 
steps 1–7 are done and the busy-times page is working.
Weather integration (steps 8–10) comes last because it 
touches existing working code — do it carefully.

================================================================================
BEFORE YOU START
================================================================================
1. Read PRD.md §8 (F5 weather hint, F8 busy times) and 
   TECH_DESIGN.md §5.2, §7.2 fully
2. Ask clarifying questions
3. Confirm commit discipline
4. Confirm build order
5. Start with lib/api/types.ts additions
```
