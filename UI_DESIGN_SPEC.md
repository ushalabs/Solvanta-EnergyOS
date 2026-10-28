# SOLVANTA — MOBILE UI/UX DESIGN SYSTEM & SCREEN ACCEPTANCE SPECIFICATION

**Version:** 2.0 · **Date:** 28 October 2026 · **Platform:** React Native / Expo / TypeScript · **Default appearance:** Dark neon-lime · **Alternative:** Light mode · **Audience:** Antigravity, GPT reviewer, project team.

> This file is implementation guidance, not a substitute for functioning engineering services. Screens must accurately show whether data are `SIMULATED`, `FORECAST`, or `LIVE`; FYP-I must not label synthetic readings as real household telemetry.

## 0. The visual references are binding

1. **PRIMARY visual reference:** [`design/reference/Neon_Smart_Home_Reference.png`](design/reference/Neon_Smart_Home_Reference.png), the exact three-phone image supplied by the user. **Treat this as the visual source of truth** for background tones, lime-gradient treatments, soft rounded dark cards, icon-button style, data density, vertical spacing, switches, bar charts, thermostat-like radial data visuals, and floating nav docking.
2. **Solvanta-original screen concepts:** [`design/Solvanta_Six_Screen_Mockups.png`](design/Solvanta_Six_Screen_Mockups.png). Use as visual composition guidance, **not** literal or technically authoritative readings. Recreate screens with real native React Native components and backend-backed data.
3. Do **not** merely paste or display a static screenshot within the app. Code original components that convincingly match the reference's visual language. Do not reproduce unrelated smart-home features such as physical AC thermostat control; transform components to Solvanta's actual energy workflow.
4. The image's device frames, status bar, camera cutouts and fake iPhone hardware are **mockup framing only**, not part of the app UI. Let Android and iOS render their own system UI and respect safe areas.
5. No generic gradient-purple SaaS dashboard, pale-blue corporate cards, Tailwind web clone, full-screen glows, random mixed icon packs, oversized gutters, excessive empty card stacks or default React Native starter layout.

## 1. Design intent

**Words:** premium, futuristic, restrained, tactile, neon-lime, near-black, polished smart home, precision instrument.

### 1.1 Color system (reference-matched design targets)

These are implementation starting tokens sampled/visually approximated to match the supplied photo. Fine-tune against that actual image via screenshot review, not guessing from the generated mockup:

| Token | Dark default | Light counterpart | Rules |
|---|---|---|---|
| `background` | `#090B0A` | `#F5F7F1` | Full canvas; near-black, not navy |
| `backgroundRaised` | `#121513` | `#EAEEE7` | Scrolling sections/floating dock |
| `surface` | `#1B1D1B` | `#FFFFFF` | Cards like the original reference |
| `surfaceElevated` | `#262927` | `#F0F3ED` | Chips, stat wells, selected rows |
| `border` | `#343A33` | `#DCE3D7` | Low-contrast thin outlines |
| `textPrimary` | `#F7F8F5` | `#1A2019` | Main text |
| `textSecondary` | `#A6ADA4` | `#5C685D` | Subtitles / supporting labels |
| `textMuted` | `#737B72` | `#859182` | Quiet labels, not critical data |
| `lime` | `#C6F43D` | `#9CCC17` | Active/focus state, primary actions |
| `limeBright` | `#E1FF67` | `#B8E436` | Gradient highlight |
| `limeDeep` | `#99D40A` | `#7FAB00` | Gradient depth |
| `onLime` | `#182107` | `#142008` | Text/icons on neon lime |
| `cyan` | `#28CEDB` | `#087E91` | Grid / comparison / alternative series |
| `amber` | `#F9BC46` | `#B36D00` | Warnings and generator power |
| `red` | `#FF626A` | `#B93646` | Faults, unmet critical demand |
| `green` | `#4DE1A2` | `#14835A` | Positive verification/status |

**Signature gradient:** diagonal top-left `limeBright` → `lime` → `limeDeep` for the primary hero banner, active routine tile, large CTA and selected ring elements. Typical example `['#E1FF67','#C6F43D','#99D40A']`. Prefer `expo-linear-gradient` if compatible. Avoid gradients behind every card.

**Reference caveat:** These hex values are chosen to *reproduce the look* of the image, not asserted as the source image's original design tokens. Compare real screenshots visually and refine.

### 1.2 Typography & component specifications

- Typeface: `Inter` or a similarly clean modern sans family via Expo-compatible font loading. Match reference's modern high-x-height typography; bold only the important values.
- Headings: 22–26sp, medium/semibold; section titles 15–17sp; cards 13–15sp; numeric KPIs 24–30sp; micro label 10–12sp only when accessible.
- Text line height 1.2–1.45× font; never truncate key units or control meanings.
- Page horizontal padding 16–18dp; card inner padding 14–17dp; vertical rhythm 8/12/16/20/24; card radius 18–22dp; chips radius 99; buttons 14–17dp.
- Touch targets **at least 44×44dp** including icon-only elements; accessible labels on every icon and toggle.
- Cards primarily matte graphite; subtle 1px border; very soft depth, not bright outer shadows.
- Active tabs and controls appear luminous lime; inactive ones charcoal. Hover is not a primary mobile interaction.
- Battery, PV and load metrics use **units**, e.g. `kW`, `kWh`, `%`, `h`; distinguish power from energy.
- Any animated energy flows are subtle, controllable and respect reduced-motion preference.

### 1.3 Floating bottom tab bar — mandatory

Use a custom Expo Router tab presentation with **floating dock** resembling the reference photo:
- 5 primary destinations in this order: **Home, Appliances, Simulation, Rooftop, AI**.
- Scheduling is a prominent sub-screen inside Simulation and can also be reached from a Home shortcut. Settings is reached from avatar/top-right overflow.
- Dock capsule: dark `#1B1D1B`, 60–68dp high, horizontal margin 14–18dp, bottom above safe area by 10–16dp, radius 28–32dp, hairline border, modest inset shadow. The dock must not cover content: supply scroll bottom inset/padding.
- Selected tab: vivid lime circular/pill indicator, dark glyph; inactive tabs monochrome light gray. Light mode: white dock + subtle border; same active-lime concept.
- Icons: coherent line-icon set (Lucide for React Native or equivalent). Active state can use filled shape where the exact line icon doesn't communicate selection.
- Tab labels: accessible, and optionally show short text only for selected item if width permits. Match screenshot's compact clean density.

### 1.4 Dark/Light Settings

**Initial value:** `dark`. Must not silently follow phone system preference on first launch. Settings → `Appearance`: `Dark` (default), `Light` (user selected), optionally `System` (only if correctly implemented; first-load default remains dark).
- Persist choice on device, apply instantaneously across all app routes, charts, gradients, status bar, nav dock, modals, AR controls and SVGs.
- No flicker on cold start; load saved appearance before exposing the interface if possible.
- In light mode preserve all spacing, hierarchy, icons and layout; don't reverse colors naively. Contrast must pass practical readability checks.
- User preference for appearance is separate from energy simulation `mode` (Simulated vs Live).

## 2. Seven required mobile screens — detailed design and functional behavior

### S01 — Energy Overview (Home)

**Visual reference:** left phone's bright lime `Energy mode` banner + compact usage stats and seven-bar chart. The image's overall light-dark balance and card density are the target.

```text
┌─────────────────────────────────────┐
│  ◢ SOLVANTA      Home ▾       ◯⚙   │
│  SIMULATED • Last scenario: 20:00   │
│ ┌─────────────────────────────────┐ │
│ │ RESILIENCE MODE          ● ON  │ │ ← lime hero gradient
│ │ Critical loads protected       │ │
│ └─────────────────────────────────┘ │
│ ┌─────────────────────────────────┐ │
│ │      HOME ENERGY FLOW          │ │
│ │   Solar ──→ Home ←── Battery   │ │ ← original animated SVG flow
│ │             Grid               │ │
│ └─────────────────────────────────┘ │
│  [PV 0.0 kW] [Load 2.4 kW]         │
│  [Battery 70%] [Backup est. 3.2h]  │
│ ┌─────────────────────────────────┐ │
│ │ Usage history           Week ▾ │ │
│ │  ▇   ▅   ▆   █   ▇   ▃   ▆    │ │
│ └─────────────────────────────────┘ │
│  [Simulate outage] [Review plan]   │
│      ◖ HOME  APPL  SIM  ROOF AI ◗  │ ← floating dock
└─────────────────────────────────────┘
```

- Metrics and energy flows from real simulation results or persisted fixtures only; always display `SIMULATED` until FYP-II adapter genuinely connected.
- Do not use a fake instant “LIVE” badge or invented current weather. Display `Not connected` if data missing.
- CTA opens saved scenario; alarm opens incident detail; battery card opens trajectory.
- The lime hero is a **policy preview/active simulation mode**, not an electrically actuated home switch.

### S02 — Appliance Digital Twin

**Visual reference:** center phone's stacked dark routine tiles; active card lime, inactive tiles neutral. Use original photo's compact two-column/stacked tile language for appliance badges and condition cards.

```text
┌─────────────────────────────────────┐
│  ←  Appliances          + Add      │
│  Your saved loads • Scenario state │
│  [All] [Critical] [Flexible] [...]  │
│ ┌─────────────────────────────────┐ │
│ │ ❄ Refrigerator  250W  CRITICAL│●│ │
│ ├─────────────────────────────────┤ │
│ │ 💻 Computer      400W  HIGH   │●│ │
│ ├─────────────────────────────────┤ │
│ │ ◌ Air conditioner 1.5kW LOW   │○│ │
│ ├─────────────────────────────────┤ │
│ │ 💧 Water pump  1.0kW FLEXIBLE │○│ │
│ └─────────────────────────────────┘ │
│  Demand requested: 0.65 kW         │
│ ┌─────────────────────────────────┐ │
│ │ Manage priority / runtime /    │ │
│ │ schedule window / interruption │ │
│ └─────────────────────────────────┘ │
│    [+ Add appliance]  lime CTA     │
│      ◖ HOME  APPL  SIM  ROOF AI ◗  │
└─────────────────────────────────────┘
```

- Toggle semantics are strictly **scenario ON/OFF**, never a physical smart-home device toggle; show a small info explanation near list heading.
- Form fields: rated W, user-estimated actual W optional, priority critical/high/medium/low, flexible yes/no, runtime min, deadline/window, max interruption, cannot interrupt flag.
- Saved appliance profile persists; scenario selection is a separate data record.
- Invalid/infeasible constraints prompt user-friendly validation, not silent correction.

### S03 — Outage Simulation Laboratory

**Visual reference:** right phone's large neon semicircular ring and stat clusters. Reinterpret radial component as projected battery SoC or critical-load coverage; **never as AC thermostat**.

```text
┌─────────────────────────────────────┐
│  ← Simulation Lab                   │
│  [Baseline] [Outage●] [What-if]     │
│ ┌─────────────────────────────────┐ │
│ │       6-hour outage            │ │
│ │          ◜ 70% ◝              │ │ ← large lime SoC gauge
│ │      Initial Battery SoC       │ │
│ └─────────────────────────────────┘ │
│  PV [0.0 kW] | Load [2.4 kW]      │
│ ┌─────────────────────────────────┐ │
│ │ SoC timeline    Baseline / Opt │ │
│ │ 100%╲_                         │ │
│ │  20%  ╲________               │ │
│ └─────────────────────────────────┘ │
│  Critical Coverage  ▉▉▉▉▉   86%    │
│  [ Run simulation ] lime CTA       │
│      ◖ HOME  APPL  SIM  ROOF AI ◗  │
└─────────────────────────────────────┘
```

- User chooses outage times, initial SoC, source availability, forecast source and active appliance states.
- User can choose baseline/optimized side-by-side **under same assumptions**; evidence for unserved demand and battery energy balance.
- Time slider / start-pause-step replay of a true time-indexed result; clear units/labels/legend; warnings when physically infeasible.
- Primary CTA runs actual FastAPI simulation; show progress/timeout/errors honestly.

### S04 — Appliance Scheduling & Resilience Plan

**Visual reference:** center screen's routine grid, bright neon selected tile and dark compact cards, with an interactive timeline.

```text
┌─────────────────────────────────────┐
│  ← Scheduling         Tomorrow ▾   │
│  [Manual]       [Optimized ●]       │
│  06  09  12  15  18  21  24       │
│  Pump      ▬▬▬                   │
│  Washer          ▬▬▬             │
│  AC                        ▬     │
│ ┌─────────────────────────────────┐ │
│ │ ✦ RECOMMENDED PLAN            │ │ ← lime hero tile
│ │ Postpone pump until solar peak │ │
│ │ Estimated critical coverage ↑  │ │
│ └─────────────────────────────────┘ │
│  Water pump   12:30–13:00         │
│  AC           Restricted 19–23    │
│  Fridge       Maintain service    │
│  [Approve] [Modify] [Reject]       │
│      ◖ HOME  APPL  SIM  ROOF AI ◗  │
└─────────────────────────────────────┘
```

- All schedules and comparisons originate in optimizer; if not feasible, show constraints conflict.
- Approval creates persistent auditable state; FYP-I `apply` means **run revised simulation**, not switch equipment.
- No bogus claims of achieved savings. Use "estimated" for future outcomes.

### S05 — Rooftop Intelligence & AR

**Visual reference:** signature lime highlighted card and black chrome. Main content uses an actual site image or realistic user-supplied roof photograph with native shape/panel overlay.

```text
┌─────────────────────────────────────┐
│  ← Rooftop Studio      Save       │
│  [Image] [Layout●] [AR Preview]     │
│ ┌─────────────────────────────────┐ │
│ │  ROOF IMAGE                    │ │
│ │   ┌───────────┐                │ │
│ │   │▣ ▣ ▣ ▣ ▣  │ ← panels       │ │
│ │   │▣ ▣ ▣ ▣ ▣  │  lime outline  │ │
│ │   └─────○─────┘  obstacle      │ │
│ └─────────────────────────────────┘ │
│  Usable area  | Panels | kWp       │
│  [Adjust corners] [Define scale]   │
│  [ Preview in AR ] lime CTA        │
│      ◖ HOME  APPL  SIM  ROOF AI ◗  │
└─────────────────────────────────────┘
```

- Roof polygon and obstacles must be editable; physical scale comes from verified measurement or explicit user input, never guessed from camera pixels.
- Manual 2D/image preview **works on every supported mobile device**.
- Native AR is capability-gated: custom development client, ARCore/ARKit supported hardware, permissions and visible fallback. AR is visualization, not certified placement.
- PV capacity feeds energy simulator only after a validated configuration is saved.

### S06 — Solvanta AI & Operations

**Visual reference:** right phone's dense dark information cards and glowing neon action; style the assistant as a clean energy operations console, *not* a generic chatbot clone.

```text
┌─────────────────────────────────────┐
│  ← Solvanta AI            History   │
│ ┌─────────────────────────────────┐ │
│ │ How can I help your energy plan?│ │
│ └─────────────────────────────────┘ │
│ [Simulate 6h outage]                │
│ [Optimize appliance schedule]       │
│ [Compare battery upgrades]          │
│ ┌─────────────────────────────────┐ │
│ │ TOOL RESULT • SIMULATED        │ │
│ │ Engine: optimize_resilience    │ │
│ │ Critical coverage: ...        │ │
│ │ [View plan] [Review evidence]   │ │
│ └─────────────────────────────────┘ │
│  [Type question...]        (→)     │
│      ◖ HOME  APPL  SIM  ROOF AI ◗  │
└─────────────────────────────────────┘
```

- Mobile communicates with an authorized FastAPI assistant gateway; it doesn't hold raw LLM/API/MCP service secrets.
- MCP calls return typed, verified engine results with units and scenario ID. Assistant must differentiate real tool execution from general explanatory text.
- GPT/LLM **never** owns energy math, silently approves plans or operates home circuits.
- Incident detail/history shows simulated source until real FYP-II data exists.

### S07 — Settings / Appearance / Account

```text
┌─────────────────────────────────────┐
│  ← Settings                         │
│  APPEARANCE                         │
│  ◉ Dark (default)                   │
│  ○ Light                            │
│  ○ System (only if implemented)      │
│  UNITS                              │
│  Power   kW   Energy   kWh          │
│  Data mode: Simulated (FYP-I)       │
│  Notifications, privacy, account   │
└─────────────────────────────────────┘
```

- Theme choice persists; instantly styles all six core screens and floating dock. Light mode must be actually usable rather than a recolored screenshot.

## 3. Responsive behavior and mobile constraints

- Android-first, test at **360×800**, **393×852**, **412×915** CSS-equivalent dp and one smaller screen; also test text scaling and keyboard avoidance.
- Use Expo Router; `SafeAreaProvider` / safe area inset; `react-native-reanimated` only when compatible and useful; SVG via `react-native-svg` (or compatible chart library) for deterministic energy visualizations; performance-conscious `FlatList`/`FlashList` as verified.
- Use React Native primitives, *not* embedded HTML/WebView as primary UI, and no Next.js app disguised as native.
- No hard-coded absolute overlay coordinates for primary navigation; dock layout accommodates bottom insets and keyboard/scroll behavior.
- Progress, error, empty, blocked, offline, permission denied, timeouts and missing data states are required for each network-connected screen.
- WCAG-inspired accessible labels, contrast checks, larger-touch targets, reduce motion. Lime-on-white typography in light mode must not be low contrast.
- Ensure source images are user-owned/licensed; do not ship design-reference screenshot as a product asset or impersonate unrelated smart-home apps.

## 4. Components to build and reuse

`SolvantaScreen`, `NeonHeroCard`, `EnergyMetricCard`, `LimeCTA`, `PillSegmentedControl`, `FloatingTabDock`, `EnergyFlowSvg`, `BatterySocRing`, `EnergyBarChart`, `EnergyLineChart`, `ApplianceRow`, `PriorityBadge`, `ScenarioToggle`, `ScheduleTimeline`, `RecommendationCard`, `ApprovalActions`, `RoofPolygonEditor`, `RoofPanelOverlay`, `ARCapabilityFallback`, `MCPToolResultCard`, `IncidentCard`, `ThemeSelector`, `AsyncStateBoundary`.

Central theme tokens are defined once in `mobile/src/theme/tokens.ts` and consumed by all screens. Component variants must be coherent in dark and light mode; forbid hard-coded stray colors in features.

## 5. Visual quality gates per phase

1. **Screenshot comparison:** Take at least one actual Android runtime screenshot of the screen built during the phase. Compare it side-by-side with both provided references; explain differences.
2. **Style audit:** correct almost-black background, matte near-black cards, electric lime gradient, typography/spacing, compact data density, pill/ring controls, floating dock, dark default.
3. **Theme audit:** where affected, test light mode and persistence; no unreadable labels or style leaks.
4. **Function audit:** card tap, toggle, CTA, tab, form, selection, approval, input validation and API state work. Fake taps are failure.
5. **Evidence:** actual screenshot path and tested device/build in `docs/ui-evidence/`, committed if free of personal data and approved by user. If device/emulator inaccessible, mark blocked; do not counterfeit images as device screenshots.

## 6. Toolchain compatibility note (28 Oct 2026)

Expo SDK 58 shipped on **15 Oct 2026**, but ViroReact's published Expo integration guide documents tested support up through **SDK 57** and currently indicates peer ranges below SDK 58. This creates a real dependency constraint, not a reason to pretend AR works. Before choosing the Expo SDK, run a small **AR compatibility spike**:

- Compare stable SDK 57 + published ViroReact supported version versus SDK 58 + actual verified compatibility.
- Prefer a coherent native build over chasing newest dependencies; pin exact verified versions in the lockfile.
- AR requires a native dev build, **not Expo Go**.
- If physical AR cannot be tested, retain the complete 2D rooftop layout workflow, record blocked native AR separately and request user direction—never claim tested native AR.

Official documentation:
- https://expo.dev/changelog/sdk-58
- https://viro-community.readme.io/docs/integrating-with-expo
- https://docs.expo.dev/router/introduction/

## 7. Visual acceptance checklist

- [ ] Reference image committed unmodified in `design/reference/`.
- [ ] Six real React Native screens use the same near-black/neon-lime visual system.
- [ ] Floating bottom dock is present and functional on all main screens.
- [ ] S01–S06 have real domain interactions and service integration (or explicitly labeled mock fixture during early UI phase).
- [ ] Settings exposes Light mode; Dark is first-launch default; user choice persists.
- [ ] Active/on states use lime gradients; others use graphite.
- [ ] Charts, battery gauge and energy flow encode truthful simulation data with units.
- [ ] Rooftop panel placement is interactive; AR unavailable fallback honest and functional.
- [ ] No generic web dashboard, no fake realtime values, no unnecessary smart-home physical control claims.
- [ ] Device screenshots and navigation/theme test results available for review.

**End of UI specification.**
