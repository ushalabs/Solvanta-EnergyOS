# Solvanta — current status

Updated 3 November 2026. This describes branch `feat/ar-viro`, which is local and not merged. It is built on `feat/sdk57-ar`. `main` is still at `03f19e2` on Expo SDK 58. Phases 0–16 delivered calibrated manual roof geometry, PV estimate, appliance constraints, simulation, persistence forecasting, scheduling, resilience, approval/replay, n8n, synthetic telemetry and nine real MCP tools. Phase 17 delivered the reproducible source/API/Expo candidate and handoff. Native AR from Phase 12 and native packaging/acceptance from Phase 17 remain outstanding.

Mobile runs on Expo SDK 57 (Expo 57.0.31, React 19.2.3, React Native 0.86.3), pinned by ADR-009. **ViroReact 3.0.3 is installed and the AR screen is written (ADR-010), but it has never been compiled into an app or run on a phone. Do not treat AR as working.** The Rooftop screen's Preview in AR button checks the device, then opens the AR screen or shows a message explaining why it cannot. The 2D editor is unchanged.

Validated on this branch, 3 November 2026: 361 of 361 mobile tests in 26 suites (ViroReact mocked), TypeScript, expo-doctor 21 of 21, `npx expo install --check`, plain `npm ci` in a dry run, web export without Firebase config (19 static routes, no Viro code in the bundle), the AR gate and return to 2D in Chromium at 375px, the Android JS bundle export, and `expo prebuild` for Android in a scratch copy with a dummy `google-services.json`.

Not rerun on this branch: the 120 backend tests and the 54 browser flows against the local API, last passed on `feat/sdk57-ar`. Backend code did not change. Earlier Phase 17 validation (fresh environments, empty PostgreSQL migrations, the MCP client and the n8n restart check) was also not repeated. See [test report](TEST_REPORT.md), [release handoff](RELEASE_HANDOFF.md), [Phase 17 report](PHASE_17_REVIEW.md) and [phase ledger](DELIVERY_LEDGER.md). The test report's numbers were measured on SDK 58, before the downgrade.

Open items:

- **Native build blocker:** `mobile/google-services.json` is not in this checkout, and prebuild fails without it. It must be downloaded from Firebase and given to EAS. See [AR test plan](AR_TEST_PLAN.md).
- Native AR: no Gradle build, no device run. All manual cases are unexecuted. See [AR compatibility](AR_COMPATIBILITY.md) and [AR test plan](AR_TEST_PLAN.md).
- `mobile/assets/favicon.png` is still a crop of a design mockup. Only the app icon was replaced.
- For the sign-in owner: a guest tapping **Sign In or Link Account** is redirected to Home, and the Firebase observer can restore guest mode over a successful sign-in.
- Production `npm audit`: 21 findings (1 low, 11 moderate, 9 high). Sources include Firebase's `@grpc/grpc-js`, and `@expo/cli` and `expo-router` on the pinned SDK.
- MCP startup annotation warning recorded; protocol initialization and all tools passed when last run.
- Stakeholder interviews/usability acceptance, observed forecast accuracy and hardware validation unperformed.
- No production certification or unverified GitHub CI-green claim.

`docs/RELEASE_HANDOFF.md` still says `npm ci --legacy-peer-deps`. That still works, and `mobile/.npmrc` now makes plain `npm ci` work too.

Earlier Android screenshots relate to earlier SDK baselines. Current architecture and contracts are in ARCHITECTURE.md, MCP.md and the running OpenAPI schema. Historical phase reports preserve earlier evidence and limits.
