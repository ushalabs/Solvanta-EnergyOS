> **DESIGN & EXECUTION AMENDMENT — 28 OCT 2026**  
> **Required:** Read `UI_DESIGN_SPEC.md` and open `design/reference/Neon_Smart_Home_Reference.png` before any mobile work. Match the user's near-black/charcoal/acid-lime design, floating navigation dock and include functional Settings → Light Mode (Dark default). The new `AntiGravity_prompt.md` is the authoritative Part-1 implementation contract. **After every Phase 0–17: test → commit → PUSH to GitHub → produce evidence → ASK user to approve → STOP until approved.** Production/hardware integrations remain FYP-II. All phases are requested; never silently drop features to meet the two-week stretch date.

# SOLVANTA — Canonical Project Specification & GPT Handoff

**Status:** Master specification for a new GPT development session and the Solvanta GitHub repository.  
**As of:** 27 October 2026  
**Target:** Working, locally testable FYP-I prototype **through Model Context Protocol (MCP)** by **10 November 2026**, followed by FYP-II real-world integration, validation, and production.  
**Project:** **Solvanta: Intelligent Solar and Backup Energy Management Platform**  
**Category:** Mobile-first, software-engineered building energy resilience and decision-support platform.  
**Repo:** Not created/linked at the time this document was authored. **Do not invent a repository URL or pretend code exists.** On first access, inspect the actual repository and reconcile this plan with its contents.

> **Handoff to the new GPT:** You are Solvanta's technical architect, integration reviewer, test strategist, and development collaborator. Coordinate implementation with Google Antigravity through the shared GitHub repository. Base all statements about implementation on code, tests and observed results. You cannot assume either agent works continuously without being invoked or given a suitable persistent automation. Read this document first, inspect GitHub second, write a precise task/PR plan third, then act on the actual repo.

---

## 1. Purpose and positioning

Solvanta tackles a focused problem: **how to plan and allocate limited solar, battery, grid and optional generator energy among a building's individual loads, particularly during outages or shortages.** The product connects a solar design model to a building-load digital twin; predicts likely energy availability; simulates what happens; recommends appliance scheduling and load prioritization; requests human approval; verifies outcomes; and, in FYP-II, compares forecasts with actual readings from supported energy equipment.

**One-sentence problem statement:**

> Solar-plus-backup capacity estimates alone do not determine which building loads should operate, when flexible appliances should run, or how limited energy should be allocated during shortages; Solvanta models the building's energy system and load constraints to simulate, optimize, explain and validate resilience decisions across the system lifecycle.

**Main decision loop:**

`OBSERVE → PREDICT → SIMULATE → OPTIMIZE → RECOMMEND → APPROVE → SIMULATE APPROVED ACTION → VERIFY → FEEDBACK`

**Product identity:** engineering decision-support and simulation software, **not** a universal smart-home system, autonomous mains controller, proprietary inverter, generic IoT platform, or Enphase clone. AI/ML assists perception and prediction; deterministic engineering models and constrained optimization own energy decisions.

### Users
- Homeowners / small commercial solar customers: building setup, appliance priorities, scenarios, recommendations, approvals.
- Solar engineer / installer / EPC consultant: roof/PV designs, equipment setup, configuration comparisons, validation.
- Technician / operator: operational anomalies, evidence, verification, eventual supported read-only inverter data.
- Admin: controlled access, configuration, integration health, audit.

### Non-negotiable truths
1. **FYP-I has no automatic appliance detection.** Users register appliances with name, rated/estimated power, priority, flexibility and constraints, and explicitly choose ON/OFF for a simulation scenario.
2. **An inverter generally reports aggregate load, not which specific appliance is ON.** Never infer individual appliance state without a verified circuit/meter interface.
3. **FYP-I is simulation-driven**; it cannot automatically shut off a real AC, pump or circuit.
4. **FYP-II inverter integration is model-specific**, conditional on documented API/protocol access and permitted read-only telemetry. No guarantee for all Inverex or other brands.
5. **Physical high-voltage switching, safety protection, autonomous grid transfer and breaker control are out of scope.** Any later physical action requires compatible certified hardware, professional electrical installation, safety review and explicit permission.
6. AR is optional visualization, not the project's core novelty. A flat 2D/3D rooftop view must continue to work where AR is unavailable.
7. ML claims require actual datasets, baselines, evaluations and metrics. Never label a formula or mock output as trained ML.
8. No fabricated market survey, stakeholder interviews, system reviews, test runs, inverter interfaces or numerical validation.
9. The **59-day university WBS** from 1 October to 28 November 2026 is a separate academic plan. This document adds an aggressive **14-day engineering sprint**, 28 October–10 November 2026, with narrower demo-quality acceptance gates. These are not equivalent to 59 additive developer-days.

---

## 2. Faculty feedback and defense constraints

Earlier Solvanta proposal feedback requested:
- Greater **technical scope** and clearer **single problem statement**.
- A defensible **market/literature study of at least 15 relevant existing systems** (not necessarily identical competitors).
- Real **stakeholder requirements/interviews** with solar professionals and relevant users.
- **Appliance scheduling** as a substantial subsystem.
- Explicit, not merely promised, **recommendation system and AR visualization**.
- A clear boundary between **simulated telemetry** in FYP-I and **real-time/inverter integration** in FYP-II.
- Coherent presentation: no unrelated collection of 'AI/AR/IoT' features.

**Defense thesis:** Solvanta's distinction is its **load-level, constraint-aware resilience decision workflow**, connecting design, simulation, schedules, human-approved plans and eventual real-world verification. Competing products can do substantial battery/PV design; do not claim they lack features without current evidence. Enphase is a much broader physical energy ecosystem, whereas Solvanta is focused pre-installation/operational decision-support software.

### Stakeholder evidence still to collect
Interview genuine solar EPC professionals/installers, engineers and hybrid-solar users; record dated, attributed-or-anonymized notes with consent; identify workflows, pain points, requirements and test cases. Study 15 systems across PV design, batteries, HEMS, load scheduling, optimization, monitoring, digital twins and AR. Distinguish vendor claims from tested/documented capabilities. Do not manufacture the research to satisfy the deadline.

---

## 3. Team and ownership

| Team member | ID | Primary responsibility |
|---|---:|---|
| M. Usman | 49649 | Project lead; solar site intelligence, rooftop CV/geometry, panel placement, PV design and AR; architecture oversight |
| Ahmad Arsalan | 54381 | Building load digital twin, discrete-time energy/battery simulator, PV/load forecasting |
| Hamzah Ahsan | 56187 | Appliance scheduling, outage resilience optimization, what-if configurations, recommendations and human approval |
| Salman Akbar | 53002 | Telemetry abstraction, simulated provider/inverter adapter boundary, n8n orchestration, anomaly/diagnosis and verification |

All team members own tests for their modules and collaborate on integration. **GPT and Antigravity are developer tools**, not substitutes for human review, domain validation, faculty work or electrical engineering sign-off.

---

## 4. Technology stack — locked baseline

| Layer | Selection | Notes |
|---|---|---|
| Mobile | **React Native + Expo + TypeScript**, Expo Router | Android-first and mobile-first; use a polished custom UI, not a generic admin dashboard. |
| UI | NativeWind or StyleSheet + reusable design tokens | Pick one consistent approach; avoid random UI libraries. |
| Charts/digital twin | React Native-compatible charts + SVG/Canvas/Skia where suitable | Timeline scrubber and energy-flow visualization; calculations stay on backend. |
| AR | ViroReact/ARCore feasibility spike; custom Expo development build | **ViroReact does not work in Expo Go**; do not gate main app on an unstable AR dependency. |
| Backend | **Python 3.11+ / FastAPI**, Pydantic, SQLAlchemy, Alembic | Typed domain services and API routes. |
| Persistence | **Local PostgreSQL in Docker** | Migrations, relational integrity, simulation runs/results. |
| Engineering | NumPy, pandas, optional pvlib, explicit battery/PV models | Document units, loss assumptions, validation cases. |
| Optimization | Google OR-Tools (or a deliberate equivalent) | Deterministic baseline and constrained scheduling. |
| CV/ML | OpenCV; scikit-learn when justified | Image-assisted/manual geometry; forecast/anomaly baselines before more advanced models. |
| Workflow automation | **n8n in Docker Compose** | Scheduled orchestration, event/webhook handoffs, notification/approval coordination; no energy mathematics in n8n. |
| MCP | **Official Python Model Context Protocol SDK**, pinned stable v2-compatible APIs | Tools wrap existing domain services; local stdio for testing, Streamable HTTP for service integration. |
| API transport | REST; WebSocket/SSE for progression/telemetry where needed | Avoid overengineering high-frequency live features in FYP-I. |
| Development | GitHub, Docker Compose, pytest, Ruff, ESLint, TypeScript checks | CI on PRs, repeatable local setup, seed/demo fixtures. |
| Heavy work | Bounded jobs; worker/Redis only if actually needed | Do not put CPU-heavy forecasting/optimization into request handlers or n8n execution nodes. |

**APPROVED visual identity (28 Oct 2026):** The user-supplied neon-smart-home reference image under `design/reference/Neon_Smart_Home_Reference.png` is binding. Dark first-launch theme uses nearly black `#090B0A`, charcoal `#1B1D1B`, neon lime `#C6F43D` (gradient `#E1FF67` → `#C6F43D` → `#99D40A`), white `#F7F8F5`, muted `#A6ADA4`; floating five-tab dock. User-selectable persistent Light mode is required. Read `UI_DESIGN_SPEC.md` and `AntiGravity_prompt.md`; they supersede any older navy visual palette.

### High-level architecture

```text
                  REACT NATIVE / EXPO MOBILE APP
       Rooftop • Appliances • Outages • Plans • Digital Twin
                              |
                  REST / WS (typed API contract)
                              |
                      FASTAPI APPLICATION
               Auth / tenants / projects / approvals
                              |
         +--------------------+-------------------------+
         |                    |                         |
  SOLAR / ROOFTOP      ENERGY DOMAIN ENGINES      OPERATIONS SERVICES
  CV + geometry       PV / battery simulator      Telemetry / anomaly
  PV design           forecast / scheduling       plan / verification
  AR model output     outage optimizer            audit
         |                    |                         |
         +--------------------+-------------------------+
                              |
                     POSTGRESQL (LOCAL)
                              |
            +-----------------+---------------------+
            |                                       |
      n8n workflows                             MCP SERVER
    schedule / events /                      typed tool wrappers
   notify / handoff                           read & simulate
            |                                       |
       FastAPI APIs                           trusted MCP client

    FYP-I: SimulationProvider -> normalized energy state
    FYP-II: SupportedInverterProvider/SmartMeterProvider -> same state
```

### Clear boundaries
- **React Native** presents controls and results; never implements energy-balancing or optimization math.
- **FastAPI domain engines** are pure/testable Python operations. Routes are thin adapters.
- **PostgreSQL** owns application, simulation and approval records; event log provides audit.
- **n8n** coordinates workflow timing and integrations; **backend remains source of truth** for authorization and approval.
- **MCP** exposes a *subset of the existing services* to an AI client through structured input/output, not a second implementation of business logic.
- **LLM**, if connected, describes outputs and chooses permitted tools; never invents power readings, switches circuits or bypasses approval.

---

## 5. Functional product modules (fully scoped)

### M1 — Mobile experience & account/building setup
Authenticated roles, onboarding, sites/buildings, roof image upload, solar components, battery capacities, tariff/outage assumptions, appliance registry, simulator project, saved runs. Form validation, units, loading/error/empty states, local connectivity indicators.

### M2 — Rooftop computer vision + geometry
Upload roof image; CV-assisted roof/obstacle hints when reliable; **manual polygon editor is mandatory**; image-to-real-world scale only when calibrated using user-provided dimension/reference; roof polygon, obstacles, setbacks, azimuth, tilt; feasible panel footprints and placement proposal. No pretending raw image pixels imply physical square meters without scale.

### M3 — PV engineering and weather data
Panel catalog entries (W, dimensions, optional electrical parameters), PV count/kWp, orientation/tilt/derating, inverter nominal power, basic DC/AC ratio and simple string validity checks when specifications exist; solar time-series estimate from supplied irradiance/profile or documented provider. All design numbers are *preliminary estimates*, not certified electrical drawings.

### M4 — Building load digital twin
Appliances/circuits: `name`, `rated_power_w`, `priority`, `is_critical`, `is_flexible`, `required_runtime_min`, `max_interruption_min`, `earliest_start`, `latest_finish`, optional duration/min-run constraints. User sets **scenario ON/OFF states**; not automatically detected. Distinguish rated vs estimated actual power.

### M5 — Deterministic energy simulator
15-minute default timestep, configurable time horizon; PV production, aggregate requested loads, battery usable capacity, SoC, charge/discharge efficiency, power limits, grid availability and optional generator; consumption served/unserved, energy balance, curtailed PV, generator/grid usage; returns complete time-indexed states and error trace. Explicitly model battery boundary and unmet demand. Engine must be reproducible with fixed inputs.

### M6 — Forecasting and shortfall projection
Generate future PV and building-demand profiles using weather inputs/user profiles and, if adequate data exists, train/evaluate simple ML against transparent persistence/seasonal/rule baselines. Metrics MAE/RMSE and sample sizes. Project SoC/risk from the forecasts. Clearly label synthetic data and rule-generated profiles; a scenario forecast is not a validated ML prediction.

### M7 — Constraint-aware appliance scheduler
Choose start windows for flexible loads respecting min runtime, user-required completion deadline, power constraints, allowed hours and preferences. Support a deterministic baseline, OR-Tools optimizer and infeasibility/explanation output. Non-flexible critical loads cannot be silently sacrificed as if optional.

### M8 — Outage resilience optimizer
Given PV/grid/SoC/outage/load constraints, propose load ON/OFF/shift recommendations and source dispatch policy. Objectives: maximize critical-load availability and priority-weighted served energy; minimize unserved energy, avoidable generator/grid cost and battery reserve violations (weights explicit and reviewable). Provide evidence and a comparison against a no-optimization baseline. Recommendations are **advisory**.

### M9 — Configuration comparison and recommendations
What-if compare batteries, PV count, initial SoC, critical-load profile, outage window and scheduling policy. Show consistent quantitative metrics with assumptions: served critical load (% time or energy), unserved kWh, battery end SoC, grid/generator kWh, backup coverage. Explain tradeoffs; no unverified savings/payback promises.

### M10 — Interactive energy digital twin
Rooftop depiction, solar/grid/battery/generator energy flow, per-load state, playback timeline, run comparison and reason for each scheduled/shed load. FYP-I digital twin is a **simulation-backed representation**, not a live hardware-synchronized twin.

### M11 — AR rooftop visualization
Mobile-camera visualization of proposed panel footprints, align/calibrate and manually adjust. Spike early: Expo custom dev client + ViroReact/ARCore device compatibility. **Fallback must be usable**: non-AR annotated rooftop/3D preview. Do not imply centimeter-accurate engineering placement without measured calibration.

### M12 — Automation + approvals (n8n + backend)
Three workflows: (1) daily energy plan; (2) predicted energy-shortage response; (3) simulated anomaly response. n8n triggers and coordinates FastAPI calls; FastAPI persists immutable plan versions and approval records. `DRAFT → PENDING_APPROVAL → APPROVED|REJECTED|MODIFICATION_REQUESTED → SIMULATED → VERIFIED|FAILED`; idempotent commands, timeouts, notifications and auditable runs. Approval in FYP-I only triggers a *simulation*, never an electrical command.

### M13 — Simulated operations / adapters
`EnergyDataProvider` interface with `SimulationProvider` now and `SupportedInverterProvider`/`SmartMeterProvider` in Part 2. Normalized telemetry (`timestamp`, `pv_power_kw`, `load_power_kw`, `battery_soc_pct`, `battery_power_kw`, `grid_power_kw`, `grid_available`, `generator_power_kw`, `inverter_status`, `faults`, `source`, `quality`). Null supported for unexposed readings. Do not reverse-engineer unsupported devices by guessing registers.

### M14 — Anomaly detection, evidence and verification
Expected-versus-observed **simulated** differences, threshold/rule baselines; optional ML only with meaningful training/evaluation. Example cases: lower-than-modeled PV, unexpectedly high load, unusually fast simulated SoC fall. Store time range, measurements, confidence/limitations, potential reasons, incident state and follow-up. After approved simulation, compare expected outcome to the execution trace and store verification. Don't call synthetic anomalies real hardware faults.

### M15 — AI/MCP interface
Expose typed, auth-checked domain operations via MCP. Tools should retrieve *real stored scenario data* or trigger *real validated simulation code*; return structured numerical results and units. Do not let an LLM write SQL, execute arbitrary shell/code, make unsafe device calls, fabricate solar measurements or approve its own recommendations.

### M16 — Stakeholder study, evaluation and documentation
Maintain 15-system matrix, requirements traceability, CV/PV/simulation assumptions, tests, performance results, usability feedback and presentation evidence. Research is a formal deliverable, not padding.

---

## 6. Canonical domain models & units

### Units / conventions
- Power: **W/kW** (1 kW = 1,000 W). Energy: **kWh**, not kW. Timesteps expressed in **hours** for energy integration.
- Battery SoC: **percent 0–100** in public APIs; inside algorithm may use fraction but convert explicitly.
- PV design: **kWp** DC nameplate; inverter nominal **kW**; generation **kWh/time interval**.
- Times: store UTC ISO timestamps and building timezone; user-facing scenario interval in local timezone, with DST rules if relevant.
- Power sign: document exact convention; recommended `battery_power_kw > 0` = battery discharge, `grid_power_kw > 0` = import, and negative for charge/export if tracked.
- Cost: currency and tariff explicitly specified; Pakistan rupees only when actual tariff inputs exist.

### Proposed tables (subject to schema review)
`users`, `organizations`, `memberships`, `buildings`, `roof_images`, `roof_polygons`, `obstacles`, `solar_configs`, `panel_catalog`, `inverters`, `battery_configs`, `appliances`, `scenarios`, `scenario_load_states`, `simulation_runs`, `simulation_steps`, `forecasts`, `schedules`, `energy_plans`, `plan_actions`, `approvals`, `telemetry_samples`, `anomalies`, `incidents`, `verification_results`, `workflow_events`, `audit_logs`, `integration_adapters`.

### Data contract (illustrative, not immutable Python syntax)

```json
{
  "scenario_id": "uuid",
  "building_id": "uuid",
  "start_time": "2026-11-02T14:00:00+05:00",
  "step_minutes": 15,
  "steps": 24,
  "pv_profile_kw": [0.0],
  "grid_available": [false],
  "battery": {
    "nominal_capacity_kwh": 10,
    "usable_capacity_kwh": 9,
    "initial_soc_pct": 70,
    "min_soc_pct": 20,
    "max_charge_kw": 4,
    "max_discharge_kw": 4,
    "round_trip_efficiency": 0.9
  },
  "loads": [
    {"id": "fridge", "name": "Fridge", "rated_power_kw": 0.25, "priority": "critical", "initial_on": true, "flexible": false},
    {"id": "pump", "name": "Water pump", "rated_power_kw": 1, "priority": "medium", "initial_on": false, "flexible": true, "required_runtime_min": 30}
  ]
}
```

Arrays must match `steps` in real requests; the single-element arrays above illustrate types only. Server-side Pydantic validation enforces aligned lengths, valid horizons, capacities, efficiency and SoC bounds. Prefer a canonical `SimulationScenario` schema generated into an OpenAPI contract and typed mobile client.

### Engineering invariants/tests
1. Energy conservation per interval within specified numerical tolerance: `PV + grid_import + battery_discharge + generator = served_load + battery_charge + grid_export + curtailed_PV + modeled_losses` (depending on implemented model). **Do not hide deficit**; unserved demand is separately reported.
2. Battery SoC always within configured bounds; charge/discharge power within limits.
3. No energy generated at night from a purely solar provider; no negative power/energy that breaks explicit sign conventions.
4. Grid contribution zero when outage scenario says unavailable; generator unavailable when disabled.
5. Critical-load unmet energy is visible, not falsely recorded as fulfilled.
6. Optimizer output passes independent constraints validation; infeasible cases return meaningful diagnostics, not invented schedules.
7. Same seeded scenario yields deterministic output from simulator/optimizer (subject to fixed solver settings).
8. Idempotent plan approval and n8n retries never execute the same simulated plan twice.

---

## 7. API and integration contract

Use `/api/v1` prefix, OpenAPI as source of truth, request IDs, consistent error schema and authentication. Proposed endpoints:

| Domain | API operations |
|---|---|
| Foundation | `GET /health`, `GET /ready`, `/auth/*`, `/users/me` |
| Buildings | `GET/POST /buildings`, `GET/PATCH /buildings/{id}` |
| Appliances | `GET/POST /buildings/{id}/appliances`, `PATCH/DELETE /appliances/{id}` |
| Site/PV | `POST /sites/{id}/roof-analyze`, `POST /sites/{id}/layout`, `POST /solar-configs/estimate` |
| Scenario | `POST /scenarios`, `GET /scenarios/{id}` |
| Simulation | `POST /simulations`, `GET /simulations/{id}`, `GET /simulations/{id}/timeline` |
| Forecast | `POST /forecasts`, `GET /forecasts/{id}` |
| Optimization | `POST /schedules/optimize`, `POST /resilience/optimize`, `POST /configurations/compare` |
| Plans | `POST /plans`, `GET /plans/{id}`, `POST /plans/{id}/approve`, `/reject`, `/request-change`, `POST /plans/{id}/simulate` |
| Operations | `GET /telemetry`, `GET /anomalies`, `GET /incidents`, `POST /verification-runs` |
| Automation | `POST /internal/events` (service-authenticated), `GET /workflow-events/{id}` |

### n8n interface
- Workflows reside as version-controlled exports under `automation/n8n/workflows/`.
- Triggered by schedules or backend-authenticated events. Call FastAPI through service credentials limited to allowed scopes.
- Send device/mobile notifications via approved integration; local demo may use in-app notification records, not fake third-party delivery.
- Human approval occurs via authenticated mobile → FastAPI transaction → durable plan state → n8n resumes/polls the state.
- On timeout/retry, no duplicate plans/simulation jobs; save event IDs and dedupe.
- n8n **does not** store the authoritative approval state and **does not** execute SQL directly.

### MCP interface
Official Python MCP SDK, pinned to a known working version; confirm its version-specific API before implementing. Prefer tools such as:

| Tool | Mode | Required behavior |
|---|---|---|
| `get_building_profile(building_id)` | Read | Authorized building profile; redact private/sensitive data |
| `list_appliances(building_id)` | Read | Return typed appliance metadata and constraints |
| `get_energy_scenario(scenario_id)` | Read | Return actual stored validated scenario |
| `forecast_energy(scenario_id)` | Compute | Call the existing forecasting service; include provenance/assumptions |
| `run_outage_simulation(scenario_id)` | Compute + saved run | Call the deterministic simulator; return run ID, summary and units |
| `optimize_appliance_schedule(scenario_id)` | Compute | Return valid schedule or explicit infeasibility |
| `optimize_resilience(scenario_id)` | Compute | Explainable load decisions and baseline comparison |
| `compare_energy_configurations(scenario_id, variations)` | Compute | Bounded variation list, summary metrics |
| `get_energy_anomalies(building_id)` | Read | Return source, timestamp, anomalies, evidence |
| `propose_energy_plan(scenario_id)` | Restricted write | Creates **pending** plan only; never approves or executes |

**MCP security and quality:** per-user/service auth; tenant scoping; no arbitrary path/SQL/shell; schema validation; request/response bounds; resource/timeouts; audit each call; rate limiting; explain confirmation requirements; locally bind to loopback unless explicitly and securely configured for a network. No direct tool for physical breaker/inverter switching. If using remote Streamable HTTP, enforce HTTP auth and TLS at deployment boundary; document threat model and consent.

---

## 8. Repository layout

```text
solvanta/
├── README.md
├── Solvanta.md                 # this document
├── AntiGravity_prompt.md      # scoped agent instructions
├── docs/
│   ├── architecture.md
│   ├── domain-assumptions.md
│   ├── api-contract.md
│   ├── test-plan.md
│   ├── roadmap.md
│   ├── stakeholder-research.md
│   ├── competitor-matrix.md
│   ├── AGENT_HANDOFF.md
│   ├── DECISIONS.md
│   └── STATUS.md
├── mobile/                     # Expo Router + React Native + TypeScript
│   ├── app/
│   ├── components/
│   ├── features/
│   ├── services/api/
│   ├── theme/
│   └── __tests__/
├── backend/
│   ├── app/
│   │   ├── api/v1/
│   │   ├── core/
│   │   ├── db/
│   │   ├── models/
│   │   ├── schemas/
│   │   ├── services/
│   │   ├── engines/solar/
│   │   ├── engines/simulation/
│   │   ├── engines/forecasting/
│   │   ├── engines/optimization/
│   │   ├── engines/anomalies/
│   │   ├── integrations/providers/
│   │   ├── workflows/
│   │   └── mcp/
│   ├── alembic/
│   └── tests/
├── automation/n8n/workflows/
├── infra/docker/
├── scripts/
├── fixtures/
├── .github/workflows/
├── docker-compose.yml
├── .env.example
└── LICENSE                         # choose deliberately; do not assume license
```

Repo structure is a proposed baseline; an established repository takes precedence after review. Avoid speculative extra services/microservices. Keep backend domain logic isolated from FastAPI routes/MCP/n8n.

---

## 9. Complete two-part roadmap (phases 0–30)

### FYP-I — prototype through MCP (not production)

| # | Phase | Core deliverable |
|---:|---|---|
| 0 | Research & requirements | Stakeholders, 15-system study plan, validated user stories and acceptance cases |
| 1 | Mobile UI/UX prototype | React Native design system, navigation, core screen wireframes |
| 2 | Repo/infra/backend architecture | Docker Compose, FastAPI, PostgreSQL, Expo, checks, typed contracts |
| 3 | Foundation | Users, buildings, equipment/appliance entities, migrations |
| 4 | Rooftop intelligence | Images, calibration, polygon editor, obstacles, layout candidate |
| 5 | PV design & profiles | Sizing/generation engine, solar profile source, engineering tests |
| 6 | Building load twin | Appliance constraints and scenario ON/OFF selection |
| 7 | Energy simulator | PV/battery/grid/generator timestep state + energy balance tests |
| 8 | Forecasting | Rule/statistical baseline; evaluated ML if data permits |
| 9 | Appliance scheduling | Constraint scheduler with tests |
| 10 | Resilience optimizer | Load shedding/shifting, priority outcomes, baseline comparison |
| 11 | Config/recommendation | What-if engine, explanation, plan draft |
| 12 | Interactive twin & AR | Timeline, energy flows, AR spike + fallback |
| 13 | n8n automation & human approval | Three event/schedule workflows; durable approval and sim execution |
| 14 | Simulated operations | Telemetry provider; anomaly/diagnosis/verification |
| 15 | Validation & acceptance | Cross-engine tests, baseline benchmarks, documented limitations |
| 16 | MCP server & AI client smoke test | Typed MCP tools wrapping same real services; security + Inspector tests |
| 17 | FYP-I release candidate | Local all-in-one demo, instructions, evidence and defense material |

### FYP-II — real hardware to production

| # | Phase | Core deliverable |
|---:|---|---|
| 18 | Staging / deployment architecture | Environment separation, secrets, migrations, CI/CD |
| 19 | Supported inverter adapter | Model-specific authorized read-only cloud/local data connector |
| 20 | Live telemetry pipeline | Normalization, timestamps, quality, persistence, streaming |
| 21 | Optional smart-meter adapter | Aggregate/circuit readings where installed and documented |
| 22 | Live energy twin | Real readings + simulation-based what-if side by side |
| 23 | Operational anomaly intelligence | Real-data baselines and measured incident accuracy |
| 24 | Incident automation | Review/notify/track/verify real observations |
| 25 | Forecast calibration | Predicted-vs-actual model tuning using real data |
| 26 | Production MCP/agent security | Auth, auditing, rate limiting, policies, hardening |
| 27 | Installer/customer product improvements | Usability, field workflows, AR alignment if feasible |
| 28 | Reliability/security/observability | Backups, monitoring, alerting, regression and stress tests |
| 29 | Field pilot | Supported installation and stakeholder assessment |
| 30 | Production release | Versioned API/app deployment, documentation and handover |

---

## 10. Two-week sprint: 28 Oct – 10 Nov 2026

**Reality check:** finishing all 18 FYP-I phases to engineering-grade depth, collecting genuine stakeholder interviews, training validated ML, building reliable AR, and exposing a robust MCP server in 14 calendar days is **high-risk**. Target a real integrated local vertical slice through MCP; explicitly label anything deferred. A thin functional slice beats 18 fake checked boxes.

### P0 must ship by Nov 10
- One-command local backend/database startup, Expo Android dev app with accessible backend, migration and seed fixtures.
- Real building + appliance configuration, manual ON/OFF loads, scenario setup.
- Deterministic battery/PV/grid outage simulation with reproducible energy-balance tests.
- One correct constraint-aware scheduling/resilience optimizer with baseline comparison and explanations.
- Real (not hardcoded fake) configuration recommendations + pending approval + approved simulated execution.
- At least **one running n8n energy-risk workflow**, with visible trigger/log, callback and idempotency.
- Simulated telemetry provider + basic expected-vs-actual/anomaly check + verification record.
- Working **MCP server** exposing **at least five tested tools**: scenario retrieval, outage simulation, schedule optimization, resilience optimization, configuration comparison (prefer read/building query and pending-plan proposal too).
- Demonstrable MCP client connection via Inspector or SDK client, showing real structured engine output.
- Mobile end-to-end demo and GitHub README/test instructions.

### P1 if time permits
- Validated CV-assisted roof detection, reliable polygon editing/scale calibration, 2D panel placement/PV sizing.
- Rooftop AR dev-build proof of concept with fallback.
- Forecast baseline and ML evaluation (only if sufficient data); robust anomaly classifications.
- Remaining two n8n workflows; polished digital-twin playback; broader tests.

### P2 explicitly defer to FYP-II or later
- Real Inverex/other inverter integration until model/API/protocol confirmed, real CT/smart meters, production deployment, real physical switching (out of scope), high-confidence field diagnostics, calibrated AR accuracy, advanced model retraining from real installations.

### Daily checkpoint plan

| Day/date | Integration checkpoint; not individual person-days |
|---|---|
| D1 — Oct 28 | Inspect/create repo, finalize scope & ownership, skeleton and acceptance fixtures |
| D2 — Oct 29 | Compose PostgreSQL/FastAPI/n8n; Expo app shell; migrations, API contract |
| D3 — Oct 30 | Buildings, appliances, battery/PV configs, seed data, manual ON/OFF screens |
| D4 — Oct 31 | Energy simulator v1, reference fixtures, energy-balance/SOC tests |
| D5 — Nov 1 | Outage scenario mobile flow, timeline API and basic energy-flow visualization |
| D6 — Nov 2 | Constrained scheduling v1, infeasibility/priority tests |
| D7 — Nov 3 | Resilience optimization, baseline comparison and decision explanations |
| D8 — Nov 4 | What-if configuration recommendation + plan state + approval APIs |
| D9 — Nov 5 | n8n energy-shortage response flow + simulated approved execution |
| D10 — Nov 6 | Simulated telemetry + anomaly/verification workflow; event audit |
| D11 — Nov 7 | MCP tools wrapping actual services; local transport + schema tests |
| D12 — Nov 8 | MCP Inspector/client E2E; mobile/backend/n8n/MCP integrated scenario |
| D13 — Nov 9 | Regression, security checks, error states, seeded demo, docs |
| D14 — Nov 10 | Demo freeze, QA evidence, GitHub milestone, explicit P1/P2 backlog |

**Conditional features:** CV/AR and advanced ML advance in parallel only when P0 is stable; never fake successful hardware/AR/ML integration to meet the date. Field/stakeholder research remains required for the academic FYP even if research collection extends beyond this engineering sprint.

### Definition of 'MCP complete' on Nov 10
All mandatory MCP tools call real code with typed inputs, authenticate appropriately, use tenancy checks, return measurable results/units, pass negative and happy-path tests, and work through an actual SDK/Inspector client. Demonstrate one question-driven sequence: **select building → retrieve scenario → simulate 6-hour outage → optimize appliances → compare base vs improved plan → explain result → create pending recommendation**. No tool silently approves/executes a real-world control.

---

## 11. End-to-end canonical demo

1. Create a building with a simulated **10 kWp PV system**, **10 kWh nominal battery** with explicit usable capacity, and a home load list.
2. Select realistic appliances: fridge critical, lights medium, computer important/non-interruptible for a window, AC low priority, pump flexible.
3. Mark initial ON/OFF states; configure a **six-hour grid outage**, initial battery SoC, weather/PV profile, generator optional.
4. Simulate an unoptimized schedule; inspect hourly/timestep values, unmet energy, SoC and critical-load coverage.
5. Optimize: preserve configured critical loads when physically feasible, postpone pump, reduce AC usage if permitted, explain decisions.
6. Compare baseline and optimized results using exactly the same assumptions; do not guarantee improvement if constraints make it impossible.
7. Create a plan in `PENDING_APPROVAL`; approve through authenticated mobile session; simulate approved plan; verify expected outcome.
8. Trigger a simulated PV underproduction observation; generate anomaly evidence and an incident record.
9. Use an MCP client to ask for or invoke scenario results; show actual tool execution returning stored IDs and units.
10. Show n8n workflow execution, FastAPI audit events, database records and no physical switching.

**Avoid invented performance claims:** any percentages, backup hours, kWh or accuracy presented in the demo must be computed from its actual data/run.

---

## 12. Quality gates and testing

**Build gate:** Docker Compose services healthy, migrations applied, Expo app starts and connects over LAN, no secrets committed, clean `.env.example`, backend test runner/JS type checker/linter pass.

**Engine gate:** unit tests for zero PV at night, outage grid-off, empty/no load, SoC near reserve, zero/insufficient capacity, charge/discharge limits, runtime constraints, forced infeasible critical load, varied timestep, repeated deterministic run.

**Optimization gate:** compare to explicit nonoptimized baseline with same scenario; validate output constraints separately; infeasibility is honest, not a silent deletion of loads.

**Workflow gate:** n8n imported from repo; actual trigger shown; approval needed; reject/modify/timeout paths tested; event idempotency and audit.

**MCP gate:** official SDK pinned; tools listed in Inspector; structured schema/input errors; real service invocation; auth/tenant isolation tests; no shell/SQL/unsafe device actions; real client E2E.

**Mobile gate:** screens usable on small Android screen, loading/empty/offline/error states, inaccessible local server clearly reported, app does not pretend data synced when offline.

**Documentation gate:** reproducible setup in README; named limitations; screenshots/logs/test output linked to actual artifacts; objective acceptance checklist and known defects.

### Useful commands (adapt to actual repo)

```bash
# Backend services (example; real compose may vary)
docker compose up --build -d
# Database migrations
cd backend && alembic upgrade head
# Unit / integration tests
cd backend && pytest -q
# Lint / format
cd backend && ruff check .
# Mobile
cd mobile && npm ci && npx expo start --dev-client
# Check TypeScript
cd mobile && npx tsc --noEmit
```

**Do not promise working commands until tested in actual repo.** Expo Go can be used for non-native portions; AR requires custom dev client.

---

## 13. GPT ↔ Antigravity GitHub collaboration protocol

This is a **human-invoked collaboration workflow**, not continuous autonomous background work. When either assistant is active and has GitHub access:

1. Read `Solvanta.md`, `AntiGravity_prompt.md`, `docs/STATUS.md`, `docs/AGENT_HANDOFF.md`, open issues/PRs, CI, and current file tree.
2. Confirm current working branch and latest commit; record verifiable progress in the repository.
3. **One owner per change set.** Antigravity typically owns implementation PRs; GPT typically owns architecture review, test design, issue triage, contract review and independent PRs on non-overlapping files.
4. Before coding, post issue scope, owned files, exact acceptance criteria and test plan. Use branches `feat/<issue>-short-name`, `fix/<issue>-short-name`, `docs/<issue>-short-name`.
5. Do not concurrently modify the same files/PR. Ask for file ownership transfer via `docs/AGENT_HANDOFF.md` rather than overwriting work.
6. PR must include problem, changes, API/schema implications, test results, screenshots if mobile, limitations, rollback/migration notes.
7. Prefer small, reviewable PRs and CI. Do not push straight to protected `main`, force-push, erase history, rewrite branches or install unreviewed secrets.
8. GitHub issues and the repository are the source of truth for *state of completion*. Chat assertions do not count.
9. After a task, update `docs/STATUS.md` with date/commit/verified tests/blocked items/next step; `docs/DECISIONS.md` for architectural decisions.
10. If needed to meet milestone, **de-scope clearly and document it**, rather than inserting stub APIs that return fabricated outputs.

### Starter issue batches
- #A: Foundation — Compose, FastAPI, Expo shell, DB/auth/contracts.
- #B: Building/appliance twin, scenarios, validation and seed fixtures.
- #C: Energy simulation and invariant tests.
- #D: Scheduler/optimizer and baseline evaluation.
- #E: Plans, human approvals, simulation execution.
- #F: Simulated telemetry, anomaly/verification.
- #G: n8n event/approval workflow.
- #H: MCP tool server, security and real client E2E.
- #I: Mobile scenario → comparison → approval screens.
- #J: Integration tests, documentation, demo evidence.

These are **issue titles to create**, not existing issue numbers.

### Status file format

```markdown
# STATUS — Solvanta
As of: YYYY-MM-DD HH:mm PKT
Current branch/commit: ...
Milestone: Nov 10 local MCP prototype
Verified complete: [links to merged PRs, logs, test results]
In progress: [owner, issue, owned files]
Blocked: [specific dependency/decision]
Next actions: [priority, owner, measurable criterion]
Known limitations: [no hardware switching, etc.]
```

---

## 14. Risks, decisions and escalation

| Risk | Mitigation |
|---|---|
| Two weeks insufficient for all 18 phases | P0 integration slice through MCP; P1/P2 separately marked. |
| No real solar/telemetry data yet | Clearly labeled simulation/seed data; don't claim real measurements or validated ML. |
| Image pixels not calibrated to meters | Manual length calibration and geometry fallback. |
| Expo AR dependency not supported by device/build | Early spike; 2D preview mandatory. |
| CPU-heavy solvers freeze API/mobile | Timeouts, bounded horizon, job processing, status polling. |
| Optimizer cannot satisfy all critical loads | Explicit infeasible/unserved report and honest recommendations. |
| n8n duplicate event retries | Idempotency key, backend state machine and audit. |
| MCP authorization/data leakage | Auth scopes, tenant checks, rate limits, bounded tools, redaction. |
| Inverter undocumented | Selected documented model only in FYP-II; keep simulation provider. |
| Stakeholder and competitor research weak | Record evidence and comparison, no invented interviews/capabilities. |
| Two agents collide | Protected branches, file ownership, bounded PRs, shared handoff. |

---

## 15. What the new GPT should do first

1. Confirm actual GitHub repository URL/access **after user creates/connects it**; inspect branch/tree/README/CI. Do not claim repository access before that.
2. Import/commit these two Markdown files unchanged as initial spec, then propose `docs/STATUS.md`, `docs/AGENT_HANDOFF.md` and first 10 issues.
3. Reconcile any current code with this contract; no destructive rewrites without concrete reasons.
4. Freeze the first reference building/outage fixture and backend schemas jointly with Antigravity.
5. Have Antigravity build bounded implementation PRs; review each against tests, invariants, scope and user-visible behavior.
6. Be proactive about catching hallucinated engineering, invented telemetry, unsafe hardware promises and security shortcuts.
7. Aim for **Nov 10** as a **working, verified local MCP-integrated prototype**; report any missed gates clearly. Do not claim completion until tests and end-to-end demo are actually observed.

---

## 16. Useful primary documentation

- Official MCP Python SDK (v2 current): https://py.sdk.modelcontextprotocol.io/ and https://github.com/modelcontextprotocol/python-sdk
- MCP running/transports: https://py.sdk.modelcontextprotocol.io/run/
- ViroReact + Expo native development build: https://viro-community.readme.io/docs/integrating-with-expo
- FastAPI background work guidance: https://fastapi.tiangolo.com/tutorial/background-tasks/
- n8n Wait/human workflows: https://docs.n8n.io/integrations/builtin/core-nodes/n8n-nodes-base.wait/ and https://docs.n8n.io/flow-logic/waiting/

**End of canonical Solvanta handoff.**
