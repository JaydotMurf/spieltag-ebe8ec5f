**SPIELTAG**

**Design Guidelines**

Component-level visual specification for Lovable implementation

*Version 2.0 — February 2026*

# **Design Philosophy**

Spieltag is a terminal, not a dashboard. Every visual decision should feel like it belongs in a professional analytics tool — not a fantasy sports app. The aesthetic is controlled restraint: high contrast, deliberate color use, whitespace that creates clarity rather than emptiness.

Three rules govern every component decision in this document:

* Color is reserved for meaning. Green means positive signal. Red means warning or breach. Grey means neutral. No color is ever decorative.

* Density over decoration. Player rows are information-dense. No rounded corners on data elements. No gradients. No shadows on flat surfaces.

* Interaction is earned. Hover states confirm interactivity. Focus states are visible for keyboard users. Disabled states communicate unavailability, not invisibility.

| ⚠️  NEVER: Do not introduce colors, fonts, effects, or components not defined in this document. If a UI element is not specified here, refer to the existing system and extend it consistently. |
| :---- |

# **1\. Color System**

The entire product uses a 10-token palette. No additional colors are permitted. Tailwind utility classes are listed alongside each token for Lovable's implementation reference.

| Token Name | Hex |  | Usage |
| :---- | :---- | :---- | :---- |
| `black-primary` | `#111111` |   | All primary text, headings, wordmark |
| `white-primary` | `#FFFFFF` |   | All background surfaces, panel backgrounds |
| `grey-border` | `#E5E7EB` |   | All dividers, table row separators, borders |
| `grey-muted` | `#9CA3AF` |   | Secondary text, metadata, disabled labels |
| `grey-surface` | `#F9FAFB` |   | Alternate row tinting, hover surface on rows |
| `green-positive` | `#15803D` |   | UNDERVALUED badge, positive price delta, star icon active, leverage active |
| `green-surface` | `#F0FDF4` |   | UNDERVALUED badge background |
| `red-negative` | `#D3010C` |   | OVERVALUED badge, WASTED LEVERAGE, blocked transfer messages, negative price delta |
| `red-surface` | `#FFF1F1` |   | OVERVALUED badge background, warning banner background |
| `blue-info` | `#1D4ED8` |   | Design notes only — not used in product UI |

## **Color Usage Rules**

* Green (\#15803D) and red (\#D3010C) are signal colors — they carry meaning. Never use them for decoration, branding, or hover states.

* \#F9FAFB is used for alternate row tinting only — not as a general surface color.

* No opacity variants — use only the exact hex values in the table above.

* No gradients anywhere in the product.

* No box shadows on any flat surface (player rows, panels, KPI tiles).

* Light drop shadow is permitted only on floating elements: dropdowns, drawer overlays.

## **Tailwind Mapping**

* black-primary → text-gray-900 / bg-gray-900

* white-primary → bg-white / text-white

* grey-border → border-gray-200 / divide-gray-200

* grey-muted → text-gray-400

* grey-surface → bg-gray-50

* green-positive → text-green-700 / border-green-700

* green-surface → bg-green-50

* red-negative → text-red-600 / border-red-600

* red-surface → bg-red-50

# **2\. Typography**

Inter is the sole typeface for the product UI. Courier New is used only in internal documentation — it does not appear in any rendered product screen.

| Style Name | Font | Weight | Size / Line-h | Transform | Usage |
| :---- | :---- | :---- | :---- | :---- | :---- |
| **App Wordmark** | Inter | 700 | `32px / 64px` | Uppercase, tracked | SPIELTAG header only |
| **Page Header** | Inter | 700 | `24px / 48px` | Normal | Holdings / Market / Sandbox titles |
| **Section Header** | Inter | 600 | `16px / 32px` | Normal | Position group headers (GK, DEF...) |
| **KPI Value** | Inter | 700 | `28px / 56px` | Tabular-nums | Rolling yield, points in KPI band |
| **KPI Label** | Inter | 400 | `11px / 22px` | Uppercase, tracked | Labels under KPI values |
| **Body Primary** | Inter | 400 | `14px / 28px` | Normal | Player names, default text |
| **Body Secondary** | Inter | 400 | `12px / 24px` | Normal | Club names, metadata |
| **Stat Value** | Inter | 600 | `14px / 28px` | Tabular-nums | Prices, points, yield values |
| **Badge Text** | Inter | 600 | `11px / 22px` | Uppercase | UNDERVALUED / OVERVALUED / FAIR |
| **Chart Axis** | Inter | 400 | `11px / 22px` | Tabular-nums | Chart axis labels (min/max only) |
| **Code / Mono** | Courier New | 400 | `13px / 26px` | Normal | Internal doc reference only — not in UI |

## **Typography Rules**

* Use tabular-nums (font-variant-numeric: tabular-nums) on all numerical values — prices, points, yield, KPI values. This prevents layout shift as numbers update.

* Do not use italic in the product UI — italic is reserved for this design doc's annotation style.

* Uppercase \+ letter-spacing (tracking-widest in Tailwind) is used only for KPI labels and badge text — not for body text or player names.

* Line height follows the table above — do not deviate. Tight line heights on data-dense rows are intentional.

# **3\. Spacing System**

All spacing follows an 8px base grid. Use only the tokens defined below. No arbitrary spacing values.

| Token | Value | Usage |
| :---- | :---- | :---- |
| `sp-1` | **`4px`** | Icon internal padding, tight inline gaps |
| `sp-2` | **`8px`** | Between badge dot and label, between icon and text |
| `sp-3` | **`12px`** | Padding inside badges, padding inside compact buttons |
| `sp-4` | **`16px`** | Player row vertical padding, card internal padding |
| `sp-5` | **`20px`** | Between player row stat columns |
| `sp-6` | **`24px`** | Between section headers and first player row |
| `sp-8` | **`32px`** | Between position groups in Holdings list |
| `sp-10` | **`40px`** | KPI band height, tab bar height |
| `sp-12` | **`48px`** | Page-level horizontal padding (desktop) |
| `sp-16` | **`64px`** | Panel gap between left and right columns |

## **Spacing Rules**

* All padding and margin values must be multiples of 4px. Prefer multiples of 8px.

* Player row height is always 48px (sp-10 \+ 8px for border). Do not make rows taller to accommodate badges or secondary text — badges sit inline.

* KPI band height: 56px fixed. Never grows with content.

* Tab bar height: 44px fixed.

* Left/right panel gap on desktop: 32px (sp-8).

# **4\. Layout & Grid**

## **Breakpoints**

* Mobile: \< 640px — single column, KPI band stacks 2×2

* Tablet: 640px–1023px — 2 column, 50/50 split

* Desktop: ≥ 1024px — Holdings: 65% list / 35% Output XI. Market: 40% search+list / 60% detail

## **Page-Level Layout**

* App shell: full-height, no horizontal scroll on desktop

* Top: KPI band (fixed, 56px) — always visible, never scrolled out of view

* Below KPI band: Tab bar (44px) — Holdings | Market | Sandbox

* Below tab bar: main content area — scrollable per tab, full remaining viewport height

* Horizontal padding on desktop: 48px (sp-12) left and right

* Horizontal padding on mobile: 16px (sp-4) left and right

## **Column Layout — Holdings Tab**

* Desktop: list panel 65% width | Output XI panel 35% width | 32px gap

* Output XI panel is sticky — it does not scroll with the list panel

* Tablet: list panel full width, Output XI panel collapses to bottom of page

* Mobile: list panel full width, Output XI panel hidden behind 'View XI' toggle button

## **Column Layout — Market Tab**

* Desktop: left panel 40% (search \+ list) | right panel 60% (player detail) | 32px gap

* Right panel is sticky — stays in view as left panel list scrolls

* Tablet: left panel full width list, right panel slides in as a drawer on player tap

* Mobile: list view only, player detail is a full-screen drawer

# **5\. KPI Band**

The KPI band is the single most prominent element in the app. It persists across all tabs. Four tiles, fixed height.

## **Structure**

* Container: full width, 56px height, white background, 1px bottom border (\#E5E7EB), sticky top

* Four tiles in a row, equal width, no dividers between tiles — whitespace only

* Each tile: label (top, KPI Label style) \+ value (below, KPI Value style)

## **The Four Tiles**

* Top 11 Points — value: integer (e.g. '312'). Label: 'TOP 11 PTS'

* Rolling Yield — value: 2 decimal places (e.g. '1.85'). Label: 'ROLLING YIELD'. This tile is the largest — KPI Value at 28px.

* Yield vs Benchmark — value: signed percentage (e.g. '+12.4%'). Label: 'VS BENCHMARK'. Green (\#15803D) if positive, red (\#D3010C) if negative, grey (\#9CA3AF) if 0\.

* Transfers Remaining — value: 'X/5' or '∞' during break periods. Label: 'TRANSFERS'. Red (\#D3010C) when value is '0/5'.

## **KPI Band States**

* Default: all four tiles visible, values loaded from Supabase

* Loading: values replaced by a subtle grey shimmer (skeleton loader) — no spinner

* 0 Transfers: Transfers tile value turns red (\#D3010C), no other change

* Break period: Transfers tile shows '∞' in grey (\#9CA3AF) — not red, not green

* Matchday locked: no visual change to KPI band — transfer button states handle lock feedback

# **6\. Navigation Tabs**

## **Tab Bar**

* Three tabs: Holdings | Market | Sandbox

* Container: full width, 44px height, white background, 1px bottom border (\#E5E7EB)

* Tab labels: Section Header style (Inter 600, 16px), uppercase

* Horizontal padding per tab: 24px left and right

## **Tab States**

| State | Background | Border / Outline | Text / Icon |
| :---- | :---- | :---- | :---- |
| **Default** | `#FFFFFF` | `none` | text: \#9CA3AF |
| **Hover** | `#F9FAFB` | `none` | text: \#111111 |
| **Active** | `#FFFFFF` | `2px solid #111111 (bottom only)` | text: \#111111, bold |
| **Focus** | `#FFFFFF` | `2px solid #111111 (full outline)` | text: \#111111 |

* Active tab indicator: 2px solid bottom border in \#111111 — not underline, not background fill

* Only one tab is active at a time — no multi-selection

# **7\. Buttons**

Four button variants. Border radius: 4px on all buttons. No rounded-full pill buttons.

## **Primary Button — Transfer Confirm, Sign In**

* Background: \#111111. Text: \#FFFFFF. Font: Inter 600, 14px. Height: 36px. Padding: 0 16px.

| State | Background | Border / Outline | Text / Icon |
| :---- | :---- | :---- | :---- |
| **Default** | `#111111` | `none` | text: \#FFFFFF |
| **Hover** | `#374151 (gray-700)` | `none` | text: \#FFFFFF |
| **Active/Press** | `#1F2937 (gray-800)` | `none` | text: \#FFFFFF |
| **Focus** | `#111111` | `2px solid #111111, 2px offset` | text: \#FFFFFF |
| **Disabled** | `#E5E7EB` | `none` | text: \#9CA3AF, cursor: not-allowed |
| **Loading** | `#111111` | `none` | spinner (white, 14px) \+ 'Processing...' |

## **Secondary Button — Transfer Out, Simulate Out**

* Background: \#FFFFFF. Border: 1px solid \#E5E7EB. Text: \#111111. Font: Inter 400, 14px. Height: 36px. Padding: 0 16px.

| State | Background | Border / Outline | Text / Icon |
| :---- | :---- | :---- | :---- |
| **Default** | `#FFFFFF` | `1px solid #E5E7EB` | text: \#111111 |
| **Hover** | `#F9FAFB` | `1px solid #9CA3AF` | text: \#111111 |
| **Active/Press** | `#F3F4F6` | `1px solid #9CA3AF` | text: \#111111 |
| **Focus** | `#FFFFFF` | `2px solid #111111, 2px offset` | text: \#111111 |
| **Disabled** | `#FFFFFF` | `1px solid #E5E7EB` | text: \#9CA3AF, cursor: not-allowed |

## **Destructive Button — Not used in MVP (reserved for V1 transfer cancel)**

* Background: \#FFF1F1. Border: 1px solid \#D3010C. Text: \#D3010C. Font: Inter 600, 14px. Height: 36px.

## **Ghost Button — Reset Sandbox**

* Background: transparent. Border: none. Text: \#9CA3AF. Font: Inter 400, 14px. Height: 36px.

| State | Background | Border / Outline | Text / Icon |
| :---- | :---- | :---- | :---- |
| **Default** | `transparent` | `none` | text: \#9CA3AF |
| **Hover** | `#F9FAFB` | `none` | text: \#111111 |
| **Focus** | `transparent` | `2px solid #111111, 2px offset` | text: \#111111 |
| **Disabled** | `transparent` | `none` | text: \#E5E7EB, cursor: not-allowed |

## **Button Rules**

* No icon-only buttons in MVP — all buttons have a text label

* Button width: fit-content by default, never full-width except on mobile (Transfer confirm CTA)

* Loading state: replace button text with spinner \+ short label. Never disable and show nothing.

* Transition: background-color 150ms ease on hover/active — no other transitions

# **8\. Input Fields**

## **Search Input — Market Terminal & Transfer Drawer**

* Height: 40px. Border: 1px solid \#E5E7EB. Border radius: 4px. Background: \#FFFFFF.

* Padding: 0 12px. Font: Inter 400, 14px, \#111111.

* Placeholder text: Inter 400, 14px, \#9CA3AF.

* Leading icon: search icon (16px, \#9CA3AF) — 12px gap between icon and text.

| State | Background | Border / Outline | Text / Icon |
| :---- | :---- | :---- | :---- |
| **Default** | `#FFFFFF` | `1px solid #E5E7EB` | placeholder: \#9CA3AF |
| **Focused** | `#FFFFFF` | `1px solid #111111` | caret: \#111111, text: \#111111 |
| **Filled** | `#FFFFFF` | `1px solid #E5E7EB` | text: \#111111 |
| **Hover (unfocused)** | `#F9FAFB` | `1px solid #9CA3AF` | placeholder: \#9CA3AF |
| **Disabled** | `#F9FAFB` | `1px solid #E5E7EB` | text: \#9CA3AF, cursor: not-allowed |

## **Input Rules**

* Search inputs auto-focus on tab load (Market terminal) and on drawer open (Transfer drawer)

* No submit button on search — filter fires on keypress (onChange)

* Clear button (×, 16px, \#9CA3AF) appears inside input when value is non-empty — clears on click

* No form inputs in MVP other than search — all other interactions are click-based

# **9\. Toggles — Leverage System**

The LEVERAGE toggle is the most visually prominent interactive element in Holdings. It must be immediately legible as on/off.

## **Toggle Anatomy**

* Label: 'LEVERAGE' in Badge Text style (Inter 600, 11px, uppercase, tracked)

* Toggle switch: 32px wide × 18px tall. Thumb: 14px circle.

* Toggle sits to the right of the label in the position group header row

## **Toggle States**

| State | Background | Border / Outline | Text / Icon |
| :---- | :---- | :---- | :---- |
| **Off — default** | `#E5E7EB (track)` | `none` | thumb: \#FFFFFF. Label: \#9CA3AF |
| **On — active** | `#111111 (track)` | `none` | thumb: \#FFFFFF. Label: \#111111, bold |
| **On — hover** | `#374151 (track)` | `none` | thumb: \#FFFFFF. Label: \#111111 |
| **Off — hover** | `#D1D5DB (track)` | `none` | thumb: \#FFFFFF. Label: \#9CA3AF |
| **Focus** | `current state` | `2px solid #111111, 2px offset on track` | no change |
| **Disabled (locked)** | `#E5E7EB (track)` | `none` | thumb: \#E5E7EB. Label: \#E5E7EB, cursor: not-allowed |

## **Toggle Rules**

* Toggle transition: track background and thumb position animate over 150ms ease

* Toggle fires computeTop11 immediately on change — no confirm step

* When matchday is locked (is\_locked \= true): all LEVERAGE toggles are disabled — cursor: not-allowed

* Toggle state persists in Supabase (Squad.leverage\_\[sector\]\_active) — survives refresh

# **10\. Badges**

## **Value Signal Badges — UNDERVALUED / FAIR / OVERVALUED**

* Structure: filled dot (8px circle) \+ text label, inline, 8px gap between dot and text

* Font: Badge Text style (Inter 600, 11px, uppercase, tracked)

* No border, no background fill on the badge container — dot \+ text only

| State | Background | Border / Outline | Text / Icon |
| :---- | :---- | :---- | :---- |
| **UNDERVALUED** | `dot: #15803D` | `none` | text: \#15803D. Label: 'Undervalued' |
| **FAIR** | `dot: #9CA3AF` | `none` | text: \#9CA3AF. Label: 'Fair' |
| **OVERVALUED** | `dot: #D3010C` | `none` | text: \#D3010C. Label: 'Overvalued' |

* WCAG AA compliance: dot \+ text label is always paired — color alone is never the only indicator

* Badge sits in the rightmost position of a player row, after all stat values

* Badge does not appear for GK players — GK benchmark signal is not shown in MVP

## **Position Badges**

* Structure: text only, no border, no background in player rows

* In position group headers: uppercase label, Section Header style

* In player detail panel: small pill — 4px border radius, 6px vertical padding, 12px horizontal

* GK: bg \#F9FAFB, text \#111111. DEF: same. MID: same. FWD: same.

* No color differentiation by position — all position badges are identical in color

## **Star Badge — Sector Star Designation**

* Icon: star outline (☆) when not designated. Star filled (★) when designated.

* Size: 16px. Sits left of player name in Holdings rows.

* Inactive: \#E5E7EB. Active: \#111111. Hover on inactive: \#9CA3AF.

* Click designates as sector star — clicking an already-active star removes designation

* Transition: fill color 100ms ease

## **x1.5 Multiplier Badge — Output XI Panel Only**

* Structure: text 'x1.5' in a small pill. Background: \#111111. Text: \#FFFFFF. Font: Inter 700, 11px.

* Border radius: 4px. Padding: 2px 6px.

* Appears on ONE player per sector in Output XI — never on all players in a sector

* Only visible in Output XI panel — never appears in Holdings list or Market terminal

## **WASTED LEVERAGE Warning**

* Not a badge — it is a text label that appears under the position group header

* Text: 'WASTED LEVERAGE — \[Player Name\] is not in your Top 11'

* Font: Inter 600, 11px, uppercase. Color: \#D3010C.

* Only appears when: leverage toggle is ON and designated star is not in the Top 11

* Disappears immediately when condition is resolved (star enters Top 11 or toggle turned off)

# **11\. Player Rows — Holdings**

Player rows are the most repeated element in the app. Consistency is critical.

## **Row Anatomy (Left to Right)**

* 16px — left padding

* Star icon (16px) — click to designate as sector star

* 8px gap

* Player name (Body Primary, Inter 400, 14px, \#111111)

* 4px gap

* Club name (Body Secondary, Inter 400, 12px, \#9CA3AF)

* Auto flex — pushes right-side stats to edge

* Price (Stat Value, Inter 600, 14px, tabular-nums) — right-aligned

* 20px gap

* Last 5 Pts (Stat Value) — right-aligned

* 20px gap

* Rolling Yield (Stat Value) — right-aligned

* 20px gap

* Value Signal Badge — rightmost

* 16px gap

* Transfer Out button (Secondary Button, 36px height)

* 16px — right padding

## **Row States**

| State | Background | Border / Outline | Text / Icon |
| :---- | :---- | :---- | :---- |
| **Default** | `#FFFFFF` | `1px solid #E5E7EB (bottom only)` | all text at standard colors |
| **Hover** | `#F9FAFB` | `1px solid #E5E7EB (bottom only)` | Transfer Out button becomes visible if hidden |
| **Selected (Market)** | `#F9FAFB` | `2px solid #111111 (left only)` | all text at standard colors |
| **Star active** | `#FFFFFF` | `1px solid #E5E7EB` | star icon fills to \#111111 |
| **Locked matchday** | `#FFFFFF` | `1px solid #E5E7EB` | Transfer Out button disabled (grey) |

## **Row Rules**

* Row height: 48px fixed. No row ever grows taller.

* Alternate rows use \#F9FAFB background — odd rows \#FFFFFF, even rows \#F9FAFB

* No hover background on mobile — tap state is handled by press feedback only

* Transfer Out button is always visible on desktop — not hidden until hover

* On mobile: Transfer Out button collapses into a tap target on the full row

# **12\. Transfer Drawer**

The transfer drawer opens inline below the player row being transferred. It is not a modal — the page does not dim behind it.

## **Drawer Structure**

* Opens directly below the player row — pushes rows below it downward

* Background: \#FFFFFF. Border: 1px solid \#E5E7EB all around. Border radius: 0px.

* Internal padding: 16px all sides

* Width: 100% of the list panel

## **Drawer Contents**

* Header row: 'Transfer Out: \[Player Name\]' (Body Primary, bold) \+ close button (×, Ghost variant)

* Search input (full spec above) — auto-focused on open

* Replacement player list — same row format as Holdings, max 6 results visible before scroll

* On replacement player click: show selection state (2px left border \#111111) \+ yield impact preview

* Yield impact preview: 'Yield Change: \[+/-\]\[X\]' in green/red below the selected player row

* Confirm Transfer button (Primary) — only active when a replacement is selected

* Error message area: appears between list and confirm button if validation fails

## **Drawer Error States**

* Club limit breach: 'Rule Breach: Max 3 players per club (\[Club\]).' — \#D3010C, Inter 400, 12px

* Transfer limit: 'Transfer Limit Reached. 0 transfers remaining this matchday.' — \#D3010C

* Errors appear inline — drawer stays open, confirm button stays disabled while error is visible

# **13\. Output XI Panel**

Read-only. Recalculates on every trigger. No interactive elements except the panel itself being scrollable on small screens.

## **Panel Structure**

* Background: \#FFFFFF. Left border: 1px solid \#E5E7EB. No other border.

* Panel header: 'TOP 11' label (Section Header) \+ formation name (e.g. '3-5-2') right-aligned in \#9CA3AF

* Total points: large number below header. KPI Value style. 'PTS' label below in KPI Label style.

* Player list: GK → DEF → MID → FWD order. Position group labels in Section Header style.

## **Output XI Player Row**

* Simpler than Holdings rows — no star icon, no transfer button, no signal badge

* Left: player name (Body Primary) \+ club (Body Secondary, \#9CA3AF)

* Right: points this matchday (Stat Value)

* If star player with active leverage: x1.5 badge (pill) appears between name and points

* Height: 40px (slightly tighter than Holdings rows — space is at a premium in this panel)

## **Bench Section**

* Below the XI list: 'BENCH' label in Section Header style, \#9CA3AF

* 4 bench players listed in same row format as XI

* Bench rows have 50% opacity — visually subordinate to the XI

# **14\. Market Terminal**

## **Left Panel — Search & List**

* Position filter: 4 compact toggle pills — GK | DEF | MID | FWD | ALL

* Pills: height 28px, padding 0 12px, border-radius 4px. Active: \#111111 bg, \#FFFFFF text. Inactive: \#FFFFFF bg, \#9CA3AF text, \#E5E7EB border.

* Player list rows: same format as Holdings but no star icon, no transfer button

* Selected player row: 2px left border in \#111111

* Hover: \#F9FAFB background

## **Right Panel — Player Detail**

* Section: player header — name (Page Header style), club \+ position badge inline below

* Stat grid: 2-column, 3 rows. Labels in KPI Label style (\#9CA3AF, uppercase). Values in Stat Value style.

* Stats shown: Price, Season Pts, Last 5 Pts, Rolling Yield, Benchmark Yield, Value Signal

* Value Signal: full badge (dot \+ label) in its correct color

* Divider (1px, \#E5E7EB) between stat grid and charts

## **Chart Section**

* Chart title: 'PRICE TREND' / 'PERFORMANCE TREND' in KPI Label style above each chart

* Chart container: full panel width, 120px height per chart — Recharts ResponsiveContainer

* Numeric summary line below each chart: Body Secondary style, \#9CA3AF

* 16px vertical gap between the two charts

* Divider (1px, \#E5E7EB) below charts, above action buttons

## **Action Button**

* 'Transfer In' — Primary Button, full-width in panel context

* 'Already in Squad' — Disabled Primary Button, cursor: default (not not-allowed — user doesn't need to know they can't click)

# **15\. Hover & Focus States — Complete Reference**

Every interactive element must have a visible hover state on desktop and a visible focus ring for keyboard navigation. This is a complete list — no interactive element is exempt.

## **Hover States**

* Primary button: \#111111 → \#374151 background

* Secondary button: \#FFFFFF → \#F9FAFB background, border \#E5E7EB → \#9CA3AF

* Ghost button: transparent → \#F9FAFB background

* Tab (inactive): \#FFFFFF → \#F9FAFB background, text \#9CA3AF → \#111111

* Player row (Holdings): \#FFFFFF → \#F9FAFB background

* Player row (Market): \#FFFFFF → \#F9FAFB background

* Star icon (inactive): \#E5E7EB → \#9CA3AF fill

* Position filter pill (inactive): border \#E5E7EB → \#9CA3AF

* Leverage toggle track (off): \#E5E7EB → \#D1D5DB

* Leverage toggle track (on): \#111111 → \#374151

* Input field (unfocused): border \#E5E7EB → \#9CA3AF, background → \#F9FAFB

* Transition on all hover states: 150ms ease. No other transition durations in the product.

## **Focus States**

* All focus rings: 2px solid \#111111, 2px offset (outline-offset-2)

* Focus ring applies to: all buttons, all inputs, all toggles, all tabs, star icons, position pills

* Focus ring must be visible against both white and grey backgrounds — \#111111 ensures this

* Tab order: KPI band → Tab bar → main content (top to bottom, left to right within sections)

* No element removes outline on focus — outline: none is never used anywhere

# **16\. Loading, Empty & Error States**

## **Loading States**

* Skeleton loaders: grey shimmer (\#E5E7EB → \#F9FAFB, 1.5s ease-in-out infinite) on text and number placeholders

* Use skeleton loaders on: KPI band values, player list rows, chart area, stat grid in player detail

* Spinner (16px, \#111111, 1 revolution/second): used only inside buttons during async operations

* No full-page loading state — skeleton loaders provide progressive rendering

## **Empty States**

* Empty squad (new user): body of Holdings list shows centered text — 'Your squad is empty. Go to Market to add players.' in Body Secondary style

* No search results: 'No players match your search.' in Body Secondary style, centered in list panel

* No player selected (Market): right panel shows centered placeholder — 'Select a player to view details.' in Body Secondary, \#9CA3AF

## **Error States**

* Inline validation errors: Inter 400, 12px, \#D3010C. Appear directly below the element that caused the error.

* No full-page error screens in MVP — if a data fetch fails, show the empty state copy with an additional line: 'Try refreshing the page.'

* Never show a generic 'Something went wrong' — always explain what failed in plain language

# **17\. Iconography**

* Icon library: Lucide React (already available in the Lovable stack)

* Standard icon size: 16px for inline icons, 20px for standalone action icons

* Icon color: inherit from text color context — never hardcoded independently

* Search: 'Search' icon from Lucide (magnifying glass)

* Clear input: 'X' icon from Lucide

* Star designation: 'Star' icon from Lucide — outline when inactive, filled when active

* Close drawer: 'X' icon from Lucide

* No custom SVGs, no emoji icons, no external icon CDN

| ⚠️  NEVER: Do not use any icon library other than Lucide React. Do not use emoji as UI icons. Phosphor, Heroicons, Font Awesome, and Material Icons are not permitted. |
| :---- |

# **18\. Mobile-Specific Rules**

* KPI band on mobile: 2×2 grid, 2 tiles per row, 48px height per row (96px total)

* Tab bar on mobile: full width, tabs spread equally, label only (no icon)

* Player rows on mobile: Transfer Out button is hidden — full row tap opens action sheet

* Action sheet on mobile: bottom sheet with options: 'Transfer Out' and 'Designate as Star'

* Market terminal on mobile: list only — tapping a player opens full-screen player detail

* Full-screen player detail on mobile: back button (← Back) top left, same content as desktop panel

* Output XI on mobile: hidden by default behind 'View XI' floating action button (bottom right, \#111111 bg)

* No hover states on touch — tap states only (press opacity: 0.85, 100ms)

# **19\. Design Anti-Patterns — Never Build These**

| ⚠️  NEVER: Rounded corners (border-radius) greater than 4px on any data element. Player rows, stat tiles, and table cells are square-cornered. |
| :---- |

| ⚠️  NEVER: Drop shadows on flat, non-floating elements. Shadows are permitted only on dropdowns and mobile bottom sheets. |
| :---- |

| ⚠️  NEVER: Gradient backgrounds on any surface, tile, or button. |
| :---- |

| ⚠️  NEVER: Animations longer than 200ms on any interactive element. This is an analytics tool — motion should never distract. |
| :---- |

| ⚠️  NEVER: Color used as the only differentiator. Every colored element must have a paired label, icon, or text indicator for accessibility. |
| :---- |

| ⚠️  NEVER: Chart tooltips, gridlines, or legends. These are explicitly excluded per Gap \#6 and \#7 resolutions. |
| :---- |

| ⚠️  NEVER: Any font other than Inter for UI text. No system fonts, no Google Fonts alternatives. |
| :---- |

| ⚠️  NEVER: Gamification elements: trophies, streaks, level indicators, animated celebrations, confetti. Spieltag is a terminal. |
| :---- |

Spieltag — Design Guidelines v2.0 — Confidential Internal Document
