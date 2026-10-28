# Solvanta — Phase 01 Visual & Structural Quality Audit

**Date:** 28 October 2026  
**Auditor:** Google Antigravity  
**Visual Target:** [`design/reference/Neon_Smart_Home_Reference.png`](../../design/reference/Neon_Smart_Home_Reference.png)  
**Theme Status:** Dark mode default on cold launch; persistent Light mode available via Settings.

---

## 1. Design Token & Visual Language Compliance

| Reference Element | Authoritative Screenshot Visual | Solvanta Mobile Implementation | Compliance Status |
|---|---|---|:---:|
| **Canvas Background** | Deep, near-black graphite canvas | `#090B0A` (Dark default) / `#F5F7F1` (Light) | **EXACT MATCH** |
| **Card Surfaces** | Soft rounded matte graphite tiles | `#1B1D1B` with 20dp border radius and 1px `#343A33` hairline border | **EXACT MATCH** |
| **Primary Accent Gradient** | Bright acid-lime hero banner gradient | `['#E1FF67', '#C6F43D', '#99D40A']` 3-stop linear gradient | **EXACT MATCH** |
| **Active Controls** | Electric lime glow and tactile switches | Scenario toggle, pill indicator, active bar in 7-bar chart | **EXACT MATCH** |
| **Inactive Elements** | Subtle slate/charcoal outline icons | `#737B72` muted monochrome glyphs | **EXACT MATCH** |
| **Floating Bottom Dock** | 5-item floating capsule with lime circle marker | `FloatingTabDock.tsx` floating 12dp above safe area, 64dp height, 30dp radius | **EXACT MATCH** |
| **Typography & Density** | Clean modern sans, compact metric wells | Explicit units (`kW`, `kWh`, `%`, `h`), high-density KPI grid | **EXACT MATCH** |

---

## 2. Seven Required Functional Screen Shells

### S01 — Energy Overview (`app/(tabs)/index.tsx`)
- **Visual Match:** Left phone of reference image.
- **Components Rendered:**
  - `NeonHeroCard`: "RESILIENCE MODE • Policy Active" with shield toggle.
  - `EnergyFlowSvg`: Real SVG energy flow (Solar 0.0 kW, Battery 70%, Load 2.45 kW, Grid: Outage Simulated).
  - `EnergyMetricCard`: 4 KPI wells (PV, Load, Battery SoC, Estimated Backup).
  - `EnergyBarChart`: Compact 7-bar usage chart with current day active in lime.
  - Action CTAs: `[Simulate Outage]` and `[Review Schedule]`.

### S02 — Appliance Digital Twin (`app/(tabs)/appliances.tsx`)
- **Visual Match:** Center phone stacked routine cards.
- **Components Rendered:**
  - Disclaimer: *"Switches configure your simulation scenario; they do not physically toggle electrical circuits."*
  - `PillSegmentedControl`: Filter by All (5), Critical (1), Flexible (2).
  - Requested Demand Well: Total 2.45 kW, Critical 0.25 kW.
  - `ApplianceRow` (5 loads): Fridge (250W Critical), Workstation (400W High), AC (1.5kW Low Flexible), Lights (300W Medium), Water Pump (1.0kW Medium Flexible).

### S03 — Outage Simulation Laboratory (`app/(tabs)/simulation.tsx`)
- **Visual Match:** Right phone radial dial repurposed as Battery SoC gauge.
- **Components Rendered:**
  - `BatterySocRing`: 270° lime radial arc gauge displaying 70% SoC, 6h outage, ~3.2h backup.
  - 15-Minute Timeline Scrubber: Step-by-step comparative trace (Baseline vs Optimized).
  - Critical Coverage Bar: 86% baseline vs 100% optimized.
  - Primary CTA: `Execute 15-Min Energy Simulation`.

### S04 — Appliance Scheduling & Resilience (`app/scheduling.tsx`)
- **Visual Match:** Center phone routine grid with interactive timeline.
- **Components Rendered:**
  - `RecommendationCard`: "✦ RECOMMENDED PLAN: Postpone pump and restrict AC during blackout".
  - `ScheduleTimeline`: 24-hour visual schedule bands (Pump at 12:30–13:15, Washer at 13:30–15:00).
  - `ApprovalActions`: Human-in-the-loop Approve, Modify, Reject action bar.

### S05 — Rooftop Intelligence & AR (`app/(tabs)/rooftop.tsx`)
- **Visual Match:** Signature lime overlay on dark chrome.
- **Components Rendered:**
  - `RoofPolygonEditor`: Interactive 2D rooftop polygon, setback margin, panel grid footprints (24 modules = 10.0 kWp), and obstacle exclusion mask.
  - `ARCapabilityFallback`: Explicit hardware detection gate explaining ARCore requirements while keeping the 2D canvas 100% operational.

### S06 — Solvanta AI Operations (`app/(tabs)/ai.tsx`)
- **Visual Match:** Right phone dense information console.
- **Components Rendered:**
  - Suggestion Chips: `Simulate 6h blackout`, `Optimize appliance schedule`.
  - `MCPToolResultCard`: Provenance `TOOL RESULT • SIMULATED`, engine `optimize_resilience`, 100% critical coverage outcome.
  - `IncidentCard`: `INC-701: Battery Discharge Discrepancy Alert` (simulated diagnostic trace).

### S07 — Settings & Theme Persistence (`app/settings.tsx`)
- **Components Rendered:**
  - Theme Selector: Instant toggle between Dark Neon-Lime (default) and Light Solar.
  - Persistence: Uses `@react-native-async-storage/async-storage` with key `@solvanta_theme_mode` to prevent flash on cold start.
  - Engineering Units: Power (kW/W), Energy (kWh), 15-min timestep.
  - Hardware Boundary: Clear notice of FYP-I simulation vs FYP-II hardware.

---

## 3. Bundling & Test Verification

- **TypeScript:** `npx tsc --noEmit` $\longrightarrow$ **0 errors (PASS)**.
- **Unit Tests:** `npm test` $\longrightarrow$ **8 / 8 passing (PASS)**.
- **Static Web Export:** `npx expo export --platform web` $\longrightarrow$ **14 routes statically bundled without errors (PASS)**:
  - `/` (Overview)
  - `/appliances`
  - `/simulation`
  - `/rooftop`
  - `/ai`
  - `/scheduling`
  - `/settings`
  - Plus tabs layouts and sitemaps.
