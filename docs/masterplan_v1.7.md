**SPIELTAG**

Master Plan — Product Requirements Document

*Version 1.7 — Last Updated: February 2026*

# **30-Second Elevator Pitch**

Spieltag is a Bundesliga yield terminal.

It transforms fantasy squad management into a performance-driven capital allocation engine. Managers deploy capital, measure rolling yield, reallocate decisively, and maximize weekly Top 11 output — automatically.

No noise. No leagues. No fluff. Just conviction and yield clarity.

# **Problem & Mission**

## **Problem**

Fantasy platforms:

* Emphasize entertainment over optimization

* Hide capital efficiency behind gamification

* Require manual formation logic

* Reward activity over discipline

Elite managers need:

* Clear yield visibility

* Deterministic lineup optimization

* Fast reallocation decisions

* Performance-first UI

## **Mission**

Build a quant-style Bundesliga command center that:

* Surfaces rolling yield instantly

* Auto-optimizes Top 11

* Exposes poor leverage visibly

* Reduces decision friction to near-zero

If a feature does not improve yield clarity, it does not ship.

# **Target Audience**

## **Primary**

* Analytical fantasy managers

* Finance-minded sports optimizers

* Users who think in ROI, not vibes

## **Secondary (Phase 2+)**

* Data-driven Bundesliga fans

* Quant-curious operators

This is not for casual players.

# **Core Features**

## **1\. Holdings Dashboard (Default View)**

* Squad overview with yield-first metrics

* Hard-enforced roster constraints:

  * 2 GK, 5 DEF, 5 MID, 3 FWD — 15 players total

  * Max 3 players per Bundesliga club

  * 5 transfers per matchday

* Auto Top 11 calculation — no formation selection required

* Star Leverage toggle per sector (DEF / MID / FWD)

## **2\. Star Player (Leverage) — RESOLVED SPEC**

**✅ RESOLVED — Gap \#1**

*⚠️  CORRECTION: Any screenshot showing x1.5 badge on ALL players in a sector is incorrect. Only ONE designated star player per sector receives the multiplier. Lovable must NOT use those screenshots as reference.*

### **Mechanic**

* Manager designates exactly ONE star player per sector: one DEF star, one MID star, one FWD star

* The star player earns 1.5x their individual matchday points total

* All three sectors (DEF, MID, FWD) can have a star active simultaneously

* GK is ineligible for star designation

### **Assignment Rules**

* Manager manually selects the star from within their squad players at that position

* Only one star per sector — selecting a new star auto-deselects the previous

* Star designation persists across matchdays until manually changed

* The sector LEVERAGE toggle is the on/off switch for that sector's star

* A star icon on each player row allows designation within that sector

### **Top 11 Interaction**

* If designated star IS in Top 11: points multiplied by 1.5x before total is summed

* If designated star is NOT in Top 11: multiplier lost entirely — does not transfer

* This condition triggers a WASTED LEVERAGE warning

### **WASTED LEVERAGE — Trigger & Display**

* Trigger condition: starPlayer.isInTop11 \=== false

* Warning copy: "WASTED LEVERAGE — \[Player Name\] failed Top 11 projection."

* Displayed as red label (\#D3010C) inline under the relevant sector header

* No auto-reassignment — manager must manually correct

### **Schema Fields Required**

* SquadPlayer.is\_star: boolean

* Squad.leverage\_def\_active: boolean

* Squad.leverage\_mid\_active: boolean

* Squad.leverage\_fwd\_active: boolean

* All leverage state persisted in Supabase — NOT local or session state

## **3\. Always-On Top 11 Engine — RESOLVED SPEC**

**✅ RESOLVED — Gap \#2**

*⚠️  DESIGN OVERRIDE: Spieltag intentionally departs from the official game's formation selection UI. The engine auto-selects the optimal formation with zero manager input. This is a core product differentiator.*

### **Engine Overview**

* Runs on every trigger: transfer confirmed, star designation changed, leverage toggle changed

* Evaluates ALL 6 legal formations — selects the one producing the highest total points

* No formation UI exposed to manager — formation is internal output only

* Result is always deterministic given the same squad state

### **Legal Formations**

All 6 formations must be evaluated on every engine run:

| Formation | DEF | MID | FWD | When It Wins |
| :---: | :---: | :---: | :---: | ----- |
| 4-4-2 | 4 | 4 | 2 | Most balanced — default fallback |
| 4-3-3 | 4 | 3 | 3 | Attack-heavy — good FWD week |
| 3-5-2 | 3 | 5 | 2 | Mid-heavy — Bundesliga default |
| 3-4-3 | 3 | 4 | 3 | All-out attack |
| 4-5-1 | 4 | 5 | 1 | Mid-dominant — 1 FWD banked |
| 5-3-2 | 5 | 3 | 2 | Defensive — clean sheet bonus week |

Formation notation is DEF-MID-FWD. GK is always 1 and excluded from notation.

### **Selection Algorithm**

**Step 1 — GK Selection**

* Compare both GKs by matchday points — select higher scorer

* Tiebreaker: higher rolling yield wins

**Step 2 — Outfield Selection per Position**

* Sort all players at each position by points descending, select top N per formation

* Tiebreaker at the cut line: higher rolling yield wins

**Step 3 — Apply Star Multiplier**

* Per sector: if leverage toggle is active AND designated star is in XI → multiply that player's points by 1.5x

* If star not in XI: multiplier lost, flag WASTED LEVERAGE for that sector

**Step 4 — Sum Formation Total**

* Sum all 11 players' points (with multipliers applied)

* Store: { formation, top11Players, benchPlayers, totalPoints, leverageStatus\[\] }

**Step 5 — Select Optimal Formation**

* Pick formation with highest totalPoints

* Formation tiebreaker: prefer more DEF (conservative default)

### **Pseudocode Reference**

`function computeTop11(squad, starDesignations, leverageToggles) {`

  `const formations = [`

    `{ name: '4-4-2', def: 4, mid: 4, fwd: 2 },`

    `{ name: '4-3-3', def: 4, mid: 3, fwd: 3 },`

    `{ name: '3-5-2', def: 3, mid: 5, fwd: 2 },`

    `{ name: '3-4-3', def: 3, mid: 4, fwd: 3 },`

    `{ name: '4-5-1', def: 4, mid: 5, fwd: 1 },`

    `{ name: '5-3-2', def: 5, mid: 3, fwd: 2 },`

  `];`

  `const results = formations.map(f => {`

    `const gk  = selectTop(squad.GK,  1, 'points', 'rollingYield');`

    `const def = selectTop(squad.DEF, f.def, 'points', 'rollingYield');`

    `const mid = selectTop(squad.MID, f.mid, 'points', 'rollingYield');`

    `const fwd = selectTop(squad.FWD, f.fwd, 'points', 'rollingYield');`

    `const xi  = [...gk, ...def, ...mid, ...fwd];`

    `const total = calcTotal(xi, starDesignations, leverageToggles);`

    `const leverage = checkLeverage(xi, starDesignations, leverageToggles);`

    `return { formation: f.name, xi, total, leverage };`

  `});`

  `return results.sort((a, b) => {`

    `if (b.total !== a.total) return b.total - a.total;`

    `return formationDefCount(b) - formationDefCount(a);`

  `})[0];`

`}`

### **Edge Cases — Handled**

* New player \< 5 matchdays: rolling yield computed on available matchdays only. If 0 matchdays, rollingYield \= 0

* Division by zero guard: if player price is 0 (data error), rollingYield \= 0, data integrity warning logged

* No star designated: leverage for that sector ignored silently — no WASTED LEVERAGE fires

* 5-DEF formation constraint: if 5-3-2 produces fewer total points, a different formation wins automatically

* All players in a position scored 0: valid XI still selected — 0-point players fill positions

## **4\. Benchmark Yield & Value Signal System — RESOLVED SPEC**

**✅ RESOLVED — Gap \#3**

*📐  Design rationale: Asymmetric thresholds enforce the design guideline of green dominance and red as a rare punishment state. Median over all players prevents Bundesliga outliers (e.g. Grimaldo at 2.08 yield) from skewing the benchmark the way a mean would.*

### **Benchmark Definition**

* Population: ALL players in the database at that position (GK / DEF / MID / FWD)

* Statistic: MEDIAN rolling yield per position group

* Recalculated: on every matchday data update — not real-time per request

* Stored as: benchmarkYield\_GK, benchmarkYield\_DEF, benchmarkYield\_MID, benchmarkYield\_FWD

Why median over mean: Bundesliga has extreme yield outliers (Grimaldo 2.08, Wirtz 1.95). Mean would be pulled upward, making most players appear undervalued. Median reflects the typical player and is stable week to week.

### **Value Signal Thresholds — Asymmetric Band**

The Fair band is intentionally asymmetric. Green fires earlier (+20%) than red (-25%). This enforces green dominance in the UI while keeping red rare and serious.

| Signal | Threshold Condition |
| :---- | :---- |
| **🟢  Undervalued** | `playerYield > benchmarkYield × 1.20` |
| **⚪  Fair** | `playerYield between benchmarkYield × 0.75 and × 1.20` |
| **🔴  Overvalued** | `playerYield < benchmarkYield × 0.75` |

### **Pseudocode Reference**

`function getValueSignal(playerYield, position, benchmarks) {`

  `const benchmark = benchmarks[position]; // pre-computed median`

  `if (playerYield > benchmark * 1.20) return 'UNDERVALUED'; // green`

  `if (playerYield < benchmark * 0.75) return 'OVERVALUED';  // red`

  `return 'FAIR';                                             // neutral`

`}`

### **UI Display Rules**

* Signal badge appears on every player row in Holdings and Market terminal

* Undervalued: green dot \+ label 'Undervalued' — color \#15803D

* Fair: neutral grey dot — no label text, color \#9CA3AF

* Overvalued: red dot \+ label 'Overvalued' — color \#D3010C

* Signal never appears without its paired dot — color alone is never the only indicator (WCAG AA compliance)

* KPI band shows Yield vs Benchmark as a % delta (e.g. \+14%) — uses same benchmark per the manager's squad composition

### **Benchmark Recalculation Rules**

* Benchmark is NOT recalculated in real time on every page load — this would cause signal instability

* Benchmark IS recalculated once per matchday, after all matchday stats are ingested

* Between matchday updates, benchmark values are static — signals are stable within a matchday cycle

* Benchmark values stored in a dedicated Config or BenchmarkSnapshot table in Supabase

### **Schema Addition Required**

* BenchmarkSnapshot table: { matchday, position, median\_yield, updated\_at }

* One row per position per matchday — 4 rows inserted per matchday update cycle

* Market terminal and Holdings both read from this table, never compute benchmark on the fly

## **5\. Squad Club Limit Rule — RESOLVED SPEC**

**✅ RESOLVED — Gap \#4**

*📐  The 3-per-club rule is a SQUAD composition constraint enforced at transfer time — not a Top 11 lineup constraint. All 3 players from one club in a squad can legally appear in the Top 11 simultaneously.*

### **Rule Definition**

* A manager may hold a maximum of 3 players from any single Bundesliga club across their full 15-man squad

* This constraint applies to the squad of 15 — not to the Top 11 output

* The Top 11 engine applies no club-based filtering — selects purely on points and rolling yield

### **Enforcement Point**

* Rule is enforced at transfer time — when an incoming player is added to the squad

* Enforced in both live transfers (Holdings) and simulated transfers (Sandbox)

* If the rule would be breached, the transfer is blocked before confirmation

### **Validator Logic**

`function validateClubLimit(incomingPlayer, currentSquad, outgoingPlayer) {`

  `const squadAfterRemoval = currentSquad.filter(p => p.id !== outgoingPlayer.id);`

  `const clubCount = squadAfterRemoval.filter(p => p.team === incomingPlayer.team).length;`

  `if (clubCount >= 3) {`

    `return { blocked: true, reason: 'Rule Breach: Max 3 players per club (' + incomingPlayer.team + ').' };`

  `}`

  `return { blocked: false };`

`}`

### **Critical Edge Case — Same-Club Swap**

* Scenario: Manager has 3 players from one club and wants to swap one for another player from that same club

* Correct: outgoing player removed from count BEFORE evaluating incoming player — post-removal count is 2, transfer ALLOWED

* Incorrect: evaluating count before removal gives 3 — transfer incorrectly blocked

* Validator must always receive both incomingPlayer AND outgoingPlayer — never evaluate club count in isolation

### **UI Error Message**

* Blocked transfer copy: "Rule Breach: Max 3 players per club (\[Club Name\])."

* Displayed inline at transfer confirmation — not as a modal

* Sandbox mode: shows same copy as a simulation warning — does not block the simulation

## **6\. Transfer Limit Persistence — RESOLVED SPEC**

**✅ RESOLVED — Gap \#5**

*📐  Transfer count is a database query against TransferLog — never a local or session state variable. Refreshing the browser cannot reset the count. The 5-transfer cap is enforced server-side on every transfer attempt.*

### **Core Rule**

* A manager may make a maximum of 5 transfers between matchdays

* This limit is enforced server-side via the TransferLog table — not in local or session state

* The count persists across browser refreshes, tab closes, and re-logins

* Transfers Remaining displayed in KPI band \= 5 minus TransferLog count for current matchday

### **Transfer Count Query**

`function getTransfersRemaining(squadId, currentMatchday, isBreakPeriod) {`

  `if (isBreakPeriod) return Infinity; // unlimited during breaks`

  `const used = TransferLog`

    `.filter(r => r.squad_id === squadId && r.matchday === currentMatchday)`

    `.count();`

  `return Math.max(0, 5 - used);`

`}`

### **Transfer Execution Flow**

* Step 1: Call getTransfersRemaining() — if 0 and not a break period, block transfer immediately

* Step 2: Run squad composition validator (position counts)

* Step 3: Run club limit validator (max 3 per club, outgoing removed first)

* Step 4: If all checks pass — execute transfer, insert row into TransferLog, recalculate Top 11

* Step 5: KPI band updates Transfers Remaining instantly from new count

### **TransferLog Schema — Confirmed**

* id: uuid

* squad\_id: references Squad.id

* matchday: integer — the matchday during which this transfer was made

* player\_out\_id: references Player.id

* player\_in\_id: references Player.id

* created\_at: timestamp

* Row Level Security: scoped to auth.uid() via squad\_id — managers can only read and write their own transfer logs

### **Blocked Transfer UI**

* Copy: "Transfer Limit Reached. 0 transfers remaining this matchday."

* Displayed inline — transfer button disabled, not hidden

* KPI band continues to show 0/5 — always visible, never hidden when limit is hit

### **Break Period Handling**

* During official break periods, transfer cap is lifted — unlimited transfers allowed

* isBreakPeriod determined by a MatchdayConfig table entry — not hardcoded dates

* When isBreakPeriod is true: KPI band shows transfers as unlimited (display: —/∞ or simply hide the counter)

* TransferLog rows still inserted during breaks — for audit trail and history

### **MatchdayConfig Table — New Schema Addition**

* id, matchday, deadline: timestamp, is\_break\_period: boolean, is\_locked: boolean

* is\_locked: true after matchday deadline — no transfers or changes permitted

* is\_break\_period: true during international breaks and winter break — unlimited transfers

* Admin-managed — updated before each matchday, not auto-calculated from dates

### **MVP Scope Boundary — Transfer Cancellation**

* Transfer cancellation (undoing a transfer before matchday deadline) is NOT in MVP scope

* Lovable must NOT build a cancel/undo transfer flow in MVP

* TransferLog rows are immutable in MVP — once inserted, they stand

* Transfer cancellation is a V1 feature — will require soft-delete pattern on TransferLog

### **Sandbox Isolation**

* Sandbox simulations do NOT write to TransferLog — they are session-only state

* Sandbox has its own internal transfer counter (max 5 simulations) held in React state

* Sandbox counter resets on page refresh — this is intentional and correct

* Sandbox transfers never affect the live squad's TransferLog count

## **7\. Price History & Chart Data — RESOLVED SPEC**

**✅ RESOLVED — Gap \#6**

*📐  10-matchday window selected for price trend — wide enough to show genuine appreciation/depreciation trends, tight enough to stay relevant to current transfer decisions. Full-season charts become visually noisy and analytically stale as the season progresses.*

### **Chart 1 — Price Trend (Market Terminal)**

* Data source: PriceHistory table

* Window: Last 10 matchdays of price data per player

* X-axis: Matchday number (e.g. MD15 → MD24)

* Y-axis: Price in millions (e.g. 18.2M → 21.0M)

* Chart type: Single clean line — no fill, no gridlines, minimal axis labels

* Color: \#111111 default line — green (\#15803D) if net price change is positive over window, red (\#D3010C) if negative

* Below chart: numeric summary — 'Price: €21.0M (+€2.8M over 10 matchdays)'

* If fewer than 10 matchdays of data exist (early season or new player): render available data only, no padding or zero-fill

### **Chart 2 — Performance Trend (Market Terminal)**

* Data source: MatchdayStats table

* Window: Last 5 matchdays of points data per player — mirrors rolling yield window

* X-axis: Matchday number

* Y-axis: Points scored that matchday

* Chart type: Single clean line — no fill, no gridlines, minimal axis labels

* Color: \#111111 static — no conditional coloring on performance chart

* Below chart: numeric summary — 'Last 5: 41 pts | Rolling Yield: 1.95'

* If fewer than 5 matchdays played: render available data, display actual matchday count — e.g. 'Last 3: 28 pts'

### **Chart Display Rules — Both Charts**

* No gridlines — ever

* No chart title — the section header above the chart serves as the label

* Minimal axes: x-axis shows first and last matchday label only, y-axis shows min and max value only

* No tooltips on hover in MVP — numeric summaries below chart replace tooltip functionality

* No animation on load — charts render instantly, no transition effects

* Charts are read-only — no interactive zoom, pan, or scrubbing in MVP

* Both charts stacked vertically in the player detail panel: Price Trend above, Performance Trend below

### **PriceHistory Query Shape**

`// Fetch last 10 price entries for a player, ordered chronologically`

`const priceHistory = await supabase`

  `.from('price_history')`

  `.select('matchday, price')`

  `.eq('player_id', playerId)`

  `.order('matchday', { ascending: true })`

  `.limit(10);`

### **MatchdayStats Query Shape**

`// Fetch last 5 matchday point entries for a player, ordered chronologically`

`const performanceHistory = await supabase`

  `.from('matchday_stats')`

  `.select('matchday, points')`

  `.eq('player_id', playerId)`

  `.order('matchday', { ascending: true })`

  `.limit(5);`

### **PriceHistory Schema — Confirmed**

* id: uuid

* player\_id: references Player.id

* matchday: integer

* price: decimal — price in millions at end of that matchday

* One row inserted per player per matchday, after matchday data update cycle completes

* Index on (player\_id, matchday) — required for query performance at scale

### **Chart Library Specification**

* Library: Recharts (React-native, composable, Tailwind-compatible)

* Component: LineChart with Line, XAxis, YAxis — no CartesianGrid, no Tooltip, no Legend

* Stroke width: 1.5px — clean, not heavy

* Dot: false — no point markers on the line

* ResponsiveContainer: width 100%, height 120px per chart

* This is the authoritative chart library choice — Lovable must not substitute another library

### **Recharts Implementation Reference**

`import { LineChart, Line, XAxis, YAxis, ResponsiveContainer } from 'recharts';`

`<ResponsiveContainer width='100%' height={120}>`

  `<LineChart data={priceHistory}>`

    `<XAxis dataKey='matchday' tick={{ fontSize: 11 }}`

           `tickLine={false} axisLine={false}`

           `ticks={[firstMatchday, lastMatchday]} />`

    `<YAxis tick={{ fontSize: 11 }} tickLine={false}`

           `axisLine={false} width={32}`

           `domain={['auto', 'auto']} />`

    `<Line type='monotone' dataKey='price'`

          `stroke={trendColor} strokeWidth={1.5}`

          `dot={false} />`

  `</LineChart>`

`</ResponsiveContainer>`

## **8\. Data Ingestion Strategy — RESOLVED SPEC**

**✅ RESOLVED — Gap \#8**

*📐  n8n selected as the ingestion layer — no-code, API-native, Supabase-integrated. Weekly manual trigger after each matchday. BenchmarkSnapshot recalculation runs automatically as the final step in the same workflow.*

### **Ingestion Tool — n8n**

* Tool: n8n (no-code workflow automation — https://n8n.io)

* Hosting: n8n Cloud tier (approx $20/month) or self-hosted free tier

* Trigger: Manual one-click trigger after matchday data is confirmed settled

* Optional: Schedule trigger — Sunday midnight or Monday 6AM to run automatically

* Lovable does NOT build the data pipeline — n8n is an external tool entirely outside the Lovable project scope

### **Weekly Matchday Update Workflow**

This workflow runs once per matchday after all match results are confirmed:

`Step 1 — HTTP Request: Fetch matchday stats from API`

         `(player points, matchday number, position, club)`

`Step 2 — Transform: Map API response fields to Supabase schema`

         `(normalize position enums, convert player IDs, format prices)`

`Step 3 — Supabase Upsert: Insert rows into matchday_stats`

         `(player_id, matchday, points)`

`Step 4 — Supabase Upsert: Insert rows into price_history`

         `(player_id, matchday, price)`

`Step 5 — Supabase Update: Update Player.price and Player.last_5_points`

         `(current market price and rolling 5-matchday point total)`

`Step 6 — Supabase Edge Function: Recalculate BenchmarkSnapshot`

         `(median yield per position — inserts 4 new rows into BenchmarkSnapshot)`

`Step 7 — Notification: Send confirmation email or Slack message`

         `('Matchday [N] data ingested. [X] players updated.')`

### **One-Time Player Seed Workflow**

This workflow runs ONCE before Matchday 1 to populate the Player table:

`Step 1 — HTTP Request: Fetch full Bundesliga player list from API`

`Step 2 — Transform: Map to Player schema`

         `(name, position enum, team, initial price, season_points = 0)`

`Step 3 — Supabase Insert: Populate Player table`

`Step 4 — Verify: Confirm 18 clubs, correct position distribution`

Player seed is a prerequisite for all other app functionality. It must be completed before any manager can build a squad.

### **API Field Mapping Requirements**

* Position values from API must be normalized to Supabase enum: GK | DEF | MID | FWD

* Player IDs from API must be stored alongside internal Supabase player IDs — add api\_player\_id field to Player table for mapping

* Prices from API should be stored as decimal in millions (e.g. 18.2, not 18200000\)

* Matchday number from API must match Supabase matchday integer convention — verify alignment before first ingestion

### **Player Table — Schema Addition**

* api\_player\_id: string — the player's ID in the external API (required for n8n field mapping)

* Without this field, n8n cannot reliably match API response rows to Supabase player rows on update

### **Failure Handling**

* If n8n workflow fails mid-run: Supabase upsert operations are idempotent — re-running the workflow is safe

* No partial state corruption — each step can be re-run independently

* If API is unavailable after matchday: delay ingestion until API recovers — app displays stale data with last-updated timestamp

* Add a last\_ingested\_at timestamp to MatchdayConfig so the UI can show data freshness if needed

### **Lovable Scope Boundary — Data Pipeline**

* Lovable builds the application — it does NOT build the data ingestion pipeline

* Lovable assumes Player, MatchdayStats, PriceHistory, and BenchmarkSnapshot tables are already populated

* Lovable should build the app as if data already exists — use seed data during development

* The n8n workflow is maintained entirely outside the Lovable project

### **Development Seed Data**

* For Lovable to build and test the app, a development seed dataset must be provided

* Minimum seed: 60 players (full Bundesliga squad depth), 5 matchdays of stats and prices

* Seed can be generated from the API before Lovable development begins

* Seed data inserted directly into Supabase tables — not via n8n (one-time manual insert for dev purposes)

## **9\. KPI Command Row (Above the Fold)**

* Top 11 Points — current matchday

* 5-Game Rolling Yield — dominant metric, largest visual element

* Yield vs Positional Benchmark — % delta, uses BenchmarkSnapshot values

* Transfers Remaining (x/5)

Rolling Yield \= Last 5 Matchday Points ÷ Current Market Price

Recalculates instantly on every trigger. No spinner unless data unavailable.

## **10\. Market Terminal**

* Searchable player database — instant filter

* Metrics: Market Price, Season Points, Last 5 Points, Rolling Yield, Positional Benchmark

* Value Signal badges per resolved Gap \#3 spec

* Price Trend chart: last 10 matchdays from PriceHistory — per Gap \#6 spec

* Performance Trend chart: last 5 matchdays from MatchdayStats — per Gap \#6 spec

* Chart library: Recharts — per Gap \#6 spec. No substitutions.

* No gridlines, no tooltips, no animation in MVP

## **11\. Draft Sandbox (Simulation Mode)**

* Session-based only — resets on refresh

* Simulate up to 5 transfers

* Dominant output: Net Rolling Yield Impact

* Secondary: Updated Top 11 projection, Budget margin (can go negative)

# **What We Are NOT Building (MVP)**

* Public or private leagues

* Head-to-head modes

* Notifications or social features

* Gamification

* Deep historical analytics

* AI recommendations

Terminal, not community.

# **High-Level Tech Stack**

## **Frontend**

* Vite — fast dev, minimal overhead

* React \+ TypeScript — deterministic logic clarity

* shadcn/ui — structured component system

* Tailwind CSS — 8pt grid spacing

## **Backend**

* Lovable Cloud — deployment

* Supabase PostgreSQL — relational constraints \+ RLS

## **Auth**

* Google OAuth via Supabase — low friction onboarding

## **Logic Layer**

* Deterministic JavaScript — pure functions, no async yield recalculation

* No microservices, no background jobs

# **Conceptual Data Model**

Top 11 is computed, never stored permanently. Formation is internal engine output — never stored.

## **User**

* id, email, created\_at

## **Squad**

* id, user\_id, budget\_remaining, matchday

* leverage\_def\_active: boolean

* leverage\_mid\_active: boolean

* leverage\_fwd\_active: boolean

## **Player**

* id, name, position (GK|DEF|MID|FWD), team, price

* season\_points, last\_5\_points

* rolling\_yield — computed: last\_5\_points / price

* api\_player\_id: string — external API player ID, required for n8n ingestion field mapping

## **PriceHistory**

* id, player\_id, matchday, price — decimal in millions

* One row per player per matchday, inserted after matchday data update cycle

* Index on (player\_id, matchday) — required for query performance

* Chart window: last 10 matchdays queried per player

## **SquadPlayer**

* squad\_id, player\_id

* is\_star: boolean

* is\_in\_top11: boolean — computed, not manually set

## **MatchdayStats**

* player\_id, matchday, points

## **TransferLog**

* id, squad\_id, matchday, player\_out\_id, player\_in\_id, created\_at

* Enforces 5-transfer limit across sessions and page refreshes

* Rows are immutable in MVP — no cancellation or soft-delete in MVP scope

* Row Level Security: scoped to auth.uid() via squad\_id

## **MatchdayConfig (NEW — Gap \#5)**

* id, matchday, deadline: timestamp, is\_break\_period: boolean, is\_locked: boolean

* last\_ingested\_at: timestamp — updated by n8n after each successful ingestion run

* is\_locked: true after matchday deadline — all transfers and changes blocked

* is\_break\_period: true during international breaks and winter break — unlimited transfers

* Admin-managed table — updated manually before each matchday

## **BenchmarkSnapshot (NEW — Gap \#3)**

* id, matchday, position (GK|DEF|MID|FWD), median\_yield, updated\_at

* One row per position per matchday — 4 rows inserted per matchday update cycle

* Market terminal and Holdings both read from this table — benchmark never computed on the fly

# **UI Design Principles**

## **Don't Make Me Think**

* No formation selection

* No unnecessary filters

* Yield always visible

* No decorative UI

## **Three Mindless Clicks**

* Click player → click transfer → confirm. Done.

## **Clarity Over Consistency**

If a number needs more space, it gets more space. Whitespace \= authority.

# **Security & Compliance**

* Supabase row-level security — squads and squad\_players scoped to auth.uid()

* Google OAuth authentication — no passwords stored

* No sensitive financial data or payment processing in MVP

* Matchday locks prevent post-deadline manipulation

# **Phased Roadmap**

## **MVP**

* Holdings dashboard

* Auto Top 11 engine — formation auto-selected, star/leverage per Gap \#1 spec

* Rolling yield calculation

* Benchmark yield system per Gap \#3 spec — BenchmarkSnapshot table required

* Market terminal with price \+ performance charts

* Draft sandbox

* Google login

## **V1**

* Historical yield comparison

* Sector heatmap

* Yield decay alerts

* CSV export

## **V2**

* Alpha Analyst — yield divergence detection, sector underperformance flags, inline signal cards

No chat UI.

# **Risks & Mitigations**

## **Risk: Yield Misinterpretation**

Mitigation: Persistent tooltip — "Rolling Yield \= Last 5 Points ÷ Current Price"

## **Risk: Over-complexity Creep**

Mitigation: Strict feature gate — "Does this improve yield clarity?" If no → kill.

## **Risk: Performance Bottlenecks**

* Pure client-side Top 11 logic

* Benchmark read from pre-computed Supabase table — no on-the-fly calculation

* No background jobs

## **Risk: Star/Leverage Misimplementation (Gap \#1)**

Mitigation: x1.5 badge applies to ONE player only. Screenshots showing all-sector multipliers are incorrect — must not be used as Lovable reference.

## **Risk: Formation Engine Misimplementation (Gap \#2)**

Mitigation: Engine must evaluate all 6 legal formations on every trigger. No formation UI exposed to manager. Pseudocode in this document is the authoritative algorithm spec.

## **Risk: Signal Instability (Gap \#3)**

Mitigation: Benchmark computed once per matchday, stored in BenchmarkSnapshot. Signals stable within a matchday cycle — no flickering.

## **Risk: Club Limit Misimplementation (Gap \#4)**

Mitigation: Validator evaluates club count AFTER removing the outgoing player. Same-club swaps must be allowed. Rule applies to squad of 15 only — Top 11 engine is club-agnostic.

## **Risk: Transfer Count Reset on Refresh (Gap \#5)**

Mitigation: Transfer count always computed from TransferLog database query — never from local state. KPI band reads live from Supabase on every render.

## **Risk: Chart Library Substitution (Gap \#6)**

Mitigation: Recharts is explicitly specified. Lovable must not substitute another library. No tooltips, gridlines, or animation in MVP.

## **Risk: Data Pipeline Scope Creep (Gap \#8)**

Mitigation: Lovable does not build the data pipeline. n8n is an external tool. Lovable assumes tables are pre-populated. A development seed dataset must be provided before Lovable development begins — without it, Lovable has no data to build against and will generate placeholder UI instead of real functionality.

Spieltag — Confidential Internal Document — v1.7
