# Solvanta — Master Quality Assurance & Test Plan

This document details the test strategy, verification invariants, regression fixtures, and automated test suites across all 18 phases of Solvanta FYP-I.

---

## 1. Quality Strategy & Testing Pyramid

```text
                  ▲
                 / \
                /   \     E2E Seeded Outage & Plan Lifecycle
               / E2E \    (Mobile UI -> API -> Sim -> Opt -> Plan -> Verification)
              /-------\
             /   MCP   \   MCP Inspector & Official Python SDK Smoke Tests
            /-----------\  (9 typed tools, stdio & HTTP transport)
           / Integration \ FastAPI Routes, DB Migrations, Docker, n8n Webhooks
          /---------------\
         / Domain Invariants\ Energy Conservation, SoC Bounds, Outage Supply Zero
        /-------------------\
       /      Unit Tests     \ Pure Python Engines (PV, Sim, OR-Tools, CV Polygon)
      /-----------------------\
```

---

## 2. Core Domain Invariants (Non-Negotiable)

Every simulation and optimization run must pass these invariant checks in automated CI:

| Invariant ID | Name | Mathematical / Logical Condition | Failure Response |
|---|---|---|---|
| **INV-01** | **Energy Conservation** | $\|(E_{\text{pv}} + E_{\text{grid}} + E_{\text{bat,dis}} + E_{\text{gen}}) - (E_{\text{load,served}} + E_{\text{bat,chg}} + E_{\text{curtail}} + E_{\text{losses}})\| \le 10^{-4}\text{ kWh}$ | Reject run with `ENERGY_BALANCE_VIOLATION` |
| **INV-02** | **Nighttime Solar** | If $G_{\text{irradiance}}(t) = 0$, then $P_{\text{pv}}(t) \equiv 0\text{ kW}$ | Reject run with `PHANTOM_SOLAR_GENERATION` |
| **INV-03** | **Grid Outage Isolation** | If $IsOutage(t) = \text{true}$, then $P_{\text{grid,in}}(t) \equiv 0\text{ kW}$ and $P_{\text{grid,out}}(t) \equiv 0\text{ kW}$ | Reject run with `GRID_ISLANDING_VIOLATION` |
| **INV-04** | **Battery SoC Bounds** | $SoC_{\text{min}} \le SoC(t) \le SoC_{\text{max}} \quad \forall t \in [0, T]$ | Reject run with `BATTERY_SOC_OUT_OF_BOUNDS` |
| **INV-05** | **Battery Power Limits** | $0 \le P_{\text{bat,dis}}(t) \le P_{\text{dis,max}}$ and $0 \le P_{\text{bat,chg}}(t) \le P_{\text{chg,max}}$ | Reject run with `BATTERY_C_RATE_EXCEEDED` |
| **INV-06** | **Critical Load Honesty** | If demand > supply, report $E_{\text{unserved,crit}} > 0$. Never hide unserved load. | Reject run with `UNSERVED_ENERGY_MASKED` |
| **INV-07** | **Scheduler Feasibility** | Flexible loads satisfy earliest start, latest end, and continuous run constraints. | Reject run with `INVALID_SCHEDULE_TIMING` |
| **INV-08** | **Approval Guard** | No plan may transition to `APPROVED` without authenticated user signature. | Reject transition with `403 FORBIDDEN` |

---

## 3. Test Suites by Subsystem

### 3.1 Backend & Engine Tests (`backend/tests/`)
- `test_pv_engine.py`: Tests panel kWp sizing, DC/AC clipping, temperature losses, zero solar at night.
- `test_energy_simulation.py`: Tests 15-minute discrete simulation against hand-calculated fixtures. Validates INV-01 through INV-06.
- `test_scheduler_ortools.py`: Formulates OR-Tools CP-SAT problems with non-interruptible appliances and validates schedule feasibility.
- `test_resilience_optimizer.py`: Asserts critical load preservation vs unoptimized baseline during simulated grid failure.
- `test_plan_state_machine.py`: Asserts transitions (`DRAFT` $\to$ `PENDING` $\to$ `APPROVED` $\to$ `SIMULATED`). Rejects unauthorized/duplicate execution.
- `test_api_routes.py`: FastAPI test client testing authentication, building CRUD, scenario execution, error envelopes.

### 3.2 Mobile Quality Gates (`mobile/__tests__/`)
- `test_tokens.py`: Asserts all dark and light color tokens match `UI_DESIGN_SPEC.md`.
- `test_floating_dock.py`: Asserts dock renders 5 tabs and maintains safe area offsets.
- `test_theme_persistence.py`: Asserts dark mode is first-launch default; persists light mode selection across app rehydration.
- `test_screen_shells.py`: Smoke render test for all 7 screens without runtime errors.
- Visual Inspection: Actual screenshot audit recorded in `docs/ui-evidence/` comparing against `Neon_Smart_Home_Reference.png`.

### 3.3 Automation & n8n Verification
- Test webhook dispatch from FastAPI with `event_id` and `correlation_id`.
- Test n8n workflow execution against seeded outage event; verify approval wait condition behaves idempotently.

### 3.4 MCP Server Verification
- Official Python MCP SDK client smoke test.
- Query tools list (assert $\ge 7$ registered tools).
- Invoke `get_energy_scenario`, `run_outage_simulation`, `optimize_resilience` via stdio and verify typed outputs match REST outputs.
- Assert `propose_energy_plan` leaves plan in `PENDING_APPROVAL` status.

---

## 4. End-to-End Seeded Acceptance Scenario

1. **Building Baseline:**
   - Name: `Demo Residential Hybrid Solar` (Lahore, PK).
   - Solar: $10\text{ kWp}$ PV array, $8\text{ kW}$ hybrid inverter.
   - Battery: $10\text{ kWh}$ nominal ($9\text{ kWh}$ usable), initial $SoC = 70\%$, reserve minimum $SoC = 20\%$.
2. **Appliance Profile:**
   - Fridge: $250\text{ W}$, Critical, non-flexible, continuous.
   - Lights: $300\text{ W}$, Medium, non-flexible, continuous.
   - Computer: $400\text{ W}$, High, non-flexible, continuous.
   - AC: $1500\text{ W}$, Low, flexible, initial ON.
   - Water Pump: $1000\text{ W}$, Medium, flexible, runtime 30 min, initial OFF.
3. **Outage Scenario:**
   - Duration: 6 hours (18:00 to 24:00). Zero solar ($P_{\text{pv}} = 0$). Grid unavailable ($P_{\text{grid}} = 0$).
4. **Execution Acceptance Check:**
   - Baseline Run: AC drains battery to $20\%$ reserve by 21:00; critical fridge unserved from 21:00 to 24:00 (critical coverage $\approx 86\%$).
   - Resilience Optimization: Sheds AC at 18:00; preserves battery for fridge, computer, and lights throughout all 6 hours ($100\%$ critical coverage).
   - Human Approval: User approves plan; simulation verifies revised trajectory; result auditable in PostgreSQL.
