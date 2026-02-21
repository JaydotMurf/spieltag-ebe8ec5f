**SPIELTAG**

**Implementation Plan & Build Scope**

Companion to masterplan\_v1.7.docx \+ resolution\_log\_v1.0.docx

*Version 2.0 — February 2026*

# **Core Build Principle**

Logic before UI. Always.

Every step in this plan follows a strict dependency order: data model → pure logic functions → UI wired to logic. No UI step begins until the logic it depends on is complete and verified by its checkpoint. This is the single most important rule for avoiding bugs in an AI-assisted build.

Lovable will be tempted to build UI early because it produces visible output fast. This plan explicitly prevents that. A screen that renders against unfinished logic is harder to fix than a screen that doesn't exist yet.

| ⚠️  DO NOT PROCEED: Do not skip ahead to any UI step until all logic checkpoints in the preceding steps pass. A passing checkpoint means the function returns correct output, not just that it compiles. |
| :---- |

# **Phase Overview**

All phases must be completed in order. No phase begins until the previous phase's checkpoint passes.

| Phase | Steps | What Gets Built | Timeline | Mode |
| :---- | :---- | :---- | :---- | :---- |
| **Pre-Build** | 0 | Supabase schema, Google OAuth, seed data via n8n, dev environment | External | Prerequisites |
| **Phase 1** | 1–3 | Metrics engine, squad validator, Top 11 engine — pure logic, no UI | \~Day 1–2 | Logic Only |
| **Phase 2** | 4–5 | Holdings dashboard \+ star/leverage UI wired to engine | \~Day 3 | Logic \+ UI |
| **Phase 3** | 6 | Market terminal — search, player detail, Recharts charts | \~Day 4 | Logic \+ UI |
| **Phase 4** | 7 | Draft Sandbox — simulation mode, session-only state | \~Day 5 AM | Logic \+ UI |
| **Phase 5** | 8 | Matchday locking, transfer enforcement, QA pass | \~Day 5 PM | Logic \+ UI |

# **Pre-Build — Prerequisites**

| SCOPE: This phase is completed OUTSIDE Lovable. Do not start the Lovable project until every item here is done. |
| :---- |

## **Step 0A — Supabase Project Setup**

Create the Supabase project and configure all tables before Lovable touches anything.

### **Tables to Create (in order)**

* users — handled automatically by Supabase Auth, no manual creation needed

* players — id, name, position (enum: GK|DEF|MID|FWD), team, price (decimal), season\_points (int), last\_5\_points (int), rolling\_yield (decimal, computed), api\_player\_id (string)

* squads — id, user\_id (ref users), budget\_remaining (decimal), matchday (int), leverage\_def\_active (bool), leverage\_mid\_active (bool), leverage\_fwd\_active (bool)

* squad\_players — squad\_id (ref squads), player\_id (ref players), is\_star (bool), is\_in\_top11 (bool)

* matchday\_stats — id, player\_id (ref players), matchday (int), points (int)

* price\_history — id, player\_id (ref players), matchday (int), price (decimal) — INDEX on (player\_id, matchday)

* transfer\_log — id, squad\_id (ref squads), matchday (int), player\_out\_id (ref players), player\_in\_id (ref players), created\_at (timestamp)

* benchmark\_snapshot — id, matchday (int), position (enum: GK|DEF|MID|FWD), median\_yield (decimal), updated\_at (timestamp)

* matchday\_config — id, matchday (int), deadline (timestamp), is\_break\_period (bool), is\_locked (bool), last\_ingested\_at (timestamp)

### **Row Level Security — Apply to These Tables**

* squads: SELECT, INSERT, UPDATE WHERE auth.uid() \= user\_id

* squad\_players: SELECT, INSERT, UPDATE, DELETE via squad\_id → squads.user\_id \= auth.uid()

* transfer\_log: SELECT, INSERT via squad\_id → squads.user\_id \= auth.uid()

* players, matchday\_stats, price\_history, benchmark\_snapshot, matchday\_config: SELECT only for all authenticated users

### **Auth**

* Enable Google OAuth provider in Supabase Auth settings

* Set redirect URL to Lovable project domain after project is created

| ✅ CHECKPOINT: You can connect to Supabase from a test client, all 9 tables exist, RLS is active, and Google OAuth is configured. |
| :---- |

## **Step 0B — Development Seed Data**

Seed data must exist before Lovable development begins. Without it, Lovable builds against empty tables and produces placeholder UI that is difficult to retrofit.

### **Minimum Seed Requirements**

* Players: full Bundesliga player list — minimum 18 clubs × \~3 players per position group \= \~200+ players

* Matchday stats: last 5 completed matchdays for all players

* Price history: last 10 matchdays of prices for all players

* Benchmark snapshot: 4 rows for the most recent matchday (GK, DEF, MID, FWD median yields)

* Matchday config: at least 3 rows — one past (locked), one current (active), one future (upcoming)

### **How to Generate Seed**

* Use n8n player seed workflow (see masterplan\_v1.7 Gap \#8) to populate players table

* Run weekly matchday workflow for the last 5 matchdays to populate matchday\_stats and price\_history

* Manually calculate and insert benchmark\_snapshot rows for the current matchday

* Manually insert 3 matchday\_config rows to cover past, current, and future matchday states

| ✅ CHECKPOINT: Query returns players with rolling\_yield \> 0, matchday\_stats has 5 matchdays of data, price\_history has 10 matchdays, benchmark\_snapshot has 4 rows for current matchday. |
| :---- |

# **Phase 1 — Pure Logic Layer (No UI)**

| SCOPE: All logic in Phase 1 is built as pure JavaScript functions with no UI dependency. Functions are testable in isolation. No React components, no Supabase calls in the functions themselves — pass data in as arguments. |
| :---- |

## **Step 1 — Metrics Engine**

Build these as pure functions. Input is a player object or array. Output is a computed value.

### **Functions to Build**

* calculateRollingYield(player)

  * Returns: last\_5\_points / price

  * Guard: if price \=== 0, return 0 and log data integrity warning

  * Guard: if matchdays played \< 5, use available matchdays — e.g. last3Points / price

* calculateBenchmarkYield(position, allPlayers)

  * Returns: median rolling yield of all players at that position

  * Do NOT call this on the fly — read from benchmark\_snapshot table instead

  * This function is used ONLY by the n8n workflow to populate benchmark\_snapshot

* getValueSignal(playerYield, benchmarkYield)

  * Returns: 'UNDERVALUED' | 'FAIR' | 'OVERVALUED'

  * UNDERVALUED: playerYield \> benchmarkYield \* 1.20

  * OVERVALUED: playerYield \< benchmarkYield \* 0.75

  * FAIR: everything between

| ✅ CHECKPOINT: Given a player with last\_5\_points \= 41 and price \= 21.0, calculateRollingYield returns 1.952. Given benchmarkYield \= 1.60, getValueSignal returns 'UNDERVALUED'. Division by zero returns 0\. |
| :---- |

## **Step 2 — Squad Rules Validator**

Build as a single validation module. Every function returns { blocked: boolean, reason: string }.

### **Functions to Build**

* validateSquadComposition(squadPlayers)

  * Counts: GK must equal 2, DEF must equal 5, MID must equal 5, FWD must equal 3

  * Returns blocked: true with reason if any count is wrong

* validateClubLimit(incomingPlayer, currentSquad, outgoingPlayer)

  * Remove outgoingPlayer from squad FIRST, then count incomingPlayer.team occurrences

  * If count \>= 3: blocked: true, reason: 'Rule Breach: Max 3 players per club (\[team\]).'

  * If no outgoingPlayer (initial squad build): count without removal

* validateTransfersRemaining(squadId, currentMatchday, isBreakPeriod)

  * Query TransferLog for count of rows WHERE squad\_id \= squadId AND matchday \= currentMatchday

  * If isBreakPeriod: return { blocked: false, remaining: Infinity }

  * If count \>= 5: blocked: true, reason: 'Transfer Limit Reached. 0 transfers remaining.'

  * Returns remaining: 5 \- count

| ✅ CHECKPOINT: validateClubLimit correctly allows a same-club swap (outgoing removed before count). validateTransfersRemaining reads from TransferLog, not from local state. All three functions return the correct blocked/reason shape. |
| :---- |

## **Step 3 — Top 11 Engine**

The most complex function in the app. Build and verify completely before any UI work begins.

### **Legal Formations — Complete Set**

* 4-4-2: DEF=4, MID=4, FWD=2

* 4-3-3: DEF=4, MID=3, FWD=3

* 3-5-2: DEF=3, MID=5, FWD=2

* 3-4-3: DEF=3, MID=4, FWD=3

* 4-5-1: DEF=4, MID=5, FWD=1

* 5-3-2: DEF=5, MID=3, FWD=2

### **selectTop Helper Function**

* Input: array of players, count N, primary sort key, secondary sort key (tiebreaker)

* Sort by primary descending, then secondary descending at the cut line

* Return top N players

`function selectTop(players, n, primary, secondary) {`

  `return [...players]`

    `.sort((a, b) => b[primary] - a[primary] || b[secondary] - a[secondary])`

    `.slice(0, n);`

`}`

### **computeTop11 Main Function**

* Input: squad (grouped by position), starDesignations, leverageToggles

* For each of the 6 formations: select GK (1), DEF (N), MID (N), FWD (N) using selectTop

* Apply star multiplier: if leverage toggle is active AND star player is in XI → points × 1.5

* Sum all 11 players' (multiplied) points

* Store result: { formation, xi, bench, totalPoints, leverageStatus\[\] }

* After all 6 formations: sort by totalPoints descending, tiebreak by DEF count descending

* Return the winner

### **checkLeverage Helper Function**

* For each sector with leverage active: check if starPlayer.id is in xi

* If not in xi: flag { sector, playerName, wasted: true }

* Return array of leverage status objects — one per active sector

| ✅ CHECKPOINT: computeTop11 with a known squad returns the correct formation and correct 11 players. Star player in XI: total includes 1.5x. Star player on bench: WASTED LEVERAGE flag appears, total does not include 1.5x. Tiebreaker: player with higher rolling yield wins the margin slot. Formation tiebreaker: more DEF wins. |
| :---- |

# **Phase 2 — Holdings Dashboard**

| DEPENDENCY: Phase 1 all checkpoints must pass before Phase 2 begins. The Holdings dashboard is entirely wired to the logic layer — building the UI before the logic is verified will result in hard-to-trace bugs. |
| :---- |

## **Step 4 — Holdings Dashboard UI**

Build the Holdings tab as the default landing screen after login. Wire every interactive element to the logic functions from Phase 1\.

### **KPI Band — Top of Screen, Always Visible**

* Top 11 Points — sum from computeTop11 output

* Rolling Yield — squad rolling yield (average of all 15 players' rolling yields)

* Yield vs Benchmark — % delta: (squadYield \- benchmarkYield) / benchmarkYield × 100

* Transfers Remaining — from validateTransfersRemaining, displayed as X/5 (or ∞ during breaks)

* KPI band is fixed — it does not scroll with the page content below it

### **Holdings Table — Left Column (70% width on desktop)**

* Players grouped by position: GK → DEF → MID → FWD

* Each position group header shows: position label \+ LEVERAGE toggle (DEF, MID, FWD only)

* WASTED LEVERAGE warning appears under group header if applicable — red label, \#D3010C

* Each player row shows: name, club, price, last 5 pts, rolling yield, value signal badge

* Star icon on each outfield player row — clicking designates that player as the sector star

* Transfer Out button on each player row — opens inline transfer drawer

### **Transfer Drawer — Inline, Not a Modal**

* Opens below the player row when Transfer Out is clicked

* Shows: search field to find replacement, replacement player metrics, confirm button

* On confirm: run all 3 validators, if all pass → insert TransferLog row → update SquadPlayer → call computeTop11 → update KPI band

* Blocked transfers: show inline error message, do not close drawer

### **Output XI Panel — Right Column (30% width on desktop)**

* Read-only — no interactive elements

* Shows: selected formation name, 11 players in positional order, bench players

* Star player row shows x1.5 badge — ONE player per sector maximum

* Total points shown at top of panel

* Recalculates and re-renders on every trigger: toggle change, star change, transfer confirm

### **Interaction Triggers — All Must Recalculate Top 11**

* LEVERAGE toggle toggled → recalculate → update Output XI \+ KPI band

* Star icon clicked → recalculate → update Output XI \+ KPI band

* Transfer confirmed → recalculate → update Output XI \+ KPI band \+ Transfers Remaining

| ✅ CHECKPOINT: Toggle DEF leverage on/off and Output XI updates instantly. Designate a star player who is on the bench — WASTED LEVERAGE warning appears. Complete a transfer — TransferLog has a new row, Transfers Remaining decrements, Output XI recalculates. Refresh the page — Transfers Remaining count is unchanged. |
| :---- |

# **Phase 3 — Market Terminal**

| DEPENDENCY: Phase 2 checkpoint must pass. Phase 3 has no new logic functions — it reads from existing tables and renders Recharts charts. |
| :---- |

## **Step 5 — Market Terminal UI**

### **Layout — Desktop**

* Left panel (40% width): search input (auto-focused) \+ filtered player list

* Right panel (60% width): player detail — stats, signal, two charts, action buttons

### **Left Panel — Search and List**

* Search input: instant filter on player name and club — no submit button, filters on keypress

* Optional position filter: compact toggle — GK / DEF / MID / FWD / ALL

* Player list rows: name, club, price, rolling yield, value signal badge

* Clicking a row loads that player in the right panel

### **Right Panel — Player Detail**

* Header: player name, club, position badge

* Stat row: price, season points, last 5 points, rolling yield, benchmark yield, value signal

* Price Trend chart — Recharts LineChart, last 10 matchdays from price\_history

* Numeric summary below price chart: 'Price: €\[X\]M (\[+/-\]\[Y\]M over 10 matchdays)'

* Performance Trend chart — Recharts LineChart, last 5 matchdays from matchday\_stats

* Numeric summary below performance chart: 'Last 5: \[X\] pts | Rolling Yield: \[Y\]'

* Action buttons: 'Transfer In' (if player not in squad) or 'Already in Squad' (disabled)

### **Recharts Chart Config — Authoritative**

* Import: LineChart, Line, XAxis, YAxis, ResponsiveContainer from 'recharts'

* No CartesianGrid, no Tooltip, no Legend — ever

* ResponsiveContainer: width='100%', height={120}

* XAxis: tickLine={false}, axisLine={false}, ticks=\[firstMatchday, lastMatchday\] only

* YAxis: tickLine={false}, axisLine={false}, width={32}, domain=\['auto','auto'\]

* Line: type='monotone', strokeWidth={1.5}, dot={false}

* Price chart line color: \#15803D if net positive, \#D3010C if net negative, \#111111 if flat

* Performance chart line color: \#111111 always

| ✅ CHECKPOINT: Search 'Kane' — player loads in right panel in under 1 second. Price chart renders with exactly 2 axis labels (first and last matchday). Performance chart shows exactly 5 data points. No tooltip appears on hover. Numeric summaries are accurate. |
| :---- |

# **Phase 4 — Draft Sandbox**

| SCOPE: Sandbox is session-only state. All simulated transfer state lives in React useState. Nothing in Sandbox writes to Supabase. The Sandbox resets completely on page refresh — this is intentional. |
| :---- |

## **Step 6 — Draft Sandbox UI**

### **State Management**

* simulatedSquad: copy of current squad in React state — modified by sandbox transfers

* simulatedTransferCount: integer, starts at 0, max 5 — React state only

* baselineYield: rolling yield of current live squad — computed once on tab load

* simulatedYield: rolling yield of simulatedSquad — recomputed after each simulation

### **Layout — Desktop**

* Left panel (50% width): simulation builder — current squad \+ transfer picker

* Right panel (50% width): projected output — yield impact, Top 11 projection, budget margin

### **Left Panel — Simulation Builder**

* Shows simulatedSquad grouped by position

* Each player row has: stats \+ 'Simulate Out' button

* Simulate Out opens picker: search for replacement, shows yield impact preview before confirm

* Confirm adds to simulatedTransferCount, updates simulatedSquad

* Reset button (top right): resets simulatedSquad to live squad, resets simulatedTransferCount to 0

### **Right Panel — Projected Output**

* Net Rolling Yield Impact — dominant metric, largest element: shows delta vs baseline (e.g. '+0.12')

* Projected Top 11 — output of computeTop11 run against simulatedSquad

* Projected Points — total from projected Top 11

* Budget Margin — remaining budget after simulated transfers (can display negative)

* If simulatedTransferCount reaches 5: inline message 'Simulation Limit Reached (5/5). Reset to continue.'

### **Club Limit in Sandbox**

* Club limit breaches in Sandbox: show warning inline, DO NOT block the simulation

* Warning copy: 'Note: This transfer would breach the 3-player club limit in your live squad.'

| ✅ CHECKPOINT: Simulate 3 transfers — projected yield updates after each. Simulate a club limit breach — warning shows, simulation is not blocked. Simulate 5 transfers — 6th is blocked with limit message. Refresh page — sandbox resets to live squad state. |
| :---- |

# **Phase 5 — Matchday Locking, Auth & QA**

## **Step 7 — Matchday Locking**

### **Matchday State from MatchdayConfig**

* On app load: fetch current matchday\_config row — read is\_locked, is\_break\_period, deadline

* If is\_locked: disable all transfer buttons, show 'Matchday in Progress — Transfers Locked' banner

* If is\_break\_period: show unlimited transfers — KPI band hides X/5 counter or shows ∞

* Sandbox is always available regardless of lock state — simulation is never locked

## **Step 8 — Google OAuth Login Flow**

### **Login Screen**

* Single screen: SPIELTAG wordmark, one-line tagline, 'Sign in with Google' button

* No email/password fields, no registration form — Google OAuth only

* On successful auth: check if user has an existing squad in squads table

  * If yes: redirect to /holdings

  * If no: create a new empty squad row for user, redirect to /holdings with onboarding state

### **New User Onboarding**

* First-time users land on /holdings with an empty squad

* Show inline prompt: 'Build your squad. Go to Market to add players.'

* No modal, no wizard, no multi-step flow — inline text prompt only

* Squad build is subject to all standard composition rules from day one

## **Step 9 — QA Pass**

### **Logic Correctness**

* Run computeTop11 with 10 known squads — verify output matches manual calculation

* Verify WASTED LEVERAGE fires correctly in all 3 sectors

* Verify same-club swap is not blocked by club limit validator

* Verify TransferLog count survives browser refresh

* Verify benchmark\_snapshot values match manually computed medians

### **UI Correctness**

* KPI band visible on all 3 tabs (Holdings, Market, Sandbox)

* Output XI panel shows x1.5 badge on ONE player per sector — never all players

* No chart tooltips on hover in any chart

* Value signal badge always paired with dot — never color alone

### **Responsive**

* Mobile: KPI band stacks vertically, Holdings table is single column

* Tablet: 2-column layout — list \+ detail panel

* Desktop: full 3-tab layout with side panels

### **Accessibility**

* All interactive elements keyboard-navigable: tabs, toggles, search, transfer buttons

* Visible focus states on all interactive elements

* Semantic heading hierarchy: H1 → H2 → H3 throughout

* No color-only indicators — every signal has a label or icon paired with color

| ✅ CHECKPOINT: All logic tests pass. No chart tooltips appear. WASTED LEVERAGE fires correctly. Transfer count persists on refresh. App is navigable by keyboard. All 3 breakpoints render correctly. |
| :---- |

# **MVP Scope Boundary**

These items are explicitly out of scope for the MVP build. Lovable must not build them, even partially:

## **Not in MVP — Deferred to V1**

* Transfer cancellation / undo flow

* Historical yield comparison across matchdays

* Sector heatmap

* Yield decay alerts

* CSV export

* Chart interactivity (zoom, pan, tooltip)

## **Not in MVP — Deferred to V2**

* Alpha Analyst signal cards

* Yield divergence detection

* Sector underperformance flags

## **Never in Scope**

* Public or private leagues

* Head-to-head modes

* Admin user role or admin panel

* Social features

* Notifications

* AI recommendations or chat interface

* Data ingestion pipeline (n8n is external — Lovable does not build this)

# **User Roles**

There is exactly one user role in MVP: Manager. All authenticated users are equal.

## **Manager (All Authenticated Users)**

* Full access to Holdings, Market, and Sandbox tabs

* Can designate star players in DEF, MID, FWD sectors

* Can toggle leverage on/off per sector

* Can execute up to 5 live transfers per matchday

* Can simulate up to 5 transfers in Sandbox per session

* Can view all players in Market terminal

## **No Admin Role in MVP**

* There is no admin role, admin panel, or privileged user in the MVP

* MatchdayConfig is managed directly in Supabase dashboard by the product owner

* BenchmarkSnapshot is populated by the n8n workflow — not by any in-app user

* Player data updates are handled entirely by n8n — no in-app data management

Spieltag — Implementation Plan v2.0 — Confidential Internal Document
