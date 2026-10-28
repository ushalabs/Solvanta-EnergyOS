# Solvanta — REST API Contract (v1)

**Base URL:** `/api/v1`  
**Protocol:** HTTP/1.1 & WebSocket  
**Authentication:** Bearer JWT Token (`Authorization: Bearer <token>`)  
**Data Format:** JSON (`Content-Type: application/json; charset=utf-8`)

---

## 1. General Principles & Error Standards

### 1.1 Standard Error Envelope
All error responses adhere to RFC 7807 problem details:
```json
{
  "error": {
    "code": "INVALID_CONSTRAINTS",
    "message": "Appliance runtime exceeds available outage window.",
    "status": 422,
    "details": [
      {
        "field": "appliances.water_pump.required_runtime_min",
        "issue": "Requested 120 minutes, window only has 90 minutes."
      }
    ],
    "timestamp": "2026-10-28T16:00:00Z"
  }
}
```

### 1.2 Data Provenance Tagging
Every time-series metric and numerical output carries an explicit provenance indicator:
- `synthetic`: Generated test fixture / benchmark.
- `user_entered`: Direct human input (e.g., nameplate power rating).
- `calculated`: Deterministic mathematical engine output.
- `forecast`: Statistical or predictive model projection.
- `simulated`: Simulated telemetry or scenario timeline.
- `live`: Real-time hardware telemetry (FYP-II only; strictly unavailable in FYP-I).

---

## 2. Core Endpoint Specifications

### 2.1 System Health
* **`GET /health`**
  - Returns `200 OK` with basic service status.
  - Response: `{"status": "ok", "version": "1.0.0", "timestamp": "2026-10-28T16:00:00Z"}`
* **`GET /ready`**
  - Returns `200 OK` when DB connection and core engine dependencies are active.
  - Response: `{"ready": true, "database": "connected", "engines": "initialized"}`

### 2.2 Buildings & Equipment
* **`POST /api/v1/buildings`**
  - Creates a new building / site record.
  - Payload:
    ```json
    {
      "name": "Demo Residential Hybrid Solar",
      "timezone": "Asia/Karachi",
      "address": "Lahore, Pakistan",
      "pv_capacity_kwp": 10.0,
      "inverter_rating_kw": 8.0,
      "battery": {
        "nominal_capacity_kwh": 10.0,
        "usable_capacity_kwh": 9.0,
        "initial_soc_pct": 70.0,
        "minimum_soc_pct": 20.0,
        "max_charge_kw": 4.0,
        "max_discharge_kw": 4.0,
        "round_trip_efficiency": 0.90
      }
    }
    ```
* **`GET /api/v1/buildings/{id}`**
  - Retrieves building configuration and summary.

### 2.3 Appliance Digital Twin
* **`GET /api/v1/buildings/{id}/appliances`**
  - Lists all registered loads for the building.
* **`POST /api/v1/buildings/{id}/appliances`**
  - Registers a new appliance.
  - Payload:
    ```json
    {
      "name": "Water Pump",
      "rated_power_w": 1000,
      "priority": "medium",
      "flexible": true,
      "required_runtime_min": 30,
      "earliest_start_minute": 360,
      "latest_end_minute": 720,
      "can_interrupt": false
    }
    ```
* **`PATCH /api/v1/buildings/{id}/appliances/{appliance_id}`**
  - Updates appliance parameters or priority.
* **`DELETE /api/v1/buildings/{id}/appliances/{appliance_id}`**
  - Removes an appliance from the building profile.

### 2.4 Rooftop CV & Layout
* **`POST /api/v1/roof/analyze`**
  - Ingests roof imagery, returns boundary proposals and obstruction masks.
* **`POST /api/v1/roof/layout`**
  - Computes panel placement polygon footprint, orientation, usable area ($m^2$), and aggregate kWp capacity based on calibrated scale.

### 2.5 Scenarios & Simulations
* **`POST /api/v1/scenarios`**
  - Creates a simulation scenario (outage window, battery start state, active appliance toggles).
* **`POST /api/v1/simulations`**
  - Runs a deterministic 15-minute discrete energy balance simulation.
  - Payload: `{"scenario_id": "scen_123", "baseline_only": false}`
* **`GET /api/v1/simulations/{id}`**
  - Returns simulation KPI summary:
    ```json
    {
      "id": "sim_456",
      "scenario_id": "scen_123",
      "total_energy_generated_kwh": 28.4,
      "total_energy_consumed_kwh": 22.1,
      "critical_load_coverage_pct": 86.4,
      "unserved_critical_kwh": 1.2,
      "unserved_total_kwh": 3.8,
      "final_soc_pct": 20.0,
      "provenance": "simulated"
    }
    ```
* **`GET /api/v1/simulations/{id}/timeline`**
  - Returns time-series intervals (96 intervals for 24 hours):
    `[timestamp, solar_kw, load_requested_kw, load_served_kw, battery_soc_pct, battery_flow_kw, grid_kw, unserved_kw]`

### 2.6 Optimization & Scheduling
* **`POST /api/v1/schedules/optimize`**
  - Solves OR-Tools CP-SAT constrained schedule for flexible appliances.
* **`POST /api/v1/resilience/optimize`**
  - Generates optimal outage dispatch and load shedding policy.
* **`POST /api/v1/configurations/compare`**
  - Evaluates what-if configuration variations (e.g. +5kWh battery vs +2kWp solar).

### 2.7 Energy Plans & Human Approval State Machine
* **`POST /api/v1/energy-plans`**
  - Creates a proposed plan (`DRAFT`).
* **`GET /api/v1/energy-plans/{id}`**
  - Returns plan status, scheduled load actions, and predicted KPIs.
* **`POST /api/v1/energy-plans/{id}/submit`**
  - Transitions plan to `PENDING_APPROVAL`.
* **`POST /api/v1/energy-plans/{id}/approve`**
  - Transitions plan to `APPROVED`. Requires authenticated user signature. Logs audit entry.
* **`POST /api/v1/energy-plans/{id}/reject`**
  - Transitions plan to `REJECTED`.
* **`POST /api/v1/energy-plans/{id}/request-modification`**
  - Transitions plan to `MODIFICATION_REQUESTED` with human notes.
* **`POST /api/v1/energy-plans/{id}/simulate`**
  - Executes revised simulation against approved plan. Marks plan `SIMULATED`.

### 2.8 Operations & Verification
* **`GET /api/v1/telemetry/simulated`**
  - Returns time series from `SimulationProvider` labeled `provenance: "SIMULATED"`.
* **`GET /api/v1/incidents`**
  - Lists anomaly incidents with suspected causes and evidence logs.
* **`GET /api/v1/verification/{id}`**
  - Compares planned/approved performance against simulated operational trace.

### 2.9 Internal Automation Events
* **`POST /api/v1/internal/workflow-events`**
  - Idempotent webhook receiver for n8n orchestrator events (`event_id`, `correlation_id`).
