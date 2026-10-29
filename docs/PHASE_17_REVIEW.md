# Phase 17 — Source Release Handoff

The source/API/Expo candidate is reproducible in a fresh checkout and dependency environments. Native AR/VR, remaining GUI overhaul and APK/dev-client packaging are explicitly deferred by the user. Full native release acceptance is not marked complete.

## Verification actually performed

- Direct shallow GitHub clone failed with a connection reset. A fresh local clone using `--no-hardlinks` matched GitHub main `314f8c83c6030060c814d7f7157e33d3688e67bc` exactly, then fetched committed Phase 17 fix `a7c752e`.
- New Python 3.13 environment installed requirements under committed constraints; `pip check` passed. New npm environment installed 916 packages with `npm ci --legacy-peer-deps`.
- Separate temporary PostgreSQL 16 on loopback port 5434 migrated from empty through `14_telemetry`. Development seed and repeat seed passed. Existing project databases were not reset.
- Fresh backend: **77 passed in 25.29s**, including real MCP subprocess transport and isolation tests. Initial mismatch unit test inherited the runner's test URL; explicit unit configuration fixed it in `a7c752e`; the complete suite passed on rerun.
- Fresh mobile: **34 passed, 12 suites**; TypeScript passed; Expo exported **14 routes**. Phase 17 changes do not modify mobile source.
- Temporary API on port 8004 reproduced 4 kWh requested/2 kWh total unmet, and reduced critical unmet from 2 to 0 kWh with protected dispatch. Schedule, approval/verification audit, forecast provenance and synthetic incidents passed.
- Official MCP 1.28.0 client called all nine tools against the isolated database: baseline matched REST, schedule validated and proposal stayed PENDING_APPROVAL.
- Existing n8n 2.45.6 workflows passed another actual run: shortage/anomaly VERIFIED, planner REJECTED without a run, restart during durable wait passed. This was not a fresh n8n installation.
- Authenticated mobile-web tool execution and light/dark interaction reviewed at 390px width; screenshots saved. Native Android/AR was not exercised.

Evidence: `evidence/phase17/`. Setup/demo/MCP/n8n instructions: `RELEASE_HANDOFF.md`. Phase commits and authorization: `DELIVERY_LEDGER.md`. README, architecture, API status, test plan and stakeholder status were corrected. The 15-system comparison cites primary sources, including Home Assistant's actual MCP support; missing documentation does not establish missing functionality.

## Remaining findings

Expo CLI/Zod advisory GHSA-mrhx-c7xc-m3w5 remains open (production npm audit: 5 low/3 high entries sharing one underlying high advisory). No incompatible override or SDK downgrade was forced. MCP emits a Pydantic startup warning although protocol checks pass. Latest GitHub Actions outcomes were not confirmed. Stakeholder interviews, observed forecast/hardware validation, native packaging and production certification remain unperformed. Deferred acceptance work is explicit in the handoff.
