# Local MCP and operations tools

The official Python MCP SDK is pinned to `mcp==1.28.0`, the v1 maintenance line. The implementation follows the [official server](https://py.sdk.modelcontextprotocol.io/v1/server/) and [client](https://py.sdk.modelcontextprotocol.io/v1/client/) APIs. It uses real stdio JSON-RPC, not simulated tool messages. No LLM subscription is needed.

From `backend`, install requirements and run `python -m app.mcp_server`. Configure the MCP client with that command, the absolute backend working directory, and `SOLVANTA_MCP_TOKEN` containing a valid backend JWT. Obtain it through the normal local login API; keep it in process environment/secret storage, never committed configuration or command arguments. The token's active user is validated for every call. Restart the process with a refreshed token when it expires. Each process represents one authenticated principal; never share its stdio session across users. No MCP HTTP listener is opened.

`scenario_id` is an existing saved simulation run UUID. Snapshot tools use its immutable plant, appliance, PV and outage inputs, regardless of later equipment edits. Baseline simulation reruns baseline dispatch; approved-plan dispatch intentionally applies critical protection and may differ from baseline. Forecasting persists the selected run's daily profiles from its final battery SoC and does not imply weather prediction or trained accuracy.

| Tool | Arguments | Behavior |
|---|---|---|
| get_building_profile | building_id UUID | Authorized saved equipment |
| get_energy_scenario | scenario_id UUID | Immutable snapshot and saved result |
| run_outage_simulation | scenario_id UUID | Persist baseline simulation |
| forecast_energy | scenario_id UUID | Deterministic persistence projection |
| optimize_appliance_schedule | scenario_id UUID | Persist independently validated PV/grid schedule if feasible |
| optimize_resilience | scenario_id UUID | Persist baseline/critical-reserve comparison |
| compare_energy_configurations | scenario_id UUID, variations [0,1,2] subset | Current, battery +50%, PV +25% hypothetical presets |
| get_energy_anomalies | building_id UUID | Persisted SIMULATED incidents |
| propose_energy_plan | scenario_id UUID | Persist PENDING_APPROVAL plan, expires in 60 minutes |

Responses have typed JSON output schemas, building/scenario/new-record IDs, units and source provenance. All engines are deterministic/synthetic. Capacity variants do not establish installation feasibility or cost. Scheduler budget excludes battery/generator, and generator-enabled scenarios are rejected by that tool. Infeasibility and search timeout remain explicit results. Mutating calls create new records; clients must not automatically retry an uncertain mutation. No approval, hardware dispatch, arbitrary SQL, shell or network tools are exposed.

The mobile AI Operations page uses bearer-authenticated `GET /api/v1/operations/tools` and `POST /api/v1/operations/tools/{name}`. This is an HTTP gateway to the same tool service, not the MCP wire transport or LLM chat. Select a saved scenario, execute a tool, inspect numerical output/source IDs, then use Human Plan Review for approval.

Reproduce the real stdio smoke test after `python scripts/verify_integrated_demo.py` has created the Phase 15 fixture: `python scripts/verify_mcp.py`. It calls all nine tools, compares baseline output with REST, checks a validated schedule, a pending-only proposal, invalid UUID and missing approval tool, and writes a credential-free report to `docs/evidence/phase16/mcp-client.json`. Automated pytest additionally checks forged credentials and cross-tenant gateway access against the isolated test database.
