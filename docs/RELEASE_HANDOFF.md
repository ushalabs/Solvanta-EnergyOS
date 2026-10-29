# Source/API/Expo release candidate handoff

Phase 17 delivers the reproducible local simulation workflow and nine MCP tools. The user deferred AR/VR, the remaining GUI overhaul and APK/dev-client packaging. Those native release acceptance items remain open; this is not a production deployment.

## Fresh setup

Verified: Windows 11, Python 3.13.7, Node 24.12.0/npm 11.6.2, PostgreSQL 16 and n8n 2.45.6. CI uses Python 3.13 and Node 24. Use committed constraints and the npm lockfile.

```powershell
git clone https://github.com/ushalabs/Solvanta-EnergyOS.git
cd Solvanta-EnergyOS
Copy-Item .env.example .env
docker compose up -d db
cd backend
python -m venv .venv
.venv/Scripts/python.exe -m pip install -r requirements.txt -c constraints.txt
.venv/Scripts/python.exe -m alembic upgrade head
.venv/Scripts/python.exe scripts/seed_demo_data.py
.venv/Scripts/python.exe -m pytest -q
cd ../mobile
Copy-Item .env.example .env
npm ci --legacy-peer-deps
npm test -- --runInBand
npx tsc --noEmit
cd ..
./scripts/start-phone-preview.ps1
```

Keep `EXPO_PUBLIC_API_BASE_URL` blank for current-LAN discovery. Reopen Expo's current QR/session after changing networks. Backend listens on all IPv4 interfaces; Wi-Fi client isolation or firewall policy may require a shared hotspot. A deployed binary will need a reachable HTTPS API configuration. Use the development account documented in the seed script. Example credentials are development-only; production settings reject the default signing key and production seeding is forbidden.

## Reproduce the demo

Start the API using `.venv/Scripts/python.exe run.py` from `backend` (or use the launcher), then run:

```powershell
cd backend
.venv/Scripts/python.exe scripts/verify_integrated_demo.py
.venv/Scripts/python.exe scripts/verify_mcp.py
```

The fixture creates a fresh Integration Verification site. Select it in Settings. Home → Loads shows two selected 1 kW loads. Roof shows calibrated geometry and zero irradiance. A full-day outage produces 4 kWh requested, 2 kWh total unmet and 2 kWh critical unmet. Resilience protects the later critical load: critical unmet becomes zero, total unmet remains 2 kWh. Scheduling is infeasible without PV/grid; clear outages for a validated schedule. Create/submit a plan, review immutable conditions, explicitly approve, simulate and verify. Scripted test approval is not the user's manual acceptance.

Replay displays the selected saved trace. Telemetry is explicitly SIMULATED; MODEL_MATCH means synthetic consistency, not physical repair. AI Operations lists nine authenticated tools, scenario IDs, units, numerical output and record IDs. No language model is connected. Proposals remain PENDING_APPROVAL. See [MCP setup](MCP.md) for stdio client configuration.

## n8n

```powershell
docker compose up -d n8n
backend/.venv/Scripts/python.exe scripts/configure-n8n.py
backend/.venv/Scripts/python.exe scripts/verify-n8n.py --reuse
```

Setup imports three credential-free exports, refreshes a local backend credential and publishes workflows. Temporary credential files are ignored and removed after import. Use n8n's owner-account login for its editor: legacy BASIC_AUTH variables in the old template are not evidence of n8n 2 editor authentication. The port is loopback-only. Verification approves/rejects labelled test plans and restarts n8n during a durable wait; avoid running it during an unrelated execution. See the [workflow runbook](../workflows/README.md). No third-party messaging service is configured.

## Evidence and limits

`evidence/phase17/clean-setup.json` records fresh Python/npm environments, empty-database migrations, repeat seed, 77 backend tests, 34 mobile tests, TypeScript and 14 exported web routes. Numerical and MCP reports were regenerated against the isolated clone's API/database. The initial clone matched GitHub main exactly, then received committed Phase 17 fix `a7c752e`. A direct network clone failed with a connection reset; the successful clone was local with no shared Git objects. This is an independent checkout/environment, not a second machine or human review.

`n8n-executions.json` records a final run on the existing local n8n instance: approved shortage/anomaly paths verified, planner rejected without execution, restart during wait passed. This was not a fresh n8n installation. Phone-width screenshots show current tool execution and light/dark review. Phase 15 evidence covers appliance toggles, roof, replay and scheduling. No current APK, development-client, physical-device or ARCore test was performed. See the [phase ledger](DELIVERY_LEDGER.md).

Open findings: Expo CLI/Zod advisory GHSA-mrhx-c7xc-m3w5 remains unresolved (production npm audit: 5 low/3 high entries; the high entries share that advisory). A major override or Expo downgrade was not validated. MCP emits a Pydantic lifespan annotation warning although protocol checks pass. Latest GitHub Actions outcomes were not confirmed. Actual stakeholder interviews/usability acceptance, observed forecast holdouts and hardware validation remain unperformed. The [15-system study](COMPETITOR_MATRIX.md) cites scoped primary evidence without unsupported feature-absence or superiority claims.

When native work resumes, validate a compatible AR stack on a supported physical device, test camera/tracking/scale/anchoring, finish the GUI overhaul and repeat native end-to-end/usability acceptance while preserving the SDK 58 baseline.
