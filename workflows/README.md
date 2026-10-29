# Local n8n automation

Runtime: n8n 2.45.6. Compose exposes the editor on localhost:5678. Use n8n owner authentication for editor access; backend building authorization remains authoritative.

1. Start PostgreSQL and n8n with `docker compose up -d db n8n`.
2. Apply migrations and seed backend demo data, then run `scripts/start-backend.ps1`.
3. Run `backend/.venv/Scripts/python.exe scripts/configure-n8n.py`. It creates a labelled demo building, stores a backend bearer token in n8n credentials and imports/publishes the three templates. Temporary credential files are deleted and never tracked. Rerun setup to refresh the expiring token. Use a dedicated scoped service identity for deployment.
4. Review notices and pending plans in Simulation. Plans require explicit approval. n8n checks state after a 70-second durable wait, simulates approved plans and invokes verification. Rejection/expiry terminates the workflow. Modification requests remain waiting for revision and resubmission.
5. Run `backend/.venv/Scripts/python.exe scripts/verify-n8n.py` for seeded live webhook tests. It records whitelisted execution metadata under docs/evidence/phase13. A restart during the wait tests durability. `--reuse` keeps imported definitions while refreshing credentials.

Templates include authenticated webhook and manual triggers; Daily Planner also has a 07:00 Asia/Karachi schedule. Setup substitutes CONFIGURE_BUILDING_ID with the demo site. Credential ID solvanta-backend-auth contains no token in these exports. Events carry event_id, correlation_id and plan revision. Requests use bounded retries and backend idempotency. Do not commit credential-bearing execution payloads.

The backend owns expiry, access checks, revisions and simulation invariants. n8n performs simulation orchestration only. The anomaly workflow accepts an explicit incident event; detector integration follows in Phase 14.
