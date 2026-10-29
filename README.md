# Solvanta — Intelligent Solar and Backup Energy Management Platform

[![FYP-I Milestone](https://img.shields.io/badge/FYP--I-Phase%2002%20Backend-lime?style=flat-square)](#phase-gates)
[![Tech Stack](https://img.shields.io/badge/Stack-React%20Native%20%7C%20FastAPI%20%7C%20PostgreSQL%20%7C%20n8n%20%7C%20MCP-black?style=flat-square)](#architecture)
[![CI Status](https://img.shields.io/badge/CI-GitHub%20Actions-green?style=flat-square)](#)
[![License](https://img.shields.io/badge/License-Proprietary%20%2F%20Academic-blue?style=flat-square)](#)

> **Solvanta** is an Android-first, software-engineered building energy resilience digital twin. It models solar photovoltaic (PV) generation, battery storage dynamics, and building appliance constraints to simulate shortages and grid outages, optimize flexible appliance schedules, explain resilience decisions, and solicit human approval before executing simulated outcomes.

---

## 1. Unified Problem Statement & Mission

Solar-plus-battery systems frequently face unpredictable solar generation, fluctuating building load demands, and sudden grid outages. Hardware capacity alone (rated kWp or kWh) does not determine:
- Which critical building loads must remain powered during an outage.
- When flexible appliances (pumps, EV chargers, washing machines) should be scheduled to consume solar surplus.
- How deep battery reserves should be maintained before an anticipated grid failure.
- Whether a given system configuration realistically covers essential needs.

Solvanta solves this by providing a **load-level digital twin and constrained decision engine** that operates on a strict, auditable loop:

$$\text{OBSERVE} \longrightarrow \text{PREDICT} \longrightarrow \text{SIMULATE} \longrightarrow \text{OPTIMIZE} \longrightarrow \text{RECOMMEND} \longrightarrow \text{HUMAN APPROVAL} \longrightarrow \text{SIMULATED EXECUTION} \longrightarrow \text{VERIFY} \longrightarrow \text{FEEDBACK}$$

---

## 2. Engineering Subsystems and Ownership

| Subsystem | Functional Scope |
|---|---|
| **Solar Site Intelligence & AR** | Solar site intelligence, rooftop CV geometry, panel placement, PV design engine, AR visualization, and architecture |
| **Energy Simulation & Forecast** | Building load digital twin, discrete-time energy balance & battery degradation engine, PV and load forecasting |
| **Optimization & Resilience** | Appliance scheduling, outage resilience optimization, what-if configuration engine, recommendations, and human approval state machine |
| **Operations & Orchestration** | Telemetry provider abstraction, simulated telemetry provider, n8n workflow orchestration, anomaly detection, incident diagnosis, and post-plan verification |

---

## 3. Architecture & Technology Baseline

```text
                  REACT NATIVE + EXPO MOBILE APP [Android-First]
        Overview (Home) • Appliances • Simulation • Rooftop AR • AI Operations
              [Floating 5-Tab Navigation Dock | Dark Default / Light Theme]
                                       │
                           REST / WebSocket (FastAPI)
                                       │
                               FASTAPI BACKEND
                     Auth / Tenancy / Projects / Approvals
                                       │
     ┌─────────────────────────────────┼─────────────────────────────────┐
     │                                 │                                 │
SOLAR & ROOF ENGINES          ENERGY DOMAIN ENGINES            OPERATIONS SERVICES
CV + Roof Polygon Geometry    Deterministic 15m Simulation     Telemetry Provider Abstraction
Solar PV Sizing & Yield       PV & Load Forecasting            Anomaly Detection & Incidents
AR 2D/3D Model Fallback       OR-Tools CP-SAT Scheduling       Plan Approval & Verification
                               Resilience Source Optimizer      Audit Logging
     │                                 │                                 │
     └─────────────────────────────────┼─────────────────────────────────┘
                                       │
                             POSTGRESQL 16 (DOCKER)
                                       │
                   ┌───────────────────┴───────────────────┐
                   │                                       │
             n8n WORKFLOWS                               MCP SERVER
     Docker-based automation engine           Official Python MCP SDK (v2 pinned)
     Shortage response, daily planner,        Exposing typed simulation/forecast/
     incident notifications & audit           scheduler tools to authorized AI
```

### Stack Components
- **Mobile Client:** React Native, Expo SDK 57, Expo Router, TypeScript, SVG charts, persistent Dark/Light appearance.
- **Backend API:** Python 3.11+, FastAPI, Pydantic v2, SQLAlchemy, Alembic.
- **Database:** PostgreSQL 16 Alpine running in Docker Compose with relational integrity and time-series indexes.
- **Simulation Engine:** Deterministic, pure-Python energy-balance engine operating on parameterized 15-minute intervals. Zero LLM math.
- **Optimization:** Google OR-Tools (CP-SAT) for constrained load scheduling and resilience source allocation.
- **Orchestration:** n8n workflow engine in Docker Compose for asynchronous events, retries, and notification dispatch.
- **Model Context Protocol (MCP):** Official Python MCP SDK exposing typed, secure engineering tools to AI clients.

---

## 4. Visual Design System

The visual identity strictly adheres to the approved reference design ([`design/reference/Neon_Smart_Home_Reference.png`](design/reference/Neon_Smart_Home_Reference.png)):
- **Canvas:** Near-black `#090B0A` with matte graphite `#1B1D1B` rounded cards.
- **Primary Accent:** Vivid acid/neon-lime `#C6F43D` with linear gradient `['#E1FF67', '#C6F43D', '#99D40A']` for hero banners and active states.
- **Floating Dock:** Custom capsule navigation bar floating above the bottom safe area with active circular lime pill marker.
- **Theme Support:** Dark mode is the default on clean launch; persistent Light mode (`#F5F7F1` canvas) is accessible via Settings.
- **Data Density:** High-density metric wells with explicit units (`kW`, `kWh`, `%`, `h`).

---

## 5. FYP-I Phase Gates & Approval Protocol

All development is divided into 18 strict phases (0–17). **The system contract mandates that Antigravity implements one phase, executes tests, pushes commits to GitHub, produces evidence, and STOPS until explicit user approval is granted.**

| Phase | Milestone | Focus |
|---|---|---|
| **Phase 0** | **Repo Audit & Contracts** | Initial commit, delivery contract, ADRs, test plan, competitor matrix |
| **Phase 1** | **Mobile UI Foundation** | Expo setup, tokens, floating dock, 7 screen shells matching neon theme |
| **Phase 2** | **Backend & Local Runtime** | FastAPI, PostgreSQL, Docker Compose, Alembic, health checks |
| **Phase 3** | **Building & Equipment** | Building, PV, battery, inverter, generator configuration models |
| **Phase 4** | **Rooftop CV & Geometry** | Roof polygon editor, obstacle masking, scale calibration, panel placement |
| **Phase 5** | **PV Sizing & Yield Engine** | Panel kWp sizing, DC/AC ratio, irradiance-to-yield calculation |
| **Phase 6** | **Appliance Digital Twin** | Rated loads, criticality, flexibility, scenario toggle states |
| **Phase 7** | **Energy Simulator** | Deterministic 15-min energy balance, battery SoC bounds, outage tracking |
| **Phase 8** | **Forecasting Engine** | Short-term PV & building load forecasts, battery shortage projection |
| **Phase 9** | **Appliance Scheduling** | OR-Tools CP-SAT constrained schedule optimization |
| **Phase 10** | **Resilience Optimizer** | Outage source allocation, critical load continuity vs unoptimized baseline |
| **Phase 11** | **Recommendations & Approval**| What-if comparisons, pending approval state machine, mobile plan actions |
| **Phase 12** | **Digital Twin & AR** | Interactive simulation playback, energy flow SVG, AR preview with 2D fallback |
| **Phase 13** | **n8n Automation** | 3 automated workflows: Shortage Response, Daily Planner, Anomaly Incident |
| **Phase 14** | **Simulated Telemetry** | Telemetry provider abstraction, anomaly generator, incident verification |
| **Phase 15** | **E2E Integration & Quality** | Full pipeline regression, security, authorization, end-to-end demo |
| **Phase 16** | **MCP Server & AI Tools** | Official Python MCP SDK, 9 typed tools, stdio & HTTP smoke tests |
| **Phase 17** | **Release Candidate** | Reproducible deployment, documentation, research synthesis, handoff |

---

## 6. Project Boundaries & Non-Claims

To ensure scientific integrity and academic rigor:
1. **No Automatic Appliance Detection in FYP-I:** Appliance identities and power ratings are registered by users and selected per scenario; aggregate inverter power does not reveal individual appliance states.
2. **Simulation-Only in FYP-I:** Plan approval runs a revised simulation; it does NOT physically switch electrical circuits or control breakers.
3. **No Direct Mains Control:** Autonomous breaker switching is out of scope. Physical control in FYP-II requires certified contactors and electrical safety review.
4. **Deterministic Math:** LLMs never perform energy-balance calculations or alter battery state constraints.
5. **No Fabricated Telemetry:** All synthetic data are explicitly marked `SIMULATED` or `DEMO`.

---

## 7. Clean Checkout Setup & Development Runbook

### Prerequisites
- **Docker Desktop:** Active daemon with Compose v2.
- **Python:** Version 3.11 to 3.13.
- **Node.js:** Version 20+ with npm.
- **Android SDK:** (Optional for native emulator preview) ADB on PATH.

### 1. Environment Configuration
Copy the provided environment template to `.env`:
```powershell
cp .env.example .env
```
*(The defaults in `.env.example` configure local development ports and database credentials).*

### 2. Start PostgreSQL Container
Start the PostgreSQL 16 database container in the background:
```powershell
docker compose up -d db
```
Verify container status:
```powershell
docker ps
```
The container `solvanta-postgres` will show as `Up (healthy)` on port `5432`.

### 3. Backend Setup & Database Migrations
Create the Python virtual environment and install dependencies:
```powershell
cd backend
python -m venv .venv
& .venv/Scripts/Activate.ps1   # On Linux/macOS: source .venv/bin/activate
pip install -r requirements.txt
```
Apply Alembic migrations to set up the relational database tables:
```powershell
alembic upgrade head
```
Seed the development database with demo organization, users, and building twin:
```powershell
python scripts/seed_demo_data.py
```
Run backend tests to verify 100% green status:
```powershell
pytest -v
```
Start the FastAPI development server:
```powershell
python run.py
```
- Interactive Swagger API docs: `http://localhost:8000/docs`
- Health probe: `http://localhost:8000/health`
- Readiness probe: `http://localhost:8000/ready`

Verify authenticated live API flow:
```powershell
python scripts/verify_live_api.py
```

### 4. Mobile Setup & Running the App
From a second terminal:
```powershell
cd mobile
cp .env.example .env
npm install --legacy-peer-deps
```

#### Physical Device Configuration (Local Wi-Fi LAN)
Start the backend and Expo LAN server from the repository root with `./scripts/start-phone-preview.ps1`. Leave `EXPO_PUBLIC_API_BASE_URL` blank. The app follows Expo's current host automatically: no IP edits when changing Wi-Fi or hotspots. Restart Expo and reopen its current QR code after changing networks.

The backend binds `0.0.0.0:8000` (all IPv4 interfaces). Bare `uvicorn app.main:app` defaults to loopback only; the launcher rejects such an existing listener. The Android preview script reverses both ports 8081 and 8000.

University Wi-Fi client isolation can still block peer access; use a shared hotspot then. Expo tunnel mode tunnels Metro only, not the API. Use an explicit hosted HTTPS API override for tunnel mode or deployed builds. Windows Firewall must allow Python on the active network profile.

Run TypeScript typecheck and Jest tests:
```powershell
npx tsc --noEmit
npm test
```
Start the Expo Metro Bundler:
```powershell
# For Android Emulator (auto-defaults to http://10.0.2.2:8000/api/v1):
npm run android

# For Physical Device (scans QR code from Expo Go app):
npx expo start

# For Web preview (uses http://localhost:8000/api/v1):
npm run web
```

---

## 8. Documentation Index

- [`Solvanta.md`](Solvanta.md) — Master product, domain, and academic specification.
- [`AntiGravity_prompt.md`](AntiGravity_prompt.md) — Authoritative engineering development contract and acceptance criteria.
- [`UI_DESIGN_SPEC.md`](UI_DESIGN_SPEC.md) — Exact visual design tokens, component wireframes, and screen specs.
- [`docs/STATUS.md`](docs/STATUS.md) — Current phase progress, test status, and blocker tracking.
- [`docs/PHASE_APPROVALS.md`](docs/PHASE_APPROVALS.md) — Official human approval and commit SHA ledger.
- [`docs/AGENT_HANDOFF.md`](docs/AGENT_HANDOFF.md) — Antigravity / GPT / User handoff and coordination log.
- [`docs/DECISIONS.md`](docs/DECISIONS.md) — Architecture Decision Records (ADRs).
- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — Complete system architecture and data flows.
- [`docs/API_CONTRACT.md`](docs/API_CONTRACT.md) — REST API endpoints, schemas, and error responses.
- [`docs/DOMAIN_ASSUMPTIONS.md`](docs/DOMAIN_ASSUMPTIONS.md) — Mathematical and physical energy balance rules.
- [`docs/TEST_PLAN.md`](docs/TEST_PLAN.md) — Comprehensive verification and QA strategy.
- [`docs/STAKEHOLDER_RESEARCH.md`](docs/STAKEHOLDER_RESEARCH.md) — Field interview questionnaires and defense methodology.
- [`docs/COMPETITOR_MATRIX.md`](docs/COMPETITOR_MATRIX.md) — Literature and market study of 15 commercial/research systems.
