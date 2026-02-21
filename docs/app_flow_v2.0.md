**SPIELTAG**

**App Flow, Pages & Roles**

Complete user journey, named routes, page contents, and navigation triggers

*Version 2.0 — February 2026*

# **1\. User Roles**

There is exactly one user role in MVP. All authenticated users are equal. There is no admin role, no read-only role, and no premium tier.

## **Manager — The Only Role**

* Any user who authenticates via Google OAuth becomes a Manager

* All Managers have identical permissions and see identical UI

* Each Manager has exactly one Squad — created automatically on first login

* Managers cannot see or interact with other Managers' squads

* Row Level Security in Supabase enforces this isolation at the database level

## **What Managers Can Do**

* View their squad in Holdings — all 15 players, KPI band, Output XI

* Execute up to 5 live transfers per matchday

* Designate one star player per sector (DEF, MID, FWD)

* Toggle leverage on/off per sector

* Browse all Bundesliga players in Market terminal

* View player price trend and performance charts

* Simulate up to 5 transfers per session in Sandbox

## **What Managers Cannot Do**

* See other users' squads or transfer history

* Edit player data, prices, or matchday stats

* Access MatchdayConfig — managed directly in Supabase dashboard

* Cancel or undo a confirmed transfer — not in MVP scope

* Create a second squad

# **2\. Route Index**

The app has 5 routes. All user-facing routes are listed below. /auth/callback is a system route — it should never be displayed to the user.

| Route | Page Name | Purpose | Access |  |
| :---- | :---- | :---- | :---- | :---- |
| **`/`** | **Login** | Unauthenticated only. Google OAuth entry point. | Public |  |
| **`/holdings`** | **Holdings** | Default landing after login. Squad view, leverage, transfers. | Auth required |  |
| **`/market`** | **Market Terminal** | Full player database search and analysis. | Auth required |  |
| **`/sandbox`** | **Draft Sandbox** | Session-only simulation mode. | Auth required |  |
| **`/auth/callback`** | **Auth Callback** | Supabase OAuth redirect handler. Never user-facing. | System |  |

| ⚠️  RULE: All routes except / and /auth/callback require authentication. Any unauthenticated request to /holdings, /market, or /sandbox must redirect immediately to /. No partial page render before the redirect. |
| :---- |

# **3\. Complete User Flows**

| HOW TO READ THIS SECTION: Each flow is a numbered sequence of steps. Every step has an action (what the user does), a system response (what the app does), and a destination (where the user ends up). Navigation triggers are in courier font. |
| :---- |

## **Flow 1 — First Login (New User)**

1. User navigates to the app URL for the first time

   * System checks auth state → no session found

   * System renders / (Login page)

2. User clicks 'Sign in with Google'

   * System initiates Supabase Google OAuth flow

   * Browser redirects to Google sign-in

3. User completes Google sign-in

   * Google redirects to /auth/callback with OAuth code

   * Supabase exchanges code for session token

   * Supabase creates user record in auth.users

4. System checks if Squad row exists for this user

   * No squad found → system creates empty squad row: budget\_remaining \= 100.0, matchday \= current, all leverage toggles \= false

   * System redirects to /holdings with new\_user \= true flag in state

5. User lands on /holdings with empty squad

   * KPI band shows: Top 11 Pts \= 0, Rolling Yield \= 0.00, Vs Benchmark \= 0%, Transfers \= 5/5

   * Holdings list shows: empty state prompt — 'Your squad is empty. Go to Market to add players.'

   * Output XI panel shows: empty state — 'Add players to build your Top 11.'

   * 'Market' tab in tab bar is highlighted with a subtle indicator (first-time nudge — one-time only)

## **Flow 2 — Returning Login**

6. User navigates to the app URL

   * System checks auth state → valid session exists (Supabase session cookie present)

   * System skips / entirely — redirects directly to /holdings

7. User lands on /holdings with existing squad

   * All squad data loads from Supabase — players, leverage state, star designations

   * computeTop11 runs on load — Output XI panel populates

   * KPI band populates with live values

   * Transfers Remaining computed from TransferLog query for current matchday

| ⚠️  RULE: If a valid session exists, the user must NEVER see the / login page. Supabase session persistence handles this — do not add an additional check that could create a flash of the login page. |
| :---- |

## **Flow 3 — Building a Squad (New User, Holdings → Market → Holdings)**

8. New user on /holdings clicks 'Market' tab

   * System navigates to /market

   * Left panel loads full player list, auto-sorted by rolling yield descending

   * Search input is auto-focused

9. User types in search input — e.g. 'Grimaldo'

   * List filters instantly on keypress — no submit button

   * Matching players appear: name, club, position, price, rolling yield, value signal badge

10. User clicks on Grimaldo's row

    * Right panel loads Grimaldo's detail: stats, Price Trend chart (10 matchdays), Performance Trend chart (5 matchdays), numeric summaries below charts

    * Action button shows: 'Transfer In' (Primary Button, enabled — player not yet in squad)

11. User clicks 'Transfer In'

    * System runs squad composition validator — squad is empty, DEF slot available

    * System runs club limit validator — 0 Leverkusen players, passes

    * No TransferLog check during squad build — 5-transfer limit applies to post-build transfers only

    * Player added to squad\_players table

    * Action button changes to 'Already in Squad' (disabled)

    * Holdings KPI band updates if visible (it is not — user is on Market tab)

12. User repeats steps 2–4 until squad has 15 players

    * Squad composition enforced throughout: max 2 GK, max 5 DEF, max 5 MID, max 3 FWD

    * Club limit enforced throughout: max 3 per club

    * Budget enforced throughout: total player prices cannot exceed 100.0M

13. User clicks 'Holdings' tab

    * System navigates to /holdings

    * Squad loads with all 15 players — computeTop11 runs — Output XI populated

    * KPI band shows live values

| BUDGET NOTE: Budget enforcement during squad build: the Transfer In button is disabled if adding the player would exceed the 100.0M budget. Show disabled state with copy: 'Insufficient budget.' |
| :---- |

## **Flow 4 — Live Transfer (Holdings)**

14. User is on /holdings with a full 15-player squad

15. User locates a player they want to transfer out — e.g. a DEF with falling yield

    * Player row is visible in the DEF section of the Holdings list

16. User clicks 'Transfer Out' on the player's row

    * System opens the transfer drawer inline below that player's row

    * Drawer header: 'Transfer Out: \[Player Name\]'

    * Search input auto-focuses inside the drawer

17. User types a replacement player name — e.g. 'Tah'

    * List filters to matching players at the same position (DEF only — position filter auto-applied)

    * Players already in squad are excluded from results

18. User clicks Tah's row in the replacement list

    * Selection state applied: 2px left border on Tah's row

    * Yield impact preview appears below: e.g. 'Yield Change: \+0.08'

    * 'Confirm Transfer' button (Primary) becomes enabled

19. User clicks 'Confirm Transfer'

    * System runs all 3 validators in order:

    *   1\. validateTransfersRemaining — if 0 remaining and not break period: block, show error

    *   2\. validateClubLimit — remove outgoing player first, then check incoming player's club count

    *   3\. validateSquadComposition — confirm position balance remains valid

    * All pass → system executes transfer:

    *   \- Insert row into transfer\_log (squad\_id, matchday, player\_out\_id, player\_in\_id)

    *   \- Update squad\_players (remove outgoing, add incoming)

    *   \- Call computeTop11 → update Output XI panel

    *   \- Recompute KPI band values → update KPI band

    *   \- Close transfer drawer

    *   \- Transfers Remaining in KPI band decrements by 1

20. Transfer blocked (any validator fails)

    * Inline error message appears in drawer between list and confirm button

    * Confirm button remains disabled

    * Drawer stays open — user can search for a different replacement

    * Error message disappears when user selects a different player

## **Flow 5 — Configuring Leverage & Star Designation (Holdings)**

21. User is on /holdings

22. User locates the MID section header — sees 'LEVERAGE' toggle to the right

23. User clicks the LEVERAGE toggle — it turns on (\#111111 track)

    * System sets Squad.leverage\_mid\_active \= true in Supabase

    * computeTop11 runs immediately — leverage flag checked

    * If no star designated yet: no multiplier applied, no WASTED LEVERAGE shown

    * Output XI panel updates

24. User clicks the star icon (☆) next to a MID player — e.g. Wirtz

    * System sets SquadPlayer.is\_star \= true for Wirtz in Supabase

    * All other MID players' is\_star is set to false (only one star per sector)

    * computeTop11 runs immediately

    * Wirtz is in the Top 11 → multiplier applied → Output XI updates → x1.5 badge appears on Wirtz

    * KPI band Top 11 Pts updates

25. User makes a transfer that moves Wirtz to the bench (unlikely but possible)

    * computeTop11 runs → Wirtz not in XI → leverage multiplier lost

    * WASTED LEVERAGE warning appears under MID section header: 'WASTED LEVERAGE — Wirtz is not in your Top 11'

    * Warning is in \#D3010C, Inter 600, 11px, uppercase

26. User clicks star icon on a different MID player to resolve

    * Star transfers to new player — previous star cleared

    * computeTop11 runs → if new star is in XI: multiplier applied, WASTED LEVERAGE disappears

## **Flow 6 — Browsing Market Terminal**

27. User clicks 'Market' tab from any page

    * System navigates to /market

    * Left panel loads: position filter pills (ALL selected by default) \+ player list

    * Player list sorted by rolling yield descending on load

    * Right panel shows empty state: 'Select a player to view details.'

    * Search input auto-focuses

28. User clicks 'FWD' position filter pill

    * List filters to FWD players only instantly

    * 'FWD' pill becomes active state (\#111111 bg)

    * 'ALL' pill becomes inactive

29. User types 'Kane' in search

    * List further filters: FWD players whose name or club contains 'Kane'

    * Both filters are additive — position AND name/club must match

30. User clicks Kane's row

    * Kane's row gets selected state (2px left border \#111111)

    * Right panel loads: name, club, position badge, stat grid, Price Trend chart, Performance Trend chart, numeric summaries, 'Transfer In' button

    * Price Trend chart: last 10 matchdays of price\_history data, Recharts LineChart

    * Performance Trend chart: last 5 matchdays of matchday\_stats data, Recharts LineChart

31. User clicks 'Transfer In'

    * If matchday is locked (is\_locked \= true): button is disabled, no click action

    * If transfer limit reached: inline error appears above button

    * If all valid: same transfer execution flow as Flow 4 steps 6–7

    * On success: button changes to 'Already in Squad' (disabled)

## **Flow 7 — Using the Draft Sandbox**

32. User clicks 'Sandbox' tab

    * System navigates to /sandbox

    * simulatedSquad initialized from current live squad (React state only)

    * simulatedTransferCount initialized to 0 (React state)

    * baselineYield computed from live squad

    * Left panel shows simulatedSquad. Right panel shows baseline projected output.

33. User clicks 'Simulate Out' on a player — e.g. a MID with declining yield

    * Inline picker opens below the row

    * Search input auto-focuses

    * All players at that position are shown (including those already in live squad — sandbox is unrestricted)

34. User selects a replacement player

    * Yield impact preview: 'Yield Change: \[+/-\]\[X\]' appears below selection

    * Right panel updates in real-time showing projected yield with this replacement

35. User clicks 'Confirm Simulation'

    * simulatedSquad updated in React state — outgoing player removed, incoming added

    * simulatedTransferCount increments by 1

    * If club limit would be breached: warning shown inline — 'Note: This would breach the 3-player club limit.' — simulation is NOT blocked

    * computeTop11 runs against simulatedSquad

    * Right panel updates: Net Yield Impact, Projected Top 11, Projected Points, Budget Margin

36. User continues simulating up to 5 transfers

    * After 5th simulation: 'Simulate Out' buttons all disabled

    * Message in left panel: 'Simulation limit reached (5/5). Reset to continue.'

37. User clicks 'Reset Simulation'

    * simulatedSquad resets to current live squad

    * simulatedTransferCount resets to 0

    * All 'Simulate Out' buttons re-enable

    * Right panel resets to baseline values

38. User refreshes the page

    * All simulation state is lost — this is intentional and correct

    * Page reloads into /sandbox with fresh state from live squad

| ⚠️  RULE: The Sandbox NEVER writes to Supabase. No TransferLog rows, no squad\_players changes, no Supabase calls of any kind during simulation. All state lives in React useState and is destroyed on refresh. |
| :---- |

## **Flow 8 — Matchday Locked State**

39. A matchday deadline passes — MatchdayConfig.is\_locked is set to true by the product owner in Supabase dashboard

40. User is on /holdings during or after the lock

    * System reads is\_locked \= true from matchday\_config on load

    * All 'Transfer Out' buttons in Holdings list are disabled

    * All LEVERAGE toggles are disabled (cursor: not-allowed)

    * Star designation icons are disabled

    * Locked banner appears below KPI band: 'Matchday in Progress — Transfers Locked'

    * Banner: full width, 32px height, \#F9FAFB background, \#9CA3AF text, 1px bottom border

41. User navigates to /market during lock

    * 'Transfer In' button is disabled in player detail panel

    * No other Market functionality is affected — browse and charts work normally

42. User navigates to /sandbox during lock

    * Sandbox is fully functional — simulation is never locked

    * No lock banner in Sandbox — it is already clearly labelled as simulation-only

43. Lock is lifted — MatchdayConfig.is\_locked set to false

    * On next app load or tab focus: system re-fetches matchday\_config

    * All transfer buttons re-enable, toggles re-enable, star icons re-enable

    * Locked banner disappears

    * Transfers Remaining resets to 5 (new matchday row in MatchdayConfig)

## **Flow 9 — Logout**

| MVP NOTE: There is no logout button in the MVP UI. Users can clear their session via the browser or Google account settings. If a logout button is added in V1, it must call supabase.auth.signOut() and redirect to /. |
| :---- |

# **4\. Page Specifications**

Full specification for every user-facing page. Listed by route.

| ROUTE: `/`   LOGIN PAGE Entry point for unauthenticated users. Single purpose: Google OAuth initiation. |
| :---- |

### **Visible Elements**

* SPIELTAG wordmark — center, App Wordmark style (Inter 700, uppercase)

* Tagline — below wordmark: 'Bundesliga analytics for the yield-first manager.' — Body Primary style, \#9CA3AF

* 'Sign in with Google' button — Primary Button style, centered, with Google 'G' icon (16px) left of label

* No other elements — no navigation, no footer, no 'about' links

### **Page Behavior**

* If user has valid session: immediately redirect to /holdings — login page never renders

* On button click: Supabase initiates OAuth — browser leaves the page

* On auth failure: return to / with inline error below button — 'Sign-in failed. Please try again.' in \#D3010C

* No loading state between button click and OAuth redirect — the button click is instant

| ROUTE: `/holdings`   HOLDINGS PAGE Primary working view. Squad management, leverage configuration, live transfers. Default landing after login. |
| :---- |

### **App Shell (persistent across all tabs)**

* KPI band: fixed top, 56px — Top 11 Pts | Rolling Yield | Vs Benchmark | Transfers Remaining

* Tab bar: 44px — Holdings (active on this route) | Market | Sandbox

### **Left Panel — Squad List (65% desktop width)**

* Four position groups in order: GK, DEF, MID, FWD

* Each group: position label header \+ LEVERAGE toggle (DEF, MID, FWD only) \+ WASTED LEVERAGE warning (conditional)

* GK group: no LEVERAGE toggle — GK is ineligible for star designation

* Each player row: star icon | name | club | price | last 5 pts | rolling yield | value signal badge | Transfer Out button

* 2 GK rows, 5 DEF rows, 5 MID rows, 3 FWD rows — always 15 rows for a full squad

* Empty squad: single centered message per group — 'No \[position\] in squad.'

### **Right Panel — Output XI (35% desktop width, sticky)**

* Panel header: 'TOP 11' label \+ formation name (e.g. '3-5-2') right-aligned

* Total points: KPI Value style below header

* Player list: GK → DEF → MID → FWD with position group labels

* Each player row: name | club | points | x1.5 badge (if applicable)

* Bench section below XI: 'BENCH' label \+ 4 players at 50% opacity

* Output XI recalculates on: transfer confirmed, star changed, leverage toggled

### **Transfer Drawer (inline, below triggered row)**

* Opens on 'Transfer Out' click — pushes rows below downward

* Contents: header | search input (auto-focused) | replacement list | yield impact | confirm button | error area

* Replacement list: same-position players only, excluding players already in squad

* Confirm button: disabled until replacement selected AND all validators pass

* Close button (×): dismisses drawer, no changes made

### **Locked State Overlay**

* When is\_locked \= true: locked banner appears below tab bar (above list panel)

* All transfer buttons disabled, all toggles disabled, all star icons disabled

* Output XI panel remains visible and accurate

| ROUTE: `/market`   MARKET TERMINAL Full Bundesliga player database. Browse, search, analyse, and initiate transfers. |
| :---- |

### **App Shell**

* KPI band: same as Holdings — persistent, always visible

* Tab bar: Market tab is active

### **Left Panel — Search & List (40% desktop width)**

* Position filter pills: ALL | GK | DEF | MID | FWD — horizontal row, ALL active by default

* Search input: full width below pills, auto-focused on load

* Player list: filtered results, sorted by rolling yield descending

* Each row: name | club | price | rolling yield | value signal badge

* Selected player row: 2px left border \#111111

* Empty search results: 'No players match your search.' centered in panel

### **Right Panel — Player Detail (60% desktop width, sticky)**

* Default state: 'Select a player to view details.' centered

* Loaded state: player name (Page Header) | club \+ position badge

* Stat grid (2 col × 3 row): Price | Season Pts | Last 5 Pts | Rolling Yield | Benchmark Yield | Value Signal

* Divider below stats

* 'PRICE TREND' label — Recharts LineChart — 10 matchdays — 120px height

* Numeric summary: 'Price: €\[X\]M (\[+/-\]\[Y\]M over 10 matchdays)'

* 16px gap

* 'PERFORMANCE TREND' label — Recharts LineChart — 5 matchdays — 120px height

* Numeric summary: 'Last 5: \[X\] pts | Rolling Yield: \[Y\]'

* Divider below charts

* Action button: 'Transfer In' (Primary, enabled) or 'Already in Squad' (Primary, disabled)

* 'Insufficient budget' (Primary, disabled) if adding player exceeds budget

| ROUTE: `/sandbox`   DRAFT SANDBOX Session-only simulation mode. Simulates up to 5 transfers and projects yield impact. Resets on refresh. |
| :---- |

### **App Shell**

* KPI band: same as Holdings — persistent, always visible, reflects LIVE squad (not simulation)

* Tab bar: Sandbox tab is active

* 'SIMULATION MODE' label below tab bar — full width, 28px, \#F9FAFB bg, \#9CA3AF text — reminds user this is not live

### **Left Panel — Simulation Builder (50% desktop width)**

* Shows simulatedSquad — initially identical to live squad

* Counter at top: 'Simulations: \[X\]/5'

* Reset button (Ghost variant): top right — 'Reset'

* Each player row: name | club | rolling yield | 'Simulate Out' button (Secondary)

* After 5th simulation: all 'Simulate Out' buttons disabled, message: 'Simulation limit reached (5/5). Reset to continue.'

### **Right Panel — Projected Output (50% desktop width)**

* Net Rolling Yield Impact — dominant metric, largest element: signed delta (e.g. '+0.12' in \#15803D or '-0.08' in \#D3010C)

* Label below delta: 'YIELD IMPACT vs CURRENT SQUAD'

* Divider

* Projected Top 11 — compact list (name \+ projected points) from computeTop11 on simulatedSquad

* Projected Points total

* Budget Margin: '€\[X\]M remaining' — can be negative (shown in \#D3010C if negative)

### **Simulation Picker (inline, below triggered row)**

* Same drawer pattern as Holdings transfer drawer

* Replacement list includes ALL players at that position — no club limit blocking in Sandbox

* Club limit breach: shows advisory warning inline, does NOT block

* Yield impact preview updates right panel in real-time as replacement is hovered

| ROUTE: `/auth/callback`   AUTH CALLBACK System route. Handles Supabase OAuth redirect. Never renders UI. |
| :---- |

* Receives OAuth code from Google → exchanges for Supabase session token

* Checks if user has existing squad → creates one if not

* Redirects to /holdings — never displays any content to the user

* On error: redirects to / with error state

# **5\. Navigation Triggers — Complete Reference**

Every navigation event in the app is documented here. No navigation should occur that is not listed below.

| Trigger | Destination | Condition |
| :---- | :---- | :---- |
| App URL visited (no session) | **`/ (Login)`** | Always — unauthenticated state |
| App URL visited (valid session) | **`/holdings`** | Always — skip login page entirely |
| 'Sign in with Google' clicked | **`Google OAuth → /auth/callback`** | On button click |
| /auth/callback received | **`/holdings`** | After session established |
| /auth/callback error | **`/ with error state`** | On OAuth failure |
| 'Holdings' tab clicked | **`/holdings`** | From /market or /sandbox |
| 'Market' tab clicked | **`/market`** | From /holdings or /sandbox |
| 'Sandbox' tab clicked | **`/sandbox`** | From /holdings or /market |
| Unauthenticated request to any protected route | **`/`** | Immediate redirect, no render |
| Transfer In confirmed (Market) | **`/market (stays)`** | On successful transfer |
| Transfer Out confirmed (Holdings) | **`/holdings (stays)`** | On successful transfer |

| TAB PERSISTENCE: When navigating between tabs, scroll position within each tab resets to top. The selected player in Market terminal is NOT preserved when leaving and returning to /market — right panel returns to empty state. |
| :---- |

# **6\. State Persistence — What Survives a Refresh**

This section defines exactly what persists across browser refresh. Anything not listed here is session-only and resets on refresh.

## **Persists in Supabase (survives refresh, survives re-login)**

* Squad composition — all 15 players in squad\_players table

* Star designations — SquadPlayer.is\_star per player

* Leverage toggle states — Squad.leverage\_def\_active, leverage\_mid\_active, leverage\_fwd\_active

* Transfer history — TransferLog rows for current and past matchdays

* Budget remaining — Squad.budget\_remaining

## **Recomputed on Load (derived from Supabase data, not stored)**

* Top 11 output — computeTop11 runs fresh on every load

* Rolling yield values — last\_5\_points / price, computed on read

* Transfers remaining — count of TransferLog rows for current matchday

* Value signals — read from BenchmarkSnapshot, applied on render

* Matchday lock state — read from MatchdayConfig on load

## **Session-Only (resets on refresh — intentional)**

* Sandbox simulation state — simulatedSquad, simulatedTransferCount

* Search input values — Market terminal search, transfer drawer search

* Selected player in Market terminal — right panel returns to empty state

* Open/closed state of transfer drawers — all drawers closed on load

* Position filter selection in Market terminal — resets to ALL

Spieltag — App Flow, Pages & Roles v2.0 — Confidential Internal Document
