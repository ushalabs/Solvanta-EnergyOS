# Solvanta — current status

Updated 3 November 2026. This describes branch `feat/sdk57-ar`, which is local and not merged. `main` is still at `03f19e2` on Expo SDK 58. Phases 0–16 delivered calibrated manual roof geometry, PV estimate, appliance constraints, simulation, persistence forecasting, scheduling, resilience, approval/replay, n8n, synthetic telemetry and nine real MCP tools. Phase 17 delivered the reproducible source/API/Expo candidate and handoff. Native AR from Phase 12 and native packaging/acceptance from Phase 17 remain outstanding.

Mobile runs on Expo SDK 57 (Expo 57.0.31, React 19.2.3, React Native 0.86.3), pinned by ADR-009 so ViroReact can be added later. ViroReact is not installed and the app has no AR code. The branch also carries the GUI pass and appliance popups from `d3fef20`.

Validated on this branch, 3 November 2026: 241 of 241 mobile tests in 21 suites, 120 of 120 backend tests, TypeScript, `npm ci --legacy-peer-deps`, web export without Firebase config (18 static routes), 54 of 54 browser flows at 390px against the local API and PostgreSQL, and expo-doctor 20 of 21. The failing doctor check is the `app.json` schema (`splash` property, non-square icon), which also failed before the downgrade. All of this is web or unit level. **Nothing on SDK 57 has been run on a native device or emulator from this branch.**

Earlier Phase 17 validation (fresh environments, empty PostgreSQL migrations, the MCP client and the n8n restart check) was not repeated here. See [test report](TEST_REPORT.md), [release handoff](RELEASE_HANDOFF.md), [Phase 17 report](PHASE_17_REVIEW.md) and [phase ledger](DELIVERY_LEDGER.md). The test report's numbers were measured on SDK 58, before this downgrade.

Open items:

- Native AR: not implemented. See [AR compatibility](AR_COMPATIBILITY.md) and [AR test plan](AR_TEST_PLAN.md).
- APK and dev-client transition not done; no current native completion claim.
- For the sign-in owner: a guest tapping **Sign In or Link Account** is redirected to Home, and the Firebase observer can restore guest mode over a successful sign-in.
- Production `npm audit`: 22 findings (1 low, 12 moderate, 9 high), up from 17 (1 low, 10 moderate, 6 high) on SDK 58. Sources include Firebase's `@grpc/grpc-js`, and `@expo/cli` and `expo-router` on the pinned SDK.
- MCP startup annotation warning recorded; protocol initialization and all tools passed when last run.
- Stakeholder interviews/usability acceptance, observed forecast accuracy and hardware validation unperformed.
- No production certification or unverified GitHub CI-green claim.

Earlier Android screenshots relate to earlier SDK baselines. Current architecture and contracts are in ARCHITECTURE.md, MCP.md and the running OpenAPI schema. Historical phase reports preserve earlier evidence and limits.
