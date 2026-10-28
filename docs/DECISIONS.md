# Solvanta — Architecture Decision Records (ADRs)

This document records the architectural and engineering decisions governing Solvanta FYP-I and FYP-II.

---

## ADR-001: Mobile Framework, Expo SDK Baseline, and AR Fallback Strategy
* **Status:** ACCEPTED  
* **Date:** 28 October 2026  
* **Context:**  
  The mobile application requires an Android-first React Native implementation featuring custom design tokens, high-density SVG/canvas charts, and a rooftop AR preview. On 28 October 2026, Expo SDK 58 is released, but ViroReact's published Expo integration guide specifies peer compatibility through Expo SDK 57.
* **Decision:**  
  1. We will establish a clean React Native + Expo + TypeScript + Expo Router codebase.
  2. For AR compatibility, we will conduct an SDK spike in Phase 1: if ViroReact requires SDK 57, we lock to SDK 57 for stable native builds; if SDK 58 peer ranges can be cleanly satisfied, we pin SDK 58.
  3. Under all circumstances, the 2D rooftop polygon and panel layout editor will remain 100% functional on every device without requiring AR hardware. AR preview will feature an explicit capability detection gate (`ARCapabilityFallback`) that prevents app crashes on unsupported hardware.
* **Consequences:**  
  - No risk of bricking mobile development if AR native dependencies encounter compatibility issues.
  - Development builds (`expo run:android` / EAS dev client) will be used for native testing; Expo Go will be used for non-AR UI development.

---

## ADR-002: Backend Architecture & Persistence
* **Status:** ACCEPTED  
* **Date:** 28 October 2026  
* **Context:**  
  The backend must serve the mobile application, execute CPU-bound energy calculations, coordinate with n8n webhooks, and expose typed MCP tools.
* **Decision:**  
  1. Use Python 3.11+ with **FastAPI** for asynchronous REST routes and typed OpenAPI contract generation.
  2. Use **SQLAlchemy 2.0 (async)** with **Alembic** migrations and **Pydantic v2** for data validation and schema serialization.
  3. Run **PostgreSQL 16 Alpine** inside local Docker Compose with partitioned/indexed tables for 15-minute simulation time series.
  4. Enforce clean separation of concerns: API route handlers are thin adapters that invoke pure domain engines.
* **Consequences:**  
  - Full type safety between Python models and API responses.
  - Reproducible database schema lifecycle across developer environments.

---

## ADR-003: Pure Deterministic Energy Simulation Engine
* **Status:** ACCEPTED  
* **Date:** 28 October 2026  
* **Context:**  
  Energy balance, battery state of charge (SoC), and outage calculations must be scientifically reproducible and mathematically sound. LLMs must never perform arithmetic calculations.
* **Decision:**  
  1. Implement the energy simulator as a pure, deterministic Python module with zero external database or network dependencies.
  2. Timesteps will be parameterized to 15-minute intervals (96 intervals per 24 hours).
  3. Given the same inputs (solar profile, building load demands, battery parameters, outage window, random seed), the engine must produce bit-for-bit identical time-series results.
* **Consequences:**  
  - Easily tested with unit tests and hand-calculated fixtures.
  - Protects users from AI hallucinations regarding battery life or solar generation.

---

## ADR-004: Appliance Scheduling via Constraint Satisfaction (OR-Tools)
* **Status:** ACCEPTED  
* **Date:** 28 October 2026  
* **Context:**  
  Scheduling flexible appliances (e.g. water pumps, washing machines, EV chargers) during solar surplus or critical outage periods requires handling hard constraints (earliest start, latest completion, non-interruptible runs, power caps).
* **Decision:**  
  1. Use **Google OR-Tools (CP-SAT solver)** to formulate the scheduling problem as a discrete constraint satisfaction and integer programming model.
  2. Objective function will prioritize critical load continuity, maximize direct solar self-consumption, and minimize peak battery discharge.
  3. Include an independent validator that checks solver output against physical feasibility before presenting schedules to users.
* **Consequences:**  
  - Guaranteed mathematical optimality or clear conflict explanations when constraints are infeasible.
  - Avoids brittle heuristic rule sets.

---

## ADR-005: Workflow Automation Boundary (n8n vs Backend)
* **Status:** ACCEPTED  
* **Date:** 28 October 2026  
* **Context:**  
  The system includes n8n for automated event response (e.g., energy shortage response, daily planning triggers, anomaly alerts).
* **Decision:**  
  1. **FastAPI owns all domain calculation, business logic, authorization, and approval states.**
  2. n8n acts strictly as an asynchronous event orchestrator, scheduler, and notification dispatcher.
  3. n8n communicates with FastAPI via signed, idempotent webhooks (`event_id`, `correlation_id`).
  4. n8n is never permitted to approve an energy plan autonomously or execute physical control.
* **Consequences:**  
  - Security and mathematical integrity remain centralized in the Python backend.
  - No domain logic is locked inside proprietary n8n JSON nodes.

---

## ADR-006: Model Context Protocol (MCP) Server Architecture
* **Status:** ACCEPTED  
* **Date:** 28 October 2026  
* **Context:**  
  AI assistants (e.g. Claude Desktop, local agents) need to inspect building profiles, run simulations, and propose energy plans via MCP.
* **Decision:**  
  1. Use the official **Python MCP SDK** (v2 pinned stable API).
  2. Expose a minimum of 7 (targeting all 9) typed tools wrapping existing FastAPI application services.
  3. Support stdio transport for local smoke testing and Streamable HTTP with token authentication for networked clients.
  4. Tool `propose_energy_plan` creates a plan in `PENDING_APPROVAL` status; MCP never exposes an automatic plan approval tool.
* **Consequences:**  
  - Full compliance with modern AI assistant standards.
  - Complete reuse of tested service code; zero duplication of business logic.

---

## ADR-007: Visual Design Identity & Theme Architecture
* **Status:** ACCEPTED  
* **Date:** 28 October 2026  
* **Context:**  
  The user provided an authoritative reference screenshot (`design/reference/Neon_Smart_Home_Reference.png`) showing a high-end neon-lime on charcoal/near-black theme with floating navigation dock.
* **Decision:**  
  1. Dark mode is the primary and default theme on first application launch.
  2. Canvas uses near-black `#090B0A`, surfaces use matte graphite `#1B1D1B`, with acid/neon-lime `#C6F43D` gradient highlights.
  3. A persistent Light mode (`#F5F7F1` canvas) is implemented and toggleable via Settings.
  4. Theme state is rehydrated synchronously from device storage to prevent visual flash on cold launch.
  5. The floating dock uses a capsule style with 5 tabs: Home, Appliances, Simulation, Rooftop, AI.
* **Consequences:**  
  - Pixel-accurate compliance with the user's design requirements.
  - High aesthetic quality suitable for academic FYP defense and commercial demo.

---

## ADR-008: Hardware and Telemetry Boundary (FYP-I vs FYP-II)
* **Status:** ACCEPTED  
* **Date:** 28 October 2026  
* **Context:**  
  Clear delineation is required between FYP-I (simulation-driven prototype) and FYP-II (physical hardware integration).
* **Decision:**  
  1. In FYP-I, all live telemetry is generated by a `SimulationProvider` that feeds simulated time series marked with `provenance: "SIMULATED"`.
  2. We design a normalized `TelemetryProvider` abstract base class so that in FYP-II, a `SupportedInverterProvider` (e.g. Inverex Modbus TCP) can be plugged in without refactoring core services.
  3. The mobile UI and API will never claim physical device actuation or live connection in FYP-I.
* **Consequences:**  
  - Academic integrity is preserved; no false claims of hardware control.
  - Clean architectural bridge to FYP-II.
