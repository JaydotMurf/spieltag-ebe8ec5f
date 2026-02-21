# SPIELTAG — Task Tracker (Source of Truth)

> Companion to `masterplan_v1.7.md`, `implementation_plan_v2.0.md`, `design_guidelines_v2.0.md`, `app_flow_v2.0.md`
>
> **Status legend:** ✅ Done | 🔄 In Progress | ⬜ Todo | ⛔ Blocked

---

## Phase 0 — Pre-Build (External)

### 0A — Database Schema
- ✅ 9 tables created via migration (players, squads, squad_players, matchday_stats, price_history, transfer_log, benchmark_snapshot, matchday_config)
- ✅ RLS policies applied to all tables
- ✅ `owns_squad()` helper function created
- ✅ Google OAuth configured

### 0B — Seed Data
- ✅ Insert 200+ Bundesliga players into `players` table
- ✅ Insert 5 matchdays of `matchday_stats`
- ✅ Insert 10 matchdays of `price_history`
- ✅ Insert 4 `benchmark_snapshot` rows (GK, DEF, MID, FWD) for matchday 24
- ✅ Insert 3 `matchday_config` rows (23 locked, 24 active, 25 upcoming)

> **Note:** Seed data is a prerequisite for any meaningful UI testing. Without it, all pages render empty states.

---

## Phase 1 — Pure Logic Layer (No UI)

### Step 1 — Metrics Engine (`src/lib/metrics.ts`)
- ✅ `calculateRollingYield(player)` — last_5_points / price, div-by-zero guard
- ✅ `getValueSignal(playerYield, benchmarkYield)` — asymmetric band: >1.20 = UNDERVALUED, <0.75 = OVERVALUED

### Step 2 — Squad Rules Validator (`src/lib/validators.ts`)
- ✅ `validateSquadComposition(squadPlayers)` — 2 GK, 5 DEF, 5 MID, 3 FWD
- ✅ `validateClubLimit(incoming, squad, outgoing?)` — remove outgoing BEFORE count
- ✅ `validateTransfersRemaining(transfersUsed, isBreakPeriod)` — from TransferLog count

### Step 3 — Top 11 Engine (`src/lib/top11Engine.ts`)
- ✅ `selectTop(players, n)` — sort by matchday_points desc, tiebreak rolling_yield
- ✅ `computeTop11(squad, stars, leverage)` — evaluates all 6 formations, picks highest
- ✅ `checkLeverage()` — WASTED LEVERAGE detection
- ✅ `calcTotal()` — applies 1.5x multiplier for star in XI
- ✅ Formation tiebreaker: prefer more DEF

### Step 1–3 Tests
- ✅ `src/lib/__tests__/metrics.test.ts`
- ✅ `src/lib/__tests__/top11Engine.test.ts`
- ✅ `src/lib/__tests__/validators.test.ts`

---

## Phase 2 — Holdings Dashboard

### Design System (`src/index.css` + `tailwind.config.ts`)
- ✅ 10-token palette defined as CSS variables (HSL)
- ✅ Semantic shadcn mapping (--background, --foreground, --primary, etc.)
- ✅ Typography utility classes (kpi-value, kpi-label, section-header, body-primary, etc.)
- ✅ 8px spacing grid (sp-1 through sp-16)
- ✅ Signal color tokens (signal-green, signal-red, surface)
- ✅ Skeleton shimmer animation
- ⬜ **Audit:** Verify all components use semantic tokens — no hardcoded hex colors in components

### Auth Flow
- ✅ `AuthProvider` + `useAuth` hook (`src/contexts/AuthContext.tsx`)
- ✅ `ProtectedRoute` wrapper (`src/components/ProtectedRoute.tsx`)
- ✅ Login page with Google OAuth (`src/pages/LoginPage.tsx`)
- ✅ Auth callback handler (`src/pages/AuthCallback.tsx`)
- ⬜ **Audit:** Verify returning user skips login page entirely (no flash)
- ⬜ **Audit:** Verify new user auto-creates squad row on first login

### App Shell
- ✅ `KPIBand` — 4 tiles, fixed 56px, full labels visible (`src/components/KPIBand.tsx`)
- ✅ `TabBar` — Holdings | Market | Sandbox, 44px (`src/components/TabBar.tsx`)
- ✅ `AppShell` with `SquadDataContext` (`src/components/AppShell.tsx`)
- ⬜ **Audit:** KPI band z-index above all content
- ⬜ **Audit:** Content area padding-top = KPIBand (56px) + TabBar (44px) so nothing hides

### Step 4 — Holdings Page (`src/pages/HoldingsPage.tsx`)
- ✅ `useSquadData` hook — fetches squad, players, matchday config, benchmarks, transfer count
- ✅ Transfer count from live Supabase query on `transfer_log` (Architecture Rule 1)
- ✅ `PositionGroup` component — players grouped by GK/DEF/MID/FWD
- ✅ **Subtask:** Star designation — click star icon to set `is_star`, auto-deselect previous star in same sector
- ✅ **Subtask:** Leverage toggle per sector (DEF, MID, FWD) — persists to Supabase `squads` table
- ✅ **Subtask:** WASTED LEVERAGE warning display (red #D3010C, under sector header)
- ✅ `TransferDrawer` — inline below player row, search + replacement list
- ✅ **Subtask:** Transfer drawer search filters to same-position only, excludes current squad
- ✅ **Subtask:** Transfer confirm flow: run 3 validators → insert transfer_log → update squad_players → recompute Top 11
- ✅ **Subtask:** Yield impact preview in drawer before confirm
- ✅ **Subtask:** Budget enforcement on transfer (update budget_remaining)
- ✅ `OutputXIPanel` — formation name, 11 players, bench, x1.5 badge
- ✅ **Subtask:** Bench section at 50% opacity
- ✅ **Subtask:** Recalculate Top 11 on every trigger (toggle, star, transfer)
- ✅ **Subtask:** Locked state — disable all transfer buttons, toggles, star icons when `is_locked = true`
- ✅ **Subtask:** Locked banner below tab bar: "Matchday in Progress — Transfers Locked"

### Holdings Layout
- ✅ Desktop: 65% list / 35% Output XI / 32px gap (design_guidelines §4)
- ✅ Output XI panel sticky (does not scroll with list)
- ✅ Player row height: 48px fixed, alternate row tinting (#F9FAFB)
- ✅ Player row anatomy: star icon | name | club | price | last 5 pts | yield | signal badge | Transfer Out button

---

## Phase 3 — Market Terminal

### Data Hooks
- ✅ `useMarketPlayers` — fetch all players, position filter, search filter
- ✅ `usePlayerDetail` — fetch price_history (last 10) + matchday_stats (last 5)

### Step 5 — Market Page (`src/pages/MarketPage.tsx`)
- ✅ Layout: left panel 40% / right panel 60% / 32px gap
- ✅ Right panel independently scrollable

### Left Panel — PlayerList (`src/components/market/PlayerList.tsx`)
- ✅ Position filter pills (ALL | GK | DEF | MID | FWD) — active: #111 bg, inactive: border
- ✅ Search input auto-focused
- ✅ List sorted by rolling_yield descending
- ✅ Selected row — 2px left border #111111
- ✅ Player row format: name | club | price | rolling yield | value signal badge
- ✅ Alternate row tinting
- ✅ Empty search results: "No players match your search." centered

### Right Panel — PlayerDetail (`src/components/market/PlayerDetail.tsx`)
- ✅ Player header: name, club, position badge (pill)
- ✅ Stat grid: 2 col × 3 row (price, season pts, last 5, yield, benchmark yield, value signal)
- ✅ Divider between stat grid and charts
- ✅ Chart labels in KPI Label style ("PRICE TREND" / "PERFORMANCE TREND")
- ✅ Price Trend chart (Recharts, 10 matchdays, YAxis visible, width=32)
- ✅ Performance Trend chart (Recharts, 5 matchdays, YAxis visible)
- ✅ Recharts config locked: no CartesianGrid, no Tooltip, no Legend, dot=false, strokeWidth=1.5, height 120px
- ✅ XAxis ticks: first and last matchday only
- ✅ Price chart line color: green if net positive, red if negative, black if flat
- ✅ Numeric summaries below each chart
- ✅ 16px gap between charts
- ✅ Divider below charts, above action button
- ✅ "Transfer In" button — Primary, full-width
  - ✅ Already in Squad: disabled
  - ✅ Insufficient budget: disabled
  - ✅ Position full: disabled
  - ✅ Matchday locked: disabled
  - ✅ On success: insert squad_player, deduct budget, refetch

### Transfer In from Market
- ✅ Wire "Transfer In" to transfer execution flow (squad build mode, no TransferLog)
- ✅ Budget enforcement: disable if `player.price > squad.budget_remaining`
- ✅ Club limit validation
- ✅ During squad build (<15 players): no TransferLog check, just composition + club limit + budget

> **Recharts locked config reference** (from `masterplan_v1.7.md` §7 + `design_guidelines_v2.0.md` §14):
> ```tsx
> import { LineChart, Line, XAxis, YAxis, ResponsiveContainer } from 'recharts';
> // NEVER import: CartesianGrid, Tooltip, Legend
> <ResponsiveContainer width="100%" height={120}>
>   <LineChart data={data}>
>     <XAxis dataKey="matchday" tickLine={false} axisLine={false}
>            ticks={[firstMatchday, lastMatchday]} tick={{ fontSize: 11 }} />
>     <YAxis tickLine={false} axisLine={false} width={32}
>            domain={['auto','auto']} tick={{ fontSize: 11 }} />
>     <Line type="monotone" dataKey="price" stroke={color}
>           strokeWidth={1.5} dot={false} />
>   </LineChart>
> </ResponsiveContainer>
> ```

---

## Phase 4 — Draft Sandbox

### Step 6 — Sandbox Page (`src/pages/SandboxPage.tsx`)
- ✅ State management (ALL React useState — Architecture Rule 2):
  - `simulatedSquad` — deep copy of live squad on tab load
  - `simulatedTransferCount` — starts at 0, max 5
  - `baselineYield` — computed once from live squad
  - `simulatedYield` — recomputed after each simulation
- ✅ Layout: left panel 50% (simulation builder) / right panel 50% (projected output)

### Left Panel — Simulation Builder
- ✅ Show `simulatedSquad` grouped by position
- ✅ Each row: stats + "Simulate Out" button (Secondary)
- ✅ "Simulate Out" opens inline picker (same drawer pattern as Holdings)
- ✅ Replacement search includes ALL players at position (no club limit blocking)
- ✅ Club limit breach: show warning inline, do NOT block simulation
- ✅ Yield impact preview before confirm
- ✅ On confirm: update `simulatedSquad` in state, increment `simulatedTransferCount`
- ✅ Counter at top: "Simulations: X/5"
- ✅ Reset button (Ghost): resets to live squad, count → 0
- ✅ After 5th: all "Simulate Out" disabled, message: "Simulation limit reached (5/5). Reset to continue."
- ✅ "SIMULATION MODE" label below tab bar (full width, 28px, #F9FAFB bg, #9CA3AF text)

### Right Panel — Projected Output
- ✅ Net Rolling Yield Impact — dominant metric, largest element, signed delta
- ✅ Label: "YIELD IMPACT vs CURRENT SQUAD"
- ✅ Divider
- ✅ Projected Top 11 — compact list from `computeTop11(simulatedSquad)`
- ✅ Projected Points total
- ✅ Budget Margin: "€XM remaining" — negative shown in red

### Sandbox Rules (Architecture Rule 2)
- ✅ **NEVER** writes to Supabase — no transfer_log rows, no squad_players changes
- ✅ All state resets on page refresh — intentional
- ✅ KPI band reflects LIVE squad, not simulation
- ✅ Sandbox always available even when matchday is locked

---

## Phase 5 — Matchday Locking, Auth Polish & QA

### Step 7 — Matchday Locking
- ✅ On app load: fetch current `matchday_config` row
- ✅ If `is_locked`: disable all transfer buttons, leverage toggles, star icons
- ✅ Locked banner: "Matchday in Progress — Transfers Locked" (full width, 32px, #F9FAFB bg, #9CA3AF text)
- ✅ Market: "Transfer In" disabled during lock
- ✅ Sandbox: fully functional regardless of lock state
- ✅ If `is_break_period`: show unlimited transfers (∞ in KPI band)

### Step 8 — Auth Polish
- ✅ New user: auto-create empty squad row (budget_remaining = 100.0)
- ✅ Empty squad prompt: "Your squad is empty. Go to Market to add players." (inline text, not modal)
- ✅ Returning user: skip login page, redirect to /holdings
- ✅ No logout button in MVP (per `app_flow_v2.0.md` Flow 9)

### Step 8 — Auth Polish
- ⬜ New user: auto-create empty squad row (budget_remaining = 100.0)
- ⬜ Empty squad prompt: "Your squad is empty. Go to Market to add players." (inline text, not modal)
- ⬜ Returning user: skip login page, redirect to /holdings
- ⬜ No logout button in MVP (per `app_flow_v2.0.md` Flow 9)

### Step 9 — QA Pass
- ⬜ Logic: computeTop11 with known squads matches manual calculation
- ⬜ Logic: WASTED LEVERAGE fires correctly in all 3 sectors
- ⬜ Logic: same-club swap allowed by club limit validator
- ⬜ Logic: TransferLog count survives browser refresh
- ⬜ Logic: benchmark_snapshot values match manually computed medians
- ⬜ UI: KPI band visible on all 3 tabs
- ⬜ UI: x1.5 badge on ONE player per sector in Output XI — never all
- ⬜ UI: No chart tooltips on hover
- ⬜ UI: Value signal badge always has dot + label (WCAG AA)
- ⬜ Responsive: Mobile KPI band 2×2 grid
- ⬜ Responsive: Tablet 2-column layout
- ⬜ Responsive: Desktop full layout with side panels
- ⬜ A11y: All interactive elements keyboard-navigable
- ⬜ A11y: Visible focus states (2px solid #111111, 2px offset)
- ⬜ A11y: Semantic heading hierarchy H1→H2→H3

---

## Architecture Rules (Always Enforce)

1. Transfer count always from live Supabase query on `transfer_log`. Never React state/localStorage.
2. Sandbox NEVER writes to Supabase. All simulation in `useState` only. Resets on refresh.
3. `computeTop11` called after every: transfer confirm, star change, leverage toggle. Never cached.
4. `validateClubLimit` receives BOTH incomingPlayer AND outgoingPlayer. Remove outgoing BEFORE count.

## Layout Rules (Always Enforce)

5. App shell top→bottom: KPIBand (56px, fixed, z-above-all) → TabBar (44px) → Content (remaining vh, scrollable)
6. Market Terminal: left 40% / right 60%, right panel sticky, both independently scrollable. Transfer In at bottom of right panel.

## Never Build

- No formation selector UI
- No x1.5 badge on all players in a sector
- No chart tooltips, gridlines, legends, zoom/pan
- No transfer cancellation/undo
- No admin panel
- No data pipeline code (n8n is external)

---

## RLS & SQL Reference

### Squad ownership helper (already deployed)
```sql
CREATE OR REPLACE FUNCTION public.owns_squad(p_squad_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$ SELECT EXISTS (SELECT 1 FROM public.squads WHERE id = p_squad_id AND user_id = auth.uid()); $$;
```

### Transfer execution SQL pattern
```sql
-- 1. Insert transfer log row
INSERT INTO transfer_log (squad_id, matchday, player_out_id, player_in_id)
VALUES ($1, $2, $3, $4);

-- 2. Remove outgoing player
DELETE FROM squad_players WHERE squad_id = $1 AND player_id = $3;

-- 3. Add incoming player
INSERT INTO squad_players (squad_id, player_id) VALUES ($1, $4);

-- 4. Update budget
UPDATE squads SET budget_remaining = budget_remaining + outgoing_price - incoming_price
WHERE id = $1;
```

### Transfer count query (Architecture Rule 1)
```sql
SELECT COUNT(*) FROM transfer_log
WHERE squad_id = $1 AND matchday = $2;
```
