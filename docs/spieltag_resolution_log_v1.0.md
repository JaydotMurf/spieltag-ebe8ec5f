**SPIELTAG**

**Gap Resolution Log**

Companion document to masterplan\_v1.7.docx

*Version 1.0 — February 2026 — 8 Gaps Resolved*

# **Purpose of This Document**

This document is a companion to masterplan\_v1.7.docx. It exists for one reason: to give Lovable a clear record of every decision that was made, why it was made, and what it overrides.

The masterplan contains the full spec. This log contains the reasoning and change history. When Lovable encounters a spec that seems to contradict a common pattern or a screenshot, this log is the authority — the decision recorded here overrides everything else.

Read this document before reading the masterplan. It will prevent the most common implementation mistakes.

# **How to Use This Document**

* Each gap has a number, a one-line decision, a rationale, schema implications, and a list of things Lovable must NOT do

* The DECISION LOCKED box in each section is the authoritative single-sentence ruling — if in doubt, refer to that box

* The DO NOT build list is equally important — it tells Lovable what to avoid, not just what to build

* All decisions are final — do not interpret, extrapolate, or deviate from the locked decisions without explicit instruction

# **Resolution Summary — All 8 Gaps**

Every gap identified in the pre-build audit has been resolved. The table below is the complete decision index:

| Gap | Area | Decision Summary | Ver. | Status |
| :---- | :---- | :---- | :---- | :---- |
| **\#1** | **Star/Leverage Model** | One star per sector. 1.5x on designated player only. Sector toggle \= on/off. Persisted in Supabase. | v1.1 | **✅ Resolved** |
| **\#2** | **Legal Formations & Top 11 Engine** | 6 legal formations. Engine tries all 6, picks highest points total. Rolling yield as tiebreaker. Pseudocode provided. | v1.2 | **✅ Resolved** |
| **\#3** | **Benchmark Yield Thresholds** | All players, median per position, asymmetric band: green \>+20%, red \<-25%. BenchmarkSnapshot table. | v1.3 | **✅ Resolved** |
| **\#4** | **Club Limit Scope** | Max 3 per club applies to squad of 15 only. Top 11 engine is club-agnostic. Outgoing player removed before count evaluated. | v1.4 | **✅ Resolved** |
| **\#5** | **Transfer Limit Persistence** | Count queried from TransferLog — never local state. MatchdayConfig table. Cancellation deferred to V1. | v1.5 | **✅ Resolved** |
| **\#6** | **Price History for Charts** | 10-matchday window for price trend. 5-matchday window for performance trend. Both charts stacked in Market terminal. | v1.6 | **✅ Resolved** |
| **\#7** | **Chart Library Specification** | Recharts. LineChart with no gridlines, no tooltips, no animation. Numeric summaries below each chart. | v1.6 | **✅ Resolved** |
| **\#8** | **Data Ingestion Strategy** | n8n weekly workflow. 7-step pipeline. Player seed workflow. api\_player\_id field added. Lovable scope boundary explicit. | v1.7 | **✅ Resolved** |

# **Gap \#1 — Star Player (Leverage) Model**

**✅ RESOLVED — Locked in v1.1**

## **What Was Unclear**

The original PRD described a 'sector toggle' for leverage but didn't specify whether the 1.5x multiplier applied to one designated player or all players in that sector who made the Top 11\. Screenshots showed all MID players with an x1.5 badge, which directly contradicted the 'one star per sector' language elsewhere in the docs.

## **Decision**

| DECISION LOCKED: One designated star player per sector (DEF, MID, FWD). Only that player receives 1.5x. The sector LEVERAGE toggle is the on/off switch. The star icon on a player row designates which specific player is the star within that sector. |
| :---- |

## **Rationale**

Confirmed directly from the official Bundesliga Fantasy Manager rules: 'You will be able to choose one player from each position — defence, midfield and attack — in your starting XI as a star player, whose points will be worth 1.5 times the usual amount.' The screenshots showing all-sector multipliers were a UI prototype error and must be disregarded.

## **Schema Changes**

* SquadPlayer.is\_star: boolean — already in original model, confirmed correct

* Squad.leverage\_def\_active: boolean — NEW, persists sector toggle state

* Squad.leverage\_mid\_active: boolean — NEW, persists sector toggle state

* Squad.leverage\_fwd\_active: boolean — NEW, persists sector toggle state

## **Lovable Must NOT**

* Apply x1.5 to all players in a sector — only the one designated star

* Use the screenshots showing all-MID players with x1.5 as a UI reference

* Store leverage toggle state in React state or localStorage — Supabase only

* Auto-reassign the star to another player when WASTED LEVERAGE fires

# **Gap \#2 — Legal Formations & Top 11 Engine**

**✅ RESOLVED — Locked in v1.2**

## **What Was Unclear**

The PRD said 'no formation selection UI' and 'formation is implicit, internal only' but never defined which formations are legal, what the positional min/max rules are, or how the engine resolves ties between players competing for the same XI slot.

## **Decision**

| DECISION LOCKED: The engine evaluates all 6 legal formations (4-4-2, 4-3-3, 3-5-2, 3-4-3, 4-5-1, 5-3-2) on every trigger and selects the one producing the highest total points. Rolling yield is the tiebreaker at the player margin. Formation tiebreaker is more DEF. No formation UI is ever exposed to the manager. |
| :---- |

## **Rationale**

The official game requires the manager to select a formation manually before matchday. Spieltag intentionally departs from this — auto-selecting the optimal formation is a core product differentiator that reduces decision friction to zero. The 6 formations were confirmed from official Bundesliga app documentation and the Team of the Season article (3-4-3 appeared as a legal formation in season results).

## **Schema Changes**

* No new schema fields — formation is computed output only, never stored

## **Lovable Must NOT**

* Build a formation selection UI or dropdown of any kind

* Store the selected formation in the database or in state

* Evaluate only one formation — all 6 must be tried on every trigger

* Use any tiebreaker other than rolling yield at the player margin

* Hard-code a default formation — the engine always finds the optimal one

# **Gap \#3 — Benchmark Yield Thresholds**

**✅ RESOLVED — Locked in v1.3**

## **What Was Unclear**

The PRD referenced 'benchmark yield' and value signals (green/grey/red) but never defined what player population the benchmark is calculated from, what statistic defines it, or what the threshold bands are for triggering each signal.

## **Decision**

| DECISION LOCKED: Benchmark \= median rolling yield across ALL players at that position. Asymmetric band: Undervalued (green) when player yield \> benchmark × 1.20. Overvalued (red) when player yield \< benchmark × 0.75. Fair (grey) for everything between. Stored in BenchmarkSnapshot table, recalculated once per matchday. |
| :---- |

## **Rationale**

Median over all players prevents Bundesliga outliers (Grimaldo at 2.08, Wirtz at 1.95) from skewing the benchmark upward the way a mean would. The asymmetric band (green fires at \+20%, red not until \-25%) directly enforces the design guideline of 'green dominance' and 'red reserved for punishment states only.' The BenchmarkSnapshot table prevents intra-session signal instability — signals are stable within a matchday cycle.

## **Schema Changes**

* BenchmarkSnapshot: NEW table — id, matchday, position, median\_yield, updated\_at

* 4 rows inserted per matchday update cycle (one per position: GK, DEF, MID, FWD)

## **Lovable Must NOT**

* Calculate benchmark on the fly per page load — read from BenchmarkSnapshot only

* Use mean instead of median

* Use a symmetric band (e.g. ±20%) — the asymmetric thresholds are intentional

* Show a signal badge without its paired dot — color alone is never the only indicator (WCAG AA)

* Use a population smaller than all players at that position

# **Gap \#4 — Club Limit Scope**

**✅ RESOLVED — Locked in v1.4**

## **What Was Unclear**

The PRD said 'max 3 per club' but didn't specify whether this applied to the full 15-man squad or only to the Top 11\. It also didn't define validator ordering — specifically whether the outgoing player is removed from the count before evaluating the incoming player.

## **Decision**

| DECISION LOCKED: Max 3 per club applies to the squad of 15 only. The Top 11 engine is completely club-agnostic. The validator removes the outgoing player from the club count BEFORE evaluating the incoming player — same-club swaps must be allowed. |
| :---- |

## **Rationale**

Confirmed from the official Bundesliga Fantasy Manager rules: 'max 3 players per Bundesliga club' is described in the context of squad building, not lineup selection. The outgoing-player-first removal rule prevents same-club swaps from being incorrectly blocked — a common validator bug that would cause legitimate transfers to fail.

## **Schema Changes**

* No new schema fields required

## **Lovable Must NOT**

* Apply any club-based filtering in the Top 11 engine

* Evaluate the club count before removing the outgoing player

* Block Sandbox simulations for club limit breaches — show warning only, do not block

# **Gap \#5 — Transfer Limit Persistence**

**✅ RESOLVED — Locked in v1.5**

## **What Was Unclear**

The PRD described a 5-transfer limit but had no mechanism for persisting the count across browser sessions. Without server-side tracking, a manager could refresh the page to reset their transfer count — breaking the core constraint.

## **Decision**

| DECISION LOCKED: Transfer count is always computed by querying TransferLog — never stored in React state or localStorage. MatchdayConfig table manages deadline locking and break periods. Transfer cancellation is deferred to V1. Sandbox transfers never touch TransferLog. |
| :---- |

## **Rationale**

Any client-side transfer count is gameable via refresh. The TransferLog table makes the count a database fact, not a session variable. The MatchdayConfig table cleanly separates matchday state (deadline, lock, break period) from squad state, making both independently manageable.

## **Schema Changes**

* TransferLog: NEW table — id, squad\_id, matchday, player\_out\_id, player\_in\_id, created\_at

* MatchdayConfig: NEW table — id, matchday, deadline, is\_break\_period, is\_locked, last\_ingested\_at

## **Lovable Must NOT**

* Store transfer count in React state, localStorage, or sessionStorage

* Build a transfer cancellation or undo flow — this is V1 scope

* Write Sandbox simulation transfers to TransferLog

* Hard-code break period dates — read from MatchdayConfig.is\_break\_period

# **Gap \#6 — Price History for Charts**

**✅ RESOLVED — Locked in v1.6**

## **What Was Unclear**

The PriceHistory table was in the data model but the chart window (how many matchdays to display), query shape, axis behavior, and visual rules were completely unspecified. Lovable would have made arbitrary choices on all of these.

## **Decision**

| DECISION LOCKED: Price trend chart: last 10 matchdays from PriceHistory. Performance trend chart: last 5 matchdays from MatchdayStats. Both charts stacked vertically in Market terminal player detail panel. No gridlines, no tooltips, no animation. Numeric summaries below each chart replace tooltip functionality. |
| :---- |

## **Rationale**

5 matchdays is too short for price — Bundesliga prices move slowly and a 5-week window produces near-flat lines for most players. Full season becomes visually noisy and analytically stale at Matchday 24+. 10 matchdays captures genuine appreciation/depreciation trends while staying within the decision-relevant window. The performance chart mirrors the rolling yield window (5 matchdays) for analytical consistency.

## **Schema Changes**

* PriceHistory: confirmed in model — index on (player\_id, matchday) is required

## **Lovable Must NOT**

* Show tooltips on chart hover in MVP

* Add gridlines to either chart

* Add animation or transition effects on chart load

* Build interactive zoom, pan, or scrubbing functionality in MVP

* Use a different matchday window without explicit instruction

# **Gap \#7 — Chart Library Specification**

**✅ RESOLVED — Locked in v1.6 (alongside Gap \#6)**

## **What Was Unclear**

The PRD specified clean minimalist charts but never named the chart library. Without an explicit specification, Lovable would pick arbitrarily — potentially choosing Chart.js, Victory, or Nivo, each of which has different default behaviors, bundle sizes, and styling approaches.

## **Decision**

| DECISION LOCKED: Recharts is the authoritative chart library. LineChart component with Line, XAxis, YAxis, and ResponsiveContainer only. No CartesianGrid, no Tooltip, no Legend. Stroke width 1.5px, dot disabled, height 120px per chart. No substitutions permitted. |
| :---- |

## **Rationale**

Recharts is the natural choice for a React \+ TypeScript stack — it's React-native (not a wrapper), composable, Tailwind-compatible, and has the smallest API surface of the major chart libraries for simple line charts. Its declarative component model also means the exact configuration can be specified and version-controlled in this document, giving Lovable zero interpretive room.

## **Schema Changes**

* No schema changes — chart library is a frontend implementation decision only

## **Lovable Must NOT**

* Substitute Recharts with Chart.js, Victory, Nivo, Plotly, or any other library

* Enable CartesianGrid — ever

* Enable Tooltip — ever in MVP

* Enable Legend

* Change stroke width or dot behavior without explicit instruction

# **Gap \#8 — Data Ingestion Strategy**

**✅ RESOLVED — Locked in v1.7**

## **What Was Unclear**

The implementation plan said 'decide ingestion approach for MVP: manual CSV seed or small scripted seed.' This was a placeholder, not a spec. Without a defined pipeline, the app would have no real data and Lovable would build placeholder UI instead of a functional terminal.

## **Decision**

| DECISION LOCKED: n8n is the data ingestion tool. Weekly 7-step workflow triggered manually after each matchday. Separate one-time player seed workflow for Matchday 1 setup. Lovable does NOT build the pipeline — it assumes tables are pre-populated. A development seed dataset (60 players, 5 matchdays) must be provided before Lovable development begins. |
| :---- |

## **Rationale**

n8n was selected because it satisfies all three constraints: no-code (visual workflow builder, no scripting required), API-native (HTTP Request node connects to any API), and Supabase-integrated (native Supabase node handles upserts). The weekly cadence matches the Bundesliga matchday rhythm. The BenchmarkSnapshot recalculation is handled as the final step in the same workflow — no separate process needed.

## **Schema Changes**

* Player.api\_player\_id: string — NEW field, required for n8n to match API response rows to Supabase player rows

* MatchdayConfig.last\_ingested\_at: timestamp — NEW field, updated by n8n after each successful run

## **Lovable Must NOT**

* Build any data ingestion, import, or pipeline functionality

* Build an admin panel for data management in MVP scope

* Assume tables are empty — development seed data will be provided

* Use placeholder or mock data in the final build — all UI must render against real Supabase data

# **Complete Schema Change Log**

All additions to the original data model, indexed by the gap that required them:

| Table | Field / Change | Type | Purpose | Gap |
| :---- | :---- | :---- | :---- | :---- |
| **Squad** | `leverage_def_active` | `boolean` | Persists DEF sector toggle state | Gap \#1 |
| **Squad** | `leverage_mid_active` | `boolean` | Persists MID sector toggle state | Gap \#1 |
| **Squad** | `leverage_fwd_active` | `boolean` | Persists FWD sector toggle state | Gap \#1 |
| **Player** | `api_player_id` | `string` | External API player ID for n8n mapping | Gap \#8 |
| **PriceHistory** | `(new table)` | `—` | Price per player per matchday. Index on (player\_id, matchday) | Gap \#6 |
| **TransferLog** | `(new table)` | `—` | Transfer history per squad per matchday. Immutable in MVP | Gap \#5 |
| **BenchmarkSnapshot** | `(new table)` | `—` | Median yield per position per matchday. 4 rows per cycle | Gap \#3 |
| **MatchdayConfig** | `(new table)` | `—` | Deadline, lock state, break period, last\_ingested\_at per matchday | Gap \#5 |

# **Pre-Build Checklist — Before Handing to Lovable**

Complete all of these before starting the Lovable build. Each item is a prerequisite for a successful first build pass:

## **Data**

* API access confirmed and tested — player list and matchday stats endpoints working

* Development seed generated — minimum 60 players, 5 matchdays of stats and prices

* Seed data inserted into Supabase tables directly

* BenchmarkSnapshot rows calculated and inserted for the seeded matchdays

## **Infrastructure**

* Supabase project created with all tables per v1.7 data model

* Row Level Security enabled on squads, squad\_players, and transfer\_log

* Google OAuth provider enabled in Supabase Auth settings

* Index created on price\_history (player\_id, matchday)

## **n8n**

* n8n instance set up (cloud or self-hosted)

* Player seed workflow built and tested — full Bundesliga player table populated

* Weekly matchday workflow built and tested against one real matchday

## **Lovable**

* masterplan\_v1.7.docx provided to Lovable as primary spec

* This resolution log provided to Lovable as companion document

* Screenshots from the original app explicitly flagged as incorrect UI reference

* Lovable briefed: no formation UI, no chart library substitution, no pipeline work

Spieltag — Gap Resolution Log v1.0 — Confidential Internal Document
