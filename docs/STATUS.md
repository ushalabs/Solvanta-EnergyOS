# Solvanta — current status

Updated 29 October 2026. Phases 0–16 delivered calibrated manual roof geometry, PV estimate, appliance constraints, simulation, persistence forecasting, scheduling, resilience, approval/replay, n8n, synthetic telemetry and nine real MCP tools. Phase 17 delivers the reproducible source/API/Expo candidate and handoff. Native AR from Phase 12 and native packaging/acceptance from Phase 17 remain outstanding under the user's explicit deferral.

Validation passed: 77 backend tests, 34 mobile tests, TypeScript, 14-route web export, fresh Python/npm environments, empty PostgreSQL migrations/repeat seed, isolated numerical demo, nine-tool MCP client and final n8n approval/rejection/restart check. An environment-dependent isolation unit test was corrected and the full suite rerun. Authenticated web tools and light/dark themes were reviewed at 390px width.

See [release handoff](RELEASE_HANDOFF.md), [Phase 17 report](PHASE_17_REVIEW.md) and [phase ledger](DELIVERY_LEDGER.md). Separate phase branches are pushed and merged to main under direct user authorization. Delivery authorization is not manual or stakeholder acceptance; earlier per-phase waiting instructions are superseded.

Open items:

- AR/VR, remaining GUI overhaul and APK/dev-client transition deferred; no current native completion claim.
- Expo CLI/Zod advisory unresolved: production npm audit 5 low/3 high entries sharing one underlying high advisory.
- MCP startup annotation warning recorded; protocol initialization and all tools pass.
- Stakeholder interviews/usability acceptance, observed forecast accuracy and hardware validation unperformed.
- No production certification or unverified GitHub CI-green claim.

Earlier Android screenshots relate to earlier SDK baselines. Current architecture and contracts are in ARCHITECTURE.md, MCP.md and the running OpenAPI schema. Historical phase reports preserve earlier evidence and limits.
