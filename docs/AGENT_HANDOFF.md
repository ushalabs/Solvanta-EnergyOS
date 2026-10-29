# Solvanta — Agent Handoff & Phase Coordination Log

This document records chronological handoffs between engineering agents, autonomous roles, and user approvals.

---

### Phase 00 — 28 October 2026
- **Status:** APPROVED BY USER (28 Oct 2026)
- **Commit SHA:** 50140d3 on main and phase/00-repo-audit
- **Actions:** ADB added to User PATH; README team members anonymized; initial specifications, ADRs, test plan, competitor matrix committed.

---

### Phase 01 — 28 October 2026
- **Status:** APPROVED BY USER (28 Oct 2026)
- **Commit SHA:** d8c918a on main and phase/01-mobile-theme
- **Actions:** Built reference-matched neon mobile design system (7 screens, floating 5-tab dock, Dark default / Light option); executed 10 tests and TypeScript compile; verified live on Android emulator Downshift_Phase1 and web; captured 11+ UI screenshots in docs/ui-evidence/android/.

---

### Phase 02 Initial Review Corrections — 29 October 2026
- **Status:** Merged to main via PR #3 (SHA: af01159).

---

### Phase 02 Final Reviewer & Safety Corrections — 29 October 2026
- **Owner:** Google Antigravity
- **Repo Remote:** https://github.com/ushalabs/Solvanta-EnergyOS
- **Active Branch:** fix/phase-02-final-corrections
- **Review Baseline:** f4cfd29
- **Review & Safety Corrections Implemented:**
  1. **Strict Database Isolation & make_url() Parsing:** Parsed DATABASE_URL using SQLAlchemy's make_url(). Required BACKEND_ENV=test. Enforced that the parsed database name must equal the dedicated test database name ('solvanta_test_db'), preventing false passes when 'test' appears in username, password, or host.
  2. **Alembic Pre-Migration Guardrails:** Enforced that POSTGRES_DB and DATABASE_URL match exactly before any migration can execute, both in config settings and directly in alembic/env.py.
  3. **Destructive Migration Regression Test:** Added regression test proving that when POSTGRES_DB=solvanta_test_db but TEST_DATABASE_URL points to a production-named database, destructive migrations (command.downgrade) are intercepted by the safety guardrail and cannot execute.
  4. **Concurrent Organization Registration Flush:** Wrapped db.flush() inside transaction IntegrityError handling in auth.py; verified concurrent duplicate organization registrations reliably return HTTP 409 Conflict.
  5. **Ledger & Status Consistency:** Cleaned docs/PHASE_APPROVALS.md and docs/STATUS.md of merge markers and duplicate contradictory rows. Set baseline SHA to f4cfd29.
  6. **Physical Device Environment & Documentation:** Added mobile/.env.example and updated README.md Section 7 with LAN IP lookup, mobile .env setup, firewall tips, and health check validation.
  7. **Verification & Test Coverage:**
     - Backend Tests: 15/15 passed via pytest -v (health, ready, auth registration/login/me, concurrent org registration, buildings CRUD, constraints, multi-tenant isolation, isolation guardrails, migration regression, live E2E, migration downgrade/upgrade).
     - Mobile Tests: 16/16 passed via npm test.
     - Mobile Typecheck: npx tsc --noEmit clean with 0 errors.
     - Database Separation: solvanta_db (users=3, buildings=1, orgs=1) untouched; solvanta_test_db used for disposable test suite.
- **User Approval Status:** **APPROVED BY USER** (PR #5 merged to main `472fc4c`)
---

### Phase 03 — Building & Equipment Configuration Models — 29 October 2026
- **Owner:** Google Antigravity
- **Repo Remote:** https://github.com/ushalabs/Solvanta-EnergyOS
- **Active Branch:** phase/03-building-models
- **Deliverables Implemented:**
  1. **Comprehensive Equipment Database Models:**
     - Extended `buildings` table with decomposed equipment entities: Solar PV (`pv_panel_tilt_deg`, `pv_panel_azimuth_deg`, `pv_system_losses_pct`, `pv_module_count`, `pv_module_wattage_w`), Inverter (`inverter_efficiency_pct`, `inverter_type`), Battery (`battery_chemistry`), Backup Generator (`has_generator`, `generator_rating_kw`, `generator_fuel_type`, `generator_fuel_consumption_l_per_kwh`, `generator_min_runtime_min`), and Grid Interconnection (`grid_connection_type`, `grid_import_limit_kw`, `grid_export_limit_kw`, `has_net_metering`).
     - Added physical CheckConstraints for tilt (0-90°), azimuth (0-360°), losses (0-50%), inverter efficiency (50-100%), and non-negative ratings.
  2. **Alembic Migration & Seeding:**
     - Created migration `3a4b5c6d7e8f_phase3_equipment_models.py` with reversible `upgrade()` and `downgrade()`.
     - Seeded realistic equipment parameters for the demo twin (`Demo Residential Hybrid Solar`: 10.0 kWp PV, 25° tilt, 180° azimuth, 8.0 kW hybrid inverter, 10.0 kWh LFP battery, 5.0 kW diesel generator, three-phase grid).
  3. **Pydantic Schemas & API Endpoints:**
     - Added `SolarConfig`, `InverterConfig`, `BatteryConfig`, `GeneratorConfig`, `GridConfig`, `EquipmentSummary` schemas with field-level physical validators.
     - Added decomposed equipment inspection endpoint `GET /api/v1/buildings/{building_id}/equipment`.
     - Preserved backward compatibility with Phase 2 flat schemas and routes.
  4. **Mobile Equipment Editor UI:**
     - Built `mobile/src/components/BuildingEquipmentEditor.tsx` in `settings.tsx` with high-contrast neon theme, unit badges, numeric inputs, live physical validation, and dual-mode persistence (`api` + `AsyncStorage`).
  5. **Verification & Test Coverage:**
     - Backend Tests: 18/18 passed via `pytest -v` (including CRUD, physical constraints, cross-tenant isolation, Alembic downgrade to base & upgrade to head).
     - Mobile Tests: 18/18 passed via `npm test`.
     - Mobile Typecheck: `npx tsc --noEmit` clean with 0 errors.
- **User Approval Status:** **PHASE 3 COMPLETE — AWAITING USER APPROVAL**
- **Next Phase:** Phase 04 — Rooftop Computer Vision & Geometry Editor (LOCKED until user approval).

---

### Phase 03 Independent Review Corrections — 29 October 2026
- **Owner:** Google Antigravity
- **Repo Remote:** https://github.com/ushalabs/Solvanta-EnergyOS
- **Active Branch:** `phase/03-building-models`
- **Review Corrections Completed:**
  1. **Mobile Authentication & Server Persistence:**
     - Added minimal, reliable FastAPI JWT authentication card in `mobile/src/components/BuildingEquipmentEditor.tsx` (Sign In / Sign Out, token persistence via `apiClient.setToken`, demo credentials auto-fill with `Solvanta2026!`).
     - Scoped local storage keys by authenticated user and building ID: `@solvanta_equipment_${userId}_${buildingId}` to avoid unintended cross-user or first-building overwrites.
     - Strict status segregation: `synced` (green banner confirmed against PostgreSQL record), `local_draft` (amber banner for offline edits), and `error` (red banner displaying HTTP 401/403/422 status and detail message). Failed saves never display success.
     - Authoritative server reload updates UI state directly from PostgreSQL response.
  2. **Physical Consistency & Conflict Detection:**
     - Added `check_field_conflict(flat_val, nested_val, field_name)` across `SolarConfig`, `InverterConfig`, `BatteryConfig`, `GeneratorConfig`, and `GridConfig` to reject conflicting nested vs flat inputs with HTTP 422 instead of silently choosing one.
     - Implemented **Derived-Capacity Rule** for PV: when module count/wattage are omitted, dynamically derives `module_count` and `module_wattage_w` from `pv_capacity_kwp` based on standard 550W baseline. When both are explicitly declared, validates that $|pv\_capacity\_kwp - (count \times wattage / 1000)| \le \max(0.5, 0.05 \times pv\_capacity\_kwp)$.
     - Added strict generator validation rejecting `enabled=True` when `rating_kw <= 0`.
     - Preserved battery constraints (usable <= nominal, initial SoC >= reserve limit) and multi-tenant organization isolation.
  3. **Complete Phase 3 Mobile Editor:**
     - Added interactive inputs for all decomposed equipment parameters: PV module count, wattage, tilt, azimuth, system losses; Inverter AC rating, efficiency, topology picker (`hybrid`, `string`, `microinverter`, `central`); Battery nominal, usable, initial SoC, reserve limit, charge/discharge rates, round-trip efficiency, chemistry picker (`LFP`, `NMC`, `lead_acid`); Generator rating, fuel consumption, minimum runtime, fuel type picker; Grid sanctioned import, export limit, phase type picker (`3-Phase`, `1-Phase`), net-metering switch.
     - Form-level physical validation before submission.
     - Preserved dark/light theme switching.
  4. **Verification & Test Coverage:**
     - Backend Tests: **21 / 21 passed** via `pytest -v` (+3 new suites in `test_phase3_equipment.py` covering nested vs flat conflicts, PV capacity physical consistency, and generator validation).
     - Mobile Tests: **23 / 23 passed** via `npm test` (+5 new real form interaction tests in `equipment_form.test.tsx` testing render, pre-submit validation, HTTP 422/401 error handling without false success, and authenticated save flow).
     - Mobile Typecheck: `npx tsc --noEmit` exited cleanly with **0 errors**.
     - Live Android Evidence: Captured 6 live screenshots from `emulator-5554` (`Downshift_Phase1`) into `docs/ui-evidence/phase3/`.


### Phase 3 LAN fix — Codex, 29 October 2026
- Root cause: actual process command was `uvicorn app.main:app --reload`, listening on 127.0.0.1:8000. The screenshot IP was correctly assigned to Wi-Fi; the backend was inaccessible there.
- Restarted via the repo launcher on 0.0.0.0; readiness and demo authentication succeeded using the Wi-Fi address.
- Removed the local pinned API IP. Client now follows Expo hostUri on each request, with explicit URL override retained for hosted APIs. Added changing-network and React Native cancellation regressions; emulator preview reverses API and Metro ports.
- Validation: 21 backend tests, 25 mobile tests, TypeScript clean. Physical phone follow-up remains user validation; no claim that Wi-Fi isolation was tested remotely.
- User explicitly authorized continuation through Phase 6, end-of-phase validation and commit/push after each phase. This supersedes earlier per-phase approval gates through 6.

### Phase 4 — Codex
Implemented measured roof geometry and persisted placement. See PHASE_04_REVIEW.md for validation and limitations. Optional CV proposals remain omitted; manual geometry is functional.

### Phase 5 — Codex
PV design and 24-hour typed generation profile added. See PHASE_05_REVIEW.md. User authorized continuation through Phase 6.

### Phase 6 — Codex
Saved appliance CRUD, validated run windows and interruption limits, and separate scenario selections with server-calculated demand. See PHASE_06_REVIEW.md. No physical switching implemented.

### Branch integration — 29 October 2026
Phase 4 dedicated branch phase/04-roof-geometry merged to main at 5152a0a (original Phase 4 content had already entered via PR #7). Phase 5 branch phase/05-pv-generation merged at 9996bf3. Phase 6 branch phase/06-appliance-twin merged at b2bd4ec. All three branches were pushed before their dedicated merge commits.

### Phase 7 — Codex
Deterministic quarter-hour energy balance, saved input snapshots and trace, authenticated history and mobile interval replay. Validation: 47 backend / 29 mobile tests, TypeScript and web export. See PHASE_07_REVIEW.md.

### Phase 8 — Codex
Deterministic configured/latest-simulation forecast providers with explicit provenance and shortage projection, low-data fallback and mobile PV/load chart. No trained-model accuracy claimed. Full suite: 50 backend, 29 mobile tests, TypeScript and web export. See PHASE_08_REVIEW.md.
