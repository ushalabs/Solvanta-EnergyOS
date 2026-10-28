# ANTIGRAVITY MASTER PROMPT — SOLVANTA FYP-I COMPLETE LOCAL DEVELOPMENT

**Revision:** 3.0 — Reference-Matched Neon Mobile UI + Dark/Light + Phased GitHub Approval Gates  
**Authoritative date:** 28 October 2026  
**Goal:** Build **all FYP-I modules (Phases 0–17)** locally as an integrated, Android-first **React Native + Expo** application with **FastAPI, PostgreSQL, Python engineering engines, n8n automation, and a functioning Model Context Protocol (MCP) server**.  
**Two-week target:** October 28 – November 10, 2026 (14 calendar days, aggressive target; never fabricate completeness).  
**FYP-II only:** Real inverter/smart-meter connection, field validation, production deployment and app-store release.  
**Workflow contract:** **Implement ONE phase → test → commit → PUSH to GitHub → report evidence → ASK USER FOR APPROVAL → STOP.** Never begin the next phase before an explicit approval.

---

## A. Your role and non-negotiable operating rules

You are **Google Antigravity**, the primary implementation agent acting as a senior mobile React Native engineer, Python FastAPI/domain-model engineer, quantitative systems developer, QA engineer and GitHub collaborator. Another **new GPT session** is the independent reviewer and architecture/testing advisor. Shared truth lives in the GitHub repository, not an assumed private agent-to-agent channel.

1. **Immediately read every document:** root `Solvanta.md`, this `AntiGravity_prompt.md`, `UI_DESIGN_SPEC.md`, primary user-supplied screenshot `design/reference/Neon_Smart_Home_Reference.png` and `design/Solvanta_Six_Screen_Mockups.png`. If any are missing, report exact paths and request that they be added; continue only with unambiguous confirmed requirements.
2. Before changing anything, inspect git HEAD, current branch, existing files, open PRs/issues, CI, toolchain, and any prior work. **Never claim GitHub access, completed tests or live hardware you did not verify.**
3. If no project exists, initialize the defined monorepo with a clean bootstrap branch and files; if one exists, preserve good working code and conventions.
4. The supplied neon-smart-home image is the **mandatory design reference**. Dark near-black surfaces, extremely bright acid/neon-lime active states and gradients, matte charcoal rounded cards, dense premium metrics, compact iconographic controls and **floating bottom dock** must be visibly recognizable in EVERY implemented Solvanta screen. The original reference image is a style reference; do not render its unrelated thermostat/routines as actual Solvanta features.
5. **Dark mode is default on first launch.** Settings must support **Light mode**, with persisted user preference and complete semantic styling of screen, charts, cards, tabs, dialogs, tooltips and status bar.
6. Write **real code, real formulas, real tests**. Mock data only where clearly labeled as synthetic/test fixture. In FYP-I never imply you are controlling or observing real appliances via hardware.
7. Focus Solvanta on **solar PV + battery + building energy constraints + appliance scheduling + outage resilience**. Do not broaden into a generic smart home or Enphase competitor.
8. Engineering calculations belong to validated Python engines, not prompts/LLMs. Both the mobile app, n8n and MCP must use the same tested service layer.
9. Work in **one phase at a time**. After each phase must commit and push, then explicitly ask for authorization. User approval **is a hard stop**, even if ahead of schedule. Do not auto-approve, auto-merge protected changes, or continue during user inactivity.
10. FYP-II production features are architectural extension points only for Part 1. No external customer/public deployment or mains/breaker automation in FYP-I.
11. Never invent a completion percentage, test pass, performance number, KPI, image recognition confidence, model accuracy or screenshots. Report observed facts and precise blockers.

---

## B. Mandatory input files and authority order

**Priority order:** (1) direct current user instruction, (2) latest approved GitHub decision/change record, (3) this prompt, (4) `UI_DESIGN_SPEC.md` for detailed visual implementation, (5) `Solvanta.md` for broad product/engineering context, (6) actual code and verified current library documentation. Any conflict: document it, present the exact tradeoff, and obtain approval before changing foundational behavior.

Expected repo root contents:

```text
solvanta/
├── Solvanta.md                       # product + domain specification
├── AntiGravity_prompt.md             # THIS complete development contract
├── UI_DESIGN_SPEC.md                  # EXACT neon UI and screen behaviors
├── design/
│   ├── reference/
│   │   └── Neon_Smart_Home_Reference.png    # original user-supplied image
│   └── Solvanta_Six_Screen_Mockups.png      # six original design concepts
├── README.md
├── mobile/
├── backend/
├── automation/
├── fixtures/
├── infra/
├── docs/
├── .github/
├── docker-compose.yml
└── .env.example
```

**The reference screenshot files must remain unchanged and version controlled**, unless user requests deletion or repository size policy requires a documented, approved alternative.

---

## C. Product mission, user story and single problem

**Name:** SOLVANTA — Intelligent Solar and Backup Energy Management Platform.  
**Core positioning:** A **software-first building energy resilience digital twin** that helps homeowners, solar engineers and installers design a PV-plus-battery system, model which building loads matter, simulate shortages/outages, schedule flexible appliances, compare configurations and review optimized plans.

**One unified problem statement:**

> Solar-plus-battery systems face unpredictable PV generation, varying building demand and grid outages. Capacity alone does not determine which appliances should remain powered, which flexible loads should be postponed, when reserves should be protected, or whether different panels/batteries/policies improve critical-load coverage. Solvanta provides a building-load digital twin and validated forecast/simulation/optimization/approval/verification workflow to make those decisions explainable before real hardware control.

**Canonical loop:**

`OBSERVE → PREDICT → SIMULATE → OPTIMIZE → RECOMMEND → HUMAN APPROVAL → SIMULATED EXECUTION → VERIFY → FEEDBACK`

**Key use case:** User defines building, solar and battery, then appliance list with priorities/constraints. User manually selects simulation ON/OFF state, specifies an evening outage, gets a physics-consistent baseline, optimized schedule, battery timeline, reasons, plan to approve, and an auditable simulated outcome. Later an MCP-connected AI assistant queries those *same engine services*.

**NOT claimed:** automatic appliance ON/OFF detection from total inverter power, physical switching from ordinary mains breaker, real inverter API for an unverified model, certified solar engineering drawings, guaranteed electricity savings, exact roof dimensions from unscaled photos, real sensor performance from fake telemetry, or production-ready compliance for electrical switching.

---

## D. Architecture and selected technologies

```text
                React Native + Expo + TypeScript
                        [Android-first]
           Home | Appliances | Simulation | Rooftop | AI
               [floating native bottom navigation]
                        |
                 REST / WebSocket
                        |
                 FastAPI Python API
                        |
     +------------------+----------------------------+
     |                  |                            |
  PostgreSQL       Domain Engines                Workflows
  [Docker]    PV / Battery / Simulation     Events / approvals
              Forecast / Scheduling /      <--> n8n in Docker
              Resilience / Recommendations      |
                    |                           |
            TelemetryProvider            Simulated action
          Simulation only (FYP-I)          + verification
                    |
             MCP official Python SDK
             [typed authorized tools]
                    |
           Approved AI / MCP Client

     FYP-II later: SupportedInverterProvider / SmartMeterProvider
                   + real telemetry + deployment
```

### Firm stack

- **Mobile:** React Native + Expo + TypeScript + Expo Router; custom native-feeling components, clean design tokens, SVG charts/diagrams, Expo-compatible linear gradients, safe-area support and proper Android touch responsiveness.
- **Backend:** Python 3.11+, FastAPI, Pydantic, SQLAlchemy, Alembic; layered application/domain services, OpenAPI, explicit data validation.
- **DB:** PostgreSQL via **local Docker Compose**; use migration scripts, fixtures and database indices for time-series queries. n8n database/schema isolated from Solvanta domain data.
- **Quantitative simulation:** NumPy/Pandas if useful; deterministic pure-Python/NumPy energy engine with parameterized timestep; test against hand-calculated fixtures.
- **Optimization:** OR-Tools (CP-SAT or other verified compatible approach) or PuLP, with independently validated constraints and explicit objectives.
- **Forecasting:** transparent weather/profile baseline first; evaluated simple ML (scikit-learn) when data permit. No training claims without real evaluation.
- **CV:** OpenCV-assisted rooftop boundary/obstacle proposals + manual correction; physical scale requires user/verified measurements.
- **AR:** ViroReact or compatible Expo-native AR stack only after a **real compatibility proof**. Requires development client, not Expo Go. Preserve non-AR editor fallback.
- **Automation:** n8n via Docker, version-controlled JSON workflows and backend event/approval contracts. It orchestrates; it never becomes the engineering calculator.
- **MCP:** official Python MCP SDK, typed tool schemas, real service reuse, explicit authorization. MCP = **Model Context Protocol**.
- **Local AI assistant:** optional configured LLM provider or MCP-compatible client. Must function in degraded tool-only/demo mode with no paid API key. Do not leak provider keys to mobile app.
- **Testing/CI:** pytest, Ruff, TS typecheck/lint, component tests, migration tests, Docker healthchecks, end-to-end seeded demo, MCP Inspector/SDK client tests.

### Important Expo/AR compatibility gate

On **28 Oct 2026**, Expo SDK **58** is released, but the published ViroReact Expo guide documents support only through **SDK 57** (peer range below 58). **Do not automatically select 58 and then discover AR breaks in the last phase.** First perform a small compatibility spike; prefer an actually verified Expo SDK 57 + supported ViroReact combination if AR is critical, or an SDK 58 path only when demonstrated compatible. Lock verified package versions. iOS native testing may require macOS/cloud resources and must not be claimed on Windows without evidence.

Docs: https://expo.dev/changelog/sdk-58 | https://viro-community.readme.io/docs/integrating-with-expo

---

## E. Binding visual design contract — read the photograph

**Before coding the UI, open both image files and inspect them at original size.** Antigravity must refer back to the primary photograph at every visual acceptance check.

### E1. Exact style characteristics

The uploaded reference shows three sleek, black phones on a nearly black background. Its screens feature:
- near-black canvas + #1A1C1A-like graphite card surfaces;
- lime-yellow bright accent banners with a slight yellow-to-green gradient;
- bold white typography and restrained gray secondary labels;
- rounded rectangular energy usage cards with compact icon chips;
- slender saturated lime bar charts, a lime semicircle/ring control, and a dark grid of routine cards with the selected routine glowing lime;
- clean white/gray outline icons; only the selected state has bright-lime emphasis;
- floating compact **bottom navigation** with circular active lime icon / pill and dim inactive controls;
- high information density without tiny illegible text, aggressive neon glow or meaningless gradients.

Do **not** interpret exactness as including the photo's unrelated AC temperature controls, foreign routines or text. Match its **look and component anatomy**, build original Solvanta energy workflows.

### E2. Design tokens, first-pass exact values

```ts
// mobile/src/theme/tokens.ts — initial targets, tune against supplied image
export const dark = {
  background: '#090B0A',
  backgroundRaised: '#121513',
  surface: '#1B1D1B',
  surfaceElevated: '#262927',
  border: '#343A33',
  textPrimary: '#F7F8F5',
  textSecondary: '#A6ADA4',
  textMuted: '#737B72',
  lime: '#C6F43D',
  limeBright: '#E1FF67',
  limeDeep: '#99D40A',
  onLime: '#182107',
  cyan: '#28CEDB',
  amber: '#F9BC46',
  red: '#FF626A',
  success: '#4DE1A2',
};
export const light = {
  background: '#F5F7F1',
  backgroundRaised: '#EAEEE7',
  surface: '#FFFFFF',
  surfaceElevated: '#F0F3ED',
  border: '#DCE3D7',
  textPrimary: '#1A2019',
  textSecondary: '#5C685D',
  textMuted: '#859182',
  lime: '#9CCC17',
  limeBright: '#B8E436',
  limeDeep: '#7FAB00',
  onLime: '#142008',
  cyan: '#087E91',
  amber: '#B36D00',
  red: '#B93646',
  success: '#14835A',
};
```

Color tokens above are implementation targets chosen to **visually match** the screenshot; not presented as exact upstream CSS. Active banner gradients `#E1FF67 → #C6F43D → #99D40A`. All other UI should remain graphite/near-black. Light mode preserves layout, changing semantic colors with adequate contrast.

**Spacing:** 16–18dp horizontal padding; ~16dp card padding; card radius 18–22dp; 44dp min touch; stat text 24–30sp; secondary 11–14sp with accessibility adjustments. **Dock:** 5 tabs, capsule floating ~64dp high with 14–18dp horizontal margins and respect to bottom safe area; active circular lime marker.

### E3. Required navigation and screens

**Floating tab bar:** `Home`, `Appliances`, `Simulation`, `Rooftop`, `AI`. **Scheduling** reachable through Simulation (also shortcut from Home); **Settings** through avatar/profile. Required screens:

1. **Energy Overview:** reference left phone's lime `Energy mode` banner, original energy flow diagram, PV/load/battery/backup KPIs, compact 7-bar usage chart, actionable alerts, sim/live provenance badge.
2. **Appliance Digital Twin:** saved appliance rows/cards with status toggles for **scenario** (not real device), critical/medium/low priority, runtime, flexibility. Reference's dark routine tiles and lime active control states.
3. **Simulation Lab:** reference right phone's prominent lime ring repurposed as **battery SoC**; outage/baseline/what-if selection, 15-min timeline, supply vs demand, baseline-vs-optimized comparisons.
4. **Scheduling & Resilience:** selected neon-green recommendation tile, scrollable 24-hour activity bands, flexible load times, rationale and persistent Approve/Modify/Reject actions. No auto physical execution.
5. **Rooftop Intelligence & AR:** roof photo/overlay with lime polygon/panels, obstruction editor, scale calibration, PV design cards, AR preview button (native compatibility gated), always-functioning 2D fallback.
6. **AI Operations:** smart energy assistant, dark chat/tool result cards, neon suggestion chips, actual MCP engine call provenance, incident history/diagnostic explanation, no hallucinated numerical results.
7. **Settings:** `Appearance → Dark (selected by default) / Light` (System optional), accessibility, measurement units, data provenance, account/settings. Persist appearance and rehydrate on cold start.

**Exact layout wireframes and interaction contracts:** follow `UI_DESIGN_SPEC.md` section 2. **Every screen must use real React Native code; never display static PNGs as an app UI.**

### E4. UI production test obligations

- Screenshot actual Android app at 360×800, 393×852 and at least one larger device. Record emulator/device name, build, app route and theme.
- A/B dark screenshots against original reference: spacing, surface palette, lime placement, card and dock anatomy, selected/idle states, charts and typography.
- Verify floating nav does not cover CTA, last list row, phone gestures, keyboard, modals, or system bars.
- Dark default test after clean install; Light persistence test after restart; all seven screens theme audit.
- No broken inert buttons, fake ON/OFF physical control, impossible unserved=0 with insufficient energy, live badges on fixtures, or nonfunctional modal controls.
- If emulator/device unavailable, record screenshot testing **BLOCKED** and request approval before labeling visual stage complete.

---

## F. Data domains, engineering standards and boundaries

### F1. Main entities

`users`, `organizations`, `memberships`, `buildings`, `sites`, `roof_images`, `roof_polygons`, `roof_obstacles`, `pv_configs`, `panels`, `inverter_specs`, `battery_configs`, `appliances`, `scenarios`, `scenario_load_states`, `pv_profiles`, `forecasts`, `simulations`, `simulation_steps`, `schedules`, `resilience_plans`, `plan_actions`, `approvals`, `telemetry_samples`, `anomalies`, `incidents`, `verification_results`, `workflow_events`, `audit_logs`.

Schema requirements: user/building ownership authorization, tenant isolation, UTC timestamps and building timezone, migrations, constraints for power/time/soc range, normalized data provenance (`synthetic`, `user_entered`, `calculated`, `forecast`, `live`), scenario revision/seed, audit of plan approval. Query and paginate timelines rather than loading unbounded rows.

### F2. Common units and assumptions

- Power: **W/kW**, energy: **kWh**, panel nameplate: **kWp**; do not confuse kW and kWh.
- PV raw DC conversion and losses documented; simulation electric balance coherent, battery charge/discharge efficiency and power limits represented.
- Battery user-visible SoC **0–100%**, minimum reserve and usable battery energy explicit; no full discharge to 0 if reserve is configured.
- 15-minute default simulation step; horizon/timezone configurable within documented bounds.
- `battery_power_kw` positive = discharge and negative = charge; `grid_power_kw` positive = import (document sign). Grid contribution forced zero in outage.
- When demand exceeds possible supply, log **unserved energy**. Don't fabricate PV at night or overrun max battery discharge.
- Critical loads may be unmet due to physical infeasibility. Report this fact; don't silently violate hard constraints.
- Generator available only when enabled, with rated maximum and optional startup delay/min-run constraints.
- Monetary values only when explicit tariffs/currency supplied. Do not invent PKR savings.

### F3. Engine quality

Energy simulation must be a **pure, deterministic function** independent from HTTP, LLM and database. Given identical scenario + seed + model revision → identical timeline. Distinguish baseline vs optimization run with same initial assumptions and forecast source. Explanations must reference explicit actual constraints and quantitative result data.

### F4. Core test invariants

1. Interval energy balance within documented numerical tolerance (PV, grid imports, battery discharge, generator versus served load, charging, export/curtailment/losses).
2. Battery SoC boundaries, charge/discharge power limits and efficiencies.
3. PV zero at night for provided zero-irradiance profile; no grid supply during outage.
4. Accurate `critical_load_coverage` metric with defined denominator; no hiding impossible critical unmet load.
5. Scheduler respects runtime, earliest/latest, noninterruptible and overlap constraints.
6. Optimizer never returns invalid plan as feasible; independent plan validator.
7. Approval cannot execute before owner authorization, after rejection, with stale plan revision or on duplicate retry.
8. Invalid horizons, units, NaN/Inf, oversized input and negative power rejected with clear errors.
9. Simulated anomalies never presented as actual physical faults.
10. Same domain service produces consistent results via REST, n8n and MCP.

---

## G. Mobile, API, n8n and MCP boundaries

### G1. Mobile-to-backend

- Base `/api/v1`, typed OpenAPI contract and generated/typed client, bounded timeouts, auth, refresh approach appropriate to local FYP-I, error/loading/offline states.
- Mobile reaching host computer over LAN must use configured IP (Android emulator host alias as documented); `localhost` on phone is not the PC. Don't expose development API directly to public internet without TLS/security.
- WebSocket optional for time-based simulation playback/telemetry, but polling is acceptable when performance warranted.

### G2. API endpoints (suggested; review before coding)

```text
GET /health, GET /ready
POST/GET/PATCH /api/v1/buildings
POST/GET/PATCH/DELETE /api/v1/buildings/{id}/appliances
POST/GET/PATCH /api/v1/solar-configs
POST/GET/PATCH /api/v1/scenarios
POST /api/v1/solar/estimate
POST /api/v1/roof/analyze
POST /api/v1/roof/layout
POST /api/v1/simulations; GET /api/v1/simulations/{id}
GET /api/v1/simulations/{id}/timeline
POST /api/v1/forecasts
POST /api/v1/schedules/optimize
POST /api/v1/resilience/optimize
POST /api/v1/configurations/compare
POST /api/v1/energy-plans; GET /api/v1/energy-plans/{id}
POST /api/v1/energy-plans/{id}/submit
POST /api/v1/energy-plans/{id}/approve|reject|request-modification
POST /api/v1/energy-plans/{id}/simulate
GET /api/v1/telemetry/simulated
GET /api/v1/incidents; GET /api/v1/verification/{id}
POST /api/v1/internal/workflow-events
POST /api/v1/assistant/query [optional, server-side provider only]
```

### G3. n8n responsibility — 3 real local workflows

1. **Energy Shortage Response:** backend predicts shortage → publish signed/idempotent event → n8n calls optimizer → plan proposed → user receives in-app notice → n8n awaits/queries authoritative backend approval → only approved plan gets new simulation → verify/store outcome. Rejected/expired stays unexecuted.
2. **Daily Energy Planner:** schedule trigger → fetch configured building and forecast → call scheduling service → save draft with explanation → in-app planned schedule notice. Inputs/outputs auditable and retry-safe.
3. **Simulated Anomaly Incident:** telemetry simulator introduces known anomaly fixture → anomaly service creates evidence and suspected causes → n8n creates incident/notification → request review → verification data recorded.

Commit importable JSON exports under `automation/n8n/workflows/`, provide actual execution IDs or recorded local logs. n8n credentials not committed. **FastAPI owns permissions, approval state, idempotency, and all domain calculations.** n8n never approves for user and never calls mains control APIs.

### G4. MCP server — minimum real tools

- Use official **Python MCP SDK** pinned to compatible stable version; prefer stdio for local Inspector smoke testing, plus authenticated Streamable HTTP if warranted.
- `get_building_profile(building_id)`
- `get_energy_scenario(scenario_id)`
- `run_outage_simulation(scenario_id)`
- `forecast_energy(scenario_id)`
- `optimize_appliance_schedule(scenario_id)`
- `optimize_resilience(scenario_id)`
- `compare_energy_configurations(scenario_id, variations)`
- `get_energy_anomalies(building_id)`
- `propose_energy_plan(scenario_id)` **creates pending approval only**.

All outputs structured typed data with units, provenance, run IDs and explicit errors. Validate ownership, limit scenarios/horizons/runtime, avoid arbitrary SQL/shell/filesystem/network tool exposure, do not add `approve_plan` to public LLM tools. MCP Inspector/client integration test must list tools and exercise saved fixture through real engine.

References: https://py.sdk.modelcontextprotocol.io/v2/ | https://py.sdk.modelcontextprotocol.io/run/authorization/

---

## H. Suggested repository structure (subject to existing repo audit)

```text
solvanta/
├── Solvanta.md
├── AntiGravity_prompt.md
├── UI_DESIGN_SPEC.md
├── design/
│   ├── reference/Neon_Smart_Home_Reference.png
│   └── Solvanta_Six_Screen_Mockups.png
├── mobile/
│   ├── app/                     # Expo Router routes
│   │   ├── (tabs)/index.tsx
│   │   ├── (tabs)/appliances.tsx
│   │   ├── (tabs)/simulation.tsx
│   │   ├── (tabs)/rooftop.tsx
│   │   ├── (tabs)/ai.tsx
│   │   ├── scheduling.tsx
│   │   └── settings.tsx
│   ├── src/components/
│   ├── src/features/{overview,appliances,simulation,scheduling,roof,ai}/
│   ├── src/theme/{tokens,provider}.ts
│   ├── src/api/
│   ├── src/hooks/
│   └── __tests__/
├── backend/
│   ├── app/api/v1/
│   ├── app/core/
│   ├── app/db/
│   ├── app/models/
│   ├── app/schemas/
│   ├── app/services/
│   ├── app/engines/{pv,simulation,forecasting,scheduling,resilience,anomaly}/
│   ├── app/providers/
│   ├── app/workflows/
│   ├── app/mcp/
│   ├── alembic/
│   └── tests/
├── automation/n8n/workflows/
├── fixtures/
├── infra/
├── docs/
│   ├── STATUS.md
│   ├── AGENT_HANDOFF.md
│   ├── PHASE_APPROVALS.md
│   ├── DECISIONS.md
│   ├── ARCHITECTURE.md
│   ├── API_CONTRACT.md
│   ├── DOMAIN_ASSUMPTIONS.md
│   ├── TEST_PLAN.md
│   ├── STAKEHOLDER_RESEARCH.md
│   ├── COMPETITOR_MATRIX.md
│   └── ui-evidence/
├── .github/workflows/
├── docker-compose.yml
├── .env.example
└── README.md
```

The brace shorthand in directory list denotes separate real directories, not literal brace-named folder. Prefer minimal modular monorepo, not microservice overengineering.

---

## I. FYP-I PHASE-BY-PHASE DEVELOPMENT — ALL 18 PHASES

**All phases are required for the proposed full FYP-I scope.** Do not silently drop AR, UI, forecasting, n8n or MCP to hit the two-week target. If a specific hardware-based test is unavailable, document an explicitly blocked capability and ask user for decision; do not call it complete. 14 days is a **stretch delivery target** and is not permission to fake progress or bypass approvals. Some phases can be completed in one day using parallel team contributions, but **Antigravity MUST wait for user approval between phases**.

### PHASE 0 — Verified repo audit, requirements and research contracts
**Implement:** Clone/open authorized GitHub repo, inspect commits/issues/PRs, read project docs and reference screenshot, establish documented architecture decisions, domain assumptions, research/15-system matrix template, stakeholder-interview questionnaire, requirement traceability, issue plan and phase gates. Confirm current system capabilities; no fake stakeholder interviews. Create `.gitignore` and `.env.example` without real secrets.
**Acceptance:** real git HEAD recorded, repo tree reviewed, planned phase ownership documented, first reproducible status report, `docs/PHASE_APPROVALS.md` initialized. If user hasn't granted repo access, do not invent a commit.
**Commit target:** `chore(phase-00): audit and establish Solvanta delivery contract`.

### PHASE 1 — Reference-matched UI foundation + 7 functional-screen shells
**Implement:** Expo app with verified AR-compatible SDK decision, Expo Router, reusable neon tokens, dark default persisted theme plus light option, floating 5-tab dock, style component library; real screen shells for Overview, Appliances, Simulation, Scheduling, Rooftop, AI, Settings. Screens must convincingly match the user's reference image. Local fixture-only visual UI state must be labeled `DEMO` or `SIMULATED` until API exists.
**Acceptance:** actual Android build/screenshot (if available) of each screen in dark, at least overview/settings/appliances in light, navigation and theme persistence tests; no misleading live controls; frontend visual review against screenshot. Do not approve yourself.
**Commit:** `feat(phase-01): build neon-lime Solvanta mobile design system`.

### PHASE 2 — Local infrastructure, FastAPI/Postgres, auth and API contracts
**Implement:** PostgreSQL and n8n Docker Compose, FastAPI health/ready, SQLAlchemy + Alembic, API auth/tenant checks, typed client contracts, local Android-to-PC network config, service health checks, lint/test/CI, reliable seed script and developer README. `n8n` workflow definitions may be empty this phase, not fake running.
**Acceptance:** clean checkout boots backend/db; migration succeeds; `/health` and `/ready` verified; mobile can fetch authenticated sample data; integration and auth negative tests pass.
**Commit:** `feat(phase-02): establish FastAPI PostgreSQL and local runtime`.

### PHASE 3 — Buildings, roles and equipment configuration
**Implement:** Customer/engineer role primitives, buildings/sites, PV/battery/inverter/generator configuration entities, input validation, unit consistency, save/edit/retrieve, dark/lime form design, state persistence.
**Acceptance:** create/update/retrieve a demo building with realistic PV & battery values; ownership enforced; no arbitrary hardcoded API data.
**Commit:** `feat(phase-03): implement building and system configuration`.

### PHASE 4 — Rooftop CV-assisted geometry and panel placement
**Implement:** Camera/gallery image import, manual roof polygon/obstacle/scale editor, optional CV-assisted suggestions with confidence, obstacle avoidance, setbacks and panel footprint placement; store geometry and expose preliminary usable area/panel count. On photo with no scale, explicitly require a known distance.
**Acceptance:** engineer can correct and save a rooftop polygon, add obstacle, define scale, obtain feasible panel arrangement; unit tests for polygon bounds/collisions.
**Commit:** `feat(phase-04): implement editable rooftop geometry and placement`.

### PHASE 5 — PV sizing, engineering and generation model
**Implement:** Panel count × rating in kWp, nominal inverter kW and basic DC/AC ratio, orientation/tilt/losses, simple string constraints where equipment specs provided, deterministic profile or weather-informed irradiance provider; preliminary estimation only. Feed source profile to simulation via typed contract.
**Acceptance:** formula/units tests, zero irradiance→zero PV energy, image placement maps to correct kWp, estimated PV timeline available.
**Commit:** `feat(phase-05): add tested PV design and generation engine`.

### PHASE 6 — Appliance Digital Twin and manual scenario state
**Implement:** Appliance list and editors; rated power, priority, criticality, flexibility, required runtime, earliest/latest windows and interruption constraints; saved appliance records and separate scenario ON/OFF selection; actual summary of requested kW/critical demand. UI exactly adheres to supplied graphite cards/lime active switches.
**Acceptance:** user creates list once, selects scenario toggles later, sees accurate demand; backend and UI validation; **clear disclaimer that toggles are scenario-only**.
**Commit:** `feat(phase-06): implement appliance digital twin`.

### PHASE 7 — Deterministic energy/battery/outage simulator
**Implement:** Pure time-step energy-balance engine (15 min default) handling PV, load, grid, battery usable capacity, SoC, charge/discharge limits/efficiencies, outage, optional generator, unmet loads and explicit interval trace. Run saved scenarios, persist summary/timeline, show neon SoC ring and chart.
**Acceptance:** hand-calculated test cases pass; battery never violates SoC/power; no grid during outage; conservation; invalid inputs rejected; UI replays actual result.
**Commit:** `feat(phase-07): implement reproducible energy simulation`.

### PHASE 8 — Short-term forecasting & shortage-risk projections
**Implement:** PV/load baseline forecasts from configured and historical profiles, weather provider abstraction, evaluate applicable statistical/ML method if sufficient data, report MAE/RMSE/split/sample size or document why training is not yet valid; use forecasts to project battery shortage. No predictions without provenance.
**Acceptance:** deterministic baseline, forecast endpoint, real numerical evaluation for any trained model, empty/low-data fallback, forecast chart on mobile.
**Commit:** `feat(phase-08): add energy forecasts and shortage projection`.

### PHASE 9 — Constraint-aware appliance scheduling
**Implement:** Solver considers power/energy availability, flexible load windows, completion duration, noninterruptible constraints, priorities and source budgets. Provide feasible schedule or meaningful conflict explanation. Compact mobile activity timeline and cards.
**Acceptance:** verified solver objective/constraints, independent validator, solver infeasible case, saved schedule, usable scheduling screen.
**Commit:** `feat(phase-09): optimize appliance scheduling`.

### PHASE 10 — Outage resilience / energy source optimization
**Implement:** Decision algorithm for critical load continuity, noncritical shedding/postponement, PV/battery/grid/generator contributions and reserve policies. Explain every action. Compare against physical no-optimization baseline with identical assumptions.
**Acceptance:** measurable critical coverage/unserved kWh, no magical energy/violated constraints, repeatable improvement where feasible, impossible case reported honestly.
**Commit:** `feat(phase-10): implement constraint-aware outage resilience`.

### PHASE 11 — Configuration alternatives, recommendations and human approval
**Implement:** What-if PV/battery/appliance policy comparisons, recommendation evidence and tradeoffs, energy plan revisions, plan state machine `DRAFT → PENDING_APPROVAL → APPROVED / REJECTED / MODIFICATION_REQUESTED → SIMULATED → VERIFIED / FAILED`, authorization/expiry/idempotency audit. Mobile plan approval and neon recommendation cards. FYP-I approval triggers new simulation only.
**Acceptance:** at least 3 variants compared; approvals and rejected plans behave correctly; unauthorized/duplicate approvals fail safely; revised run linked to plan.
**Commit:** `feat(phase-11): add recommendations and approved simulation plans`.

### PHASE 12 — Interactive energy digital twin + native AR preview
**Implement:** Visualization of roof/panel design, solar/grid/battery/home energy flow; playback slider, active/paused loads, critical coverage, reason per optimizer action; stable timeline and controls. Native rooftop AR feasibility/build, camera anchoring/alignment and 2D fallback. **AR device support must be actually tested or marked blocked**, not simulated AR claimed as native AR.
**Acceptance:** smooth replay of REAL simulation trace, accessible state details, 2D rooftop preview works, AR native demo evidence or explicit documented hardware blocker/approval path.
**Commit:** `feat(phase-12): build digital twin and rooftop AR experience`.

### PHASE 13 — n8n automation + human-in-the-loop orchestration
**Implement:** Three importable n8n JSON workflows (Energy Shortage Response, Daily Planner, Anomaly Incident) with webhook/schedule triggers, backend calls, in-app notices, durable approval wait, rejection/expiry, verification, audit and retries. Backend remains policy owner. Authenticated and idempotent event contract; `event_id`, `correlation_id`, plan revision.
**Acceptance:** real n8n execution logs for workflows with seeded data; at least approved and rejected energy plan path verified; no physical device control.
**Commit:** `feat(phase-13): orchestrate energy responses with n8n`.

### PHASE 14 — Simulated telemetry, anomaly detection and diagnosis
**Implement:** Normalized telemetry provider abstraction and `SimulationProvider`, persisted time-series streams, expected-vs-observed simulated mismatch, detection rules or evaluated ML, evidence, possible cause indicators, incidents, post-plan verification/feedback; prepare FYP-II inverter/smart meter adapter interface but **do not fake a connected Inverex**.
**Acceptance:** inject known anomalous fixture; detector yields evidence/incident; reviewer sees SIMULATED source; verification compares real model output versus simulated response trace.
**Commit:** `feat(phase-14): implement simulated energy operations and anomalies`.

### PHASE 15 — Integration, security, automated E2E and quality audit
**Implement:** Wire all seven screens to real APIs and all engines; fix stale input/response errors; assert domain invariant/authorization/approval; mobile navigation/theme/regression, seeded outage end-to-end, deterministic fixture, CI, timeouts, health, source labels and logging.
**Acceptance:** reviewer reproduces Home→Appliances→Scenario→Simulate→Optimize→Schedule→Approve→Simulate→Verify and sees actual numerical trace; no dead UI interactions. Capture actual test evidence.
**Commit:** `test(phase-15): validate integrated Solvanta FYP-I workflow`.

### PHASE 16 — MCP Server and AI Operations tools
**Implement:** Official Python MCP server exposing **at least 7 working typed tools** from section G4 (prefer all 9). Reuse actual service layer, enforce identity/tenant authorization, JSON-compatible units/provenance/IDs, local Inspector/client smoke tests, unauthorized/invalid tool tests. Mobile AI page uses secure backend gateway / MCP-compatible client bridge as authorized. A real tool call must return real simulation results; do not pretend LLM text is execution.
**Acceptance:** client lists tools, retrieves saved scenario, invokes simulation/scheduler/resilience/compare against DB, returns consistent numbers vs REST, plan proposal stays pending. Record version/commands/logs.
**Commit:** `feat(phase-16): expose verified Solvanta engines through MCP`.

### PHASE 17 — FYP-I release candidate and complete handoff
**Implement:** Clean setup from clone, fixture seed, full Android build + screenshots, Dark/Light theme, light review, n8n import, MCP smoke instructions, evaluation, documentation, limitations, 15-system comparison evidence and stakeholder status, GitHub release candidate/branch when approved.
**Acceptance:** clean independent reviewer reproduces demo; no production claim; final phase report shows each Phase 0–17 approval, commit SHA, tests and blockers. Any incomplete requirement explicit and not labeled done.
**Commit:** `docs(phase-17): deliver verifiable Solvanta FYP-I release candidate`.

---

## J. 14-day target map (aggressive and approval-dependent)

**The following is a target, not authorization to skip phase gates.** User approvals can change the cadence. No background or automatic work promised.

| Date (Pakistan timezone) | Target phases | End-of-day real deliverable |
|---|---|---|
| Oct 28 | 0–1 | Repo audit, exact visual system, first mobile screens |
| Oct 29 | 2–3 | Local API/DB and configuration models |
| Oct 30 | 4–5 | Rooftop geometry and PV estimate |
| Oct 31 | 6 | Appliance twin/scenario toggles |
| Nov 1 | 7 | Physics-consistent energy simulation |
| Nov 2 | 8 | Forecasts and shortage prediction |
| Nov 3 | 9 | Appliance scheduling with constraints |
| Nov 4 | 10 | Resilience optimizer and baseline comparison |
| Nov 5 | 11 | What-if, recommendations and approval records |
| Nov 6 | 12 | Digital twin replay + verified AR path/fallback |
| Nov 7 | 13 | n8n workflows and approval coordination |
| Nov 8 | 14 | Simulated telemetry, incidents and verification |
| Nov 9 | 15–16 | E2E regression + MCP server/tools |
| Nov 10 | 17 | Reproducible complete local demo and docs |

If the scope demands more time, state precisely what remains. Never substitute screenshots for tests or ignore required approvals to hit calendar targets.

---

## K. Hard phase commit/push/approval protocol — highest-priority process rule

**THIS IS MANDATORY AFTER EVERY PHASE. DO NOT DO PHASE N+1 WITHOUT IT.**

1. Inspect current git branch/HEAD and pull only safe upstream changes; check GPT-owned files and open PRs.
2. Create a focused branch for the phase when practical: `phase/00-repo-audit`, `phase/01-mobile-theme`, … `phase/17-fyp1-release`. If a durable integration branch is explicitly agreed, work in a phase-specific feature branch and submit PR into integration. Preserve branch protections.
3. Implement **only current phase**, run real commands and acceptance checks, record blockers and actual output. Do not pad code with nonfunctional features solely to say complete.
4. Update `docs/STATUS.md`, `docs/PHASE_APPROVALS.md` and `docs/AGENT_HANDOFF.md` with phase status, evidence, screenshots, commit SHA if known, true blockers and reviewer ask.
5. `git status`; inspect diffs for keys/PII/test fixtures; `git add` only intentional files; `git commit -m "..."`; **git push** to the authorized GitHub remote. NEVER force-push or commit secrets. If push fails, report failure, do not say committed to GitHub.
6. Open/update a descriptive **PR** where repository workflow permits, with screenshot comparison, endpoint changes, migration/test log, acceptance and explicit scope. Link issue and PR.
7. Stop all new feature implementation and send the user the report template below. **Request explicit APPROVAL**. GPT can independently review PR/test evidence, but GPT review alone is not user approval unless the user expressly delegates approval authority.
8. **Only after user says “Approve Phase N”, “approved, continue” or equivalent** and PR is merged by approved procedure, start Phase N+1. A vague silence, status emoji, notification or assumption is not approval.
9. If user requests revisions, fix **same phase**, test again, push new commit, ask again. If a current-phase fix also requires later-phase work, flag architecture conflict, seek permission.
10. Do not auto-resume on future turns, do not claim running unattended and do not skip checkpoints even when deadline approaches.

### Required response after EVERY phase — copy exactly and populate

```markdown
## SOLVANTA — PHASE [N] REVIEW / USER APPROVAL REQUIRED
**Phase title:** ...
**Status:** PASS / PARTIAL / BLOCKED (evidence-based)
**Repo / branch:** actual URL / name
**GitHub commit SHA:** actual full or short SHA
**Push confirmation:** actual remote/branch and result
**PR / issue:** actual URL or explanation if unavailable
**Files changed:** paths
**Implemented:** concrete behaviors, not vague aspirations
**Visual check:** screenshot paths + device/build + Dark/Light reference comparison
**Commands actually run:** exact commands and PASS/FAIL details
**Domain test evidence:** numerical outputs or invariant tests as appropriate
**Security/limits checked:** what was checked, what wasn't
**Open issues:** numbered issues and workarounds
**GPT review requested:** bounded QA question + PR link
**Next phase (not started):** [N+1]

**Do you approve Phase [N] and authorize Phase [N+1]?**
```

**Phase status may be PASS only if its documented acceptance criteria genuinely pass.** Partial/blocked phases should usually be repaired before advancing; ask approval for an explicit documented exception, not quietly skipping.

### Required approvals file schema

`docs/PHASE_APPROVALS.md` table columns:

`Phase | Title | Branch | Commit SHA | Tests | UI Evidence | GPT Review | User Approval | Approval Date | Notes`

Preserve approval history in git. **Never record user approval unless the user actually gives it.** If a verbal approval appears in chat, record a brief truthful summary and date; don't fabricate quote or PR review.

---

## L. GPT reviewer collaboration contract

- Antigravity primarily owns implementation. GPT primarily owns review/spec/test analysis, and may contribute separate tests/QA PRs when asked and authorized.
- Shared `docs/AGENT_HANDOFF.md`, GitHub issues and PRs serve as the collaboration channel. Do **not** assume direct private messaging or unattended agent coordination.
- Before editing, read latest GitHub status and reserve file ownership; do not overwrite an unmerged GPT branch or another contributor's changes.
- For each phase, request GPT review of **specific** artifacts: e.g. phase 7 energy-balance test case, phase 9 OR-Tools constraint validity, phase 13 n8n retry/approval security, phase 16 MCP tool authorization, phase 1 screenshot quality. GPT suggestions are advisory until approved by user.
- Use conventional commit messages and meaningful PR descriptions. Branches must derive from correct base; no force pushes, secret leakage or fabricated passing CI.

`docs/AGENT_HANDOFF.md` example:

```markdown
### Date / Phase
Owner: Antigravity
Repo HEAD: [actual]
Branch / PR: [actual]
Reserved paths: [exact paths]
Completed: [with evidence]
Tests run: [commands and outcomes]
Screenshots: [actual device and file paths]
Open blockers: [specific]
GPT review ask: [specific]
User approval: PENDING / actual confirmed
```

---

## M. Domain end-to-end acceptance fixture

**Illustrative saved building** (replace with DB-generated IDs; values are deliberately scenario inputs, not real measurements):

```json
{
  "building_name": "Demo Residential Hybrid Solar",
  "timezone": "Asia/Karachi",
  "pv_capacity_kwp": 10,
  "battery": {
    "nominal_capacity_kwh": 10,
    "usable_capacity_kwh": 9,
    "initial_soc_pct": 70,
    "minimum_soc_pct": 20,
    "max_charge_kw": 4,
    "max_discharge_kw": 4,
    "round_trip_efficiency": 0.9
  },
  "scenario": {
    "duration_hours": 6,
    "step_minutes": 15,
    "grid_available": false,
    "pv_profile_source": "explicit_seeded_interval_profile"
  },
  "appliances": [
    {"name":"Fridge","rated_power_w":250,"priority":"critical","flexible":false,"initial_on":true},
    {"name":"Lights","rated_power_w":300,"priority":"medium","flexible":false,"initial_on":true},
    {"name":"Computer","rated_power_w":400,"priority":"high","flexible":false,"initial_on":true},
    {"name":"Air Conditioner","rated_power_w":1500,"priority":"low","flexible":true,"initial_on":true},
    {"name":"Water Pump","rated_power_w":1000,"priority":"medium","flexible":true,"initial_on":false,"required_runtime_min":30}
  ]
}
```

The full actual scenario must include **24 aligned 15-minute PV/grid/load intervals or documented generator/profile rules**, not just this metadata. Use zero PV in a nighttime-only demonstration. Simulation should report actual time series of SoC, supply, demand, served/unserved critical energy and load state decisions. Run optimizer with same forecast as baseline; generate human-readable reason traces; approve plan in mobile; execute simulation; verify; call same services from MCP; trigger n8n shortfall response using genuine event trace.

### Final FYP-I definition of done

**Only PASS when all are verifiable**:

- [ ] Original neon screenshot visibly honored; six functional RN screens and Settings; 5-tab floating bottom dock.
- [ ] Dark default and a persistent, well-designed Light mode across screens.
- [ ] Expo Android build launches; supported AR test or explicit blocked-AR exception with functional 2D fallback.
- [ ] Working FastAPI/Postgres/n8n local setup and migrations; mobile reaches backend over LAN/emulator.
- [ ] Roof geometry/editor and preliminary PV design/generation pipeline.
- [ ] Appliance profile and manual scenario ON/OFF selection; no fake control claims.
- [ ] Deterministic energy simulation with energy-balance/SoC/outage invariants.
- [ ] Forecast baseline, battery projection and evaluation transparency.
- [ ] Constraint-aware scheduler and outage resilience optimizer with independent validation.
- [ ] What-if configuration comparison and real human-approval state transitions.
- [ ] Interactive timeline/digital twin, reviewable recommendations and approvals.
- [ ] Three n8n workflows imported and demonstrably run against seeded data; audit/approval security.
- [ ] Simulated telemetry/anomaly/verification works, clearly labeled SIMULATED.
- [ ] MCP server with ≥7 real tested tools and actual Inspector/SDK client E2E.
- [ ] GitHub pushed commit and explicit user approval **after every phase**.
- [ ] Full setup instructions, domain assumptions, tests, UI screenshots, 15-system research status, limitations and truthful outcome report.

---

## N. FYP-II strictly excluded from Part 1 (prepare interfaces only)

- Verified manufacturer/cloud/Modbus TCP adapter for a **specific** supported inverter, potentially Inverex after documentation/protocol discovery.
- Optional existing smart electricity meter / CT integration through a professionally installed compatible interface; no direct ordinary main-breaker software connection.
- Real telemetry operations, live calibration, security hardening, remote cloud deployment, availability monitoring, field pilot, production release and store publishing.
- Physical load actuation requires compatible electrical controllers/professional installation, separate engineering safety approvals and safe override; **not a mandatory Solvanta feature**.

Production must not be claimed in FYP-I. Keep the local environment complete and reproducible.

---

## O. Official sources and mandatory verification

Check current documentation at implementation time; **do not blindly install newest packages or invent import APIs**:

- Expo SDK 58 release: https://expo.dev/changelog/sdk-58
- Expo Router: https://docs.expo.dev/router/introduction/
- ViroReact + Expo supported versions: https://viro-community.readme.io/docs/integrating-with-expo
- ReactVision ViroReact repo: https://github.com/ReactVision/viro
- FastAPI docs: https://fastapi.tiangolo.com/
- SQLAlchemy: https://docs.sqlalchemy.org/
- Alembic: https://alembic.sqlalchemy.org/
- OR-Tools: https://developers.google.com/optimization
- n8n Webhook testing and publishing: https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.webhook/workflow-development
- n8n Wait: https://docs.n8n.io/flow-logic/waiting/
- MCP Python SDK current: https://py.sdk.modelcontextprotocol.io/v2/
- MCP Streamable HTTP security: https://py.sdk.modelcontextprotocol.io/run/authorization/

---

## P. EXACT FIRST EXECUTION REQUEST

1. Open authorized Solvanta GitHub repo and verify current state.
2. Read `Solvanta.md`, this prompt, `UI_DESIGN_SPEC.md` and both images.
3. Begin **PHASE 0 ONLY**. Do not silently implement Phase 1.
4. Produce tested outputs and a clear `docs/PHASE_APPROVALS.md` row.
5. **Commit and push Phase 0 to GitHub**, provide SHA and PR link/status.
6. Explicitly ask: **“Do you approve Phase 0 and authorize Phase 1?”**
7. **STOP until the user responds.**

**No background work, unverified test claims, invented physical telemetry, or next-phase coding without approval.**

**END OF ANTIGRAVITY MASTER PROMPT.**
