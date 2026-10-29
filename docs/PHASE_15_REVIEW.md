# Phase 15 — Integrated Workflow Audit

The authenticated web UI and real PostgreSQL/API workflow were exercised together. Fixes cover SDK 58 navigation, shared building selection, stale workspace requests, readable API errors/cancellation, immutable plan review conditions, and full-day scheduling. The scheduler now independently checks an earliest-start schedule before CP-SAT: when feasible it certifies the objective lower bound instead of timing out on an already optimal case.

Security checks cover forged/expired JWTs, cross-building authorization in existing suites, registration field restrictions and password byte limits. SQL query value logging is disabled. No production-security certification is claimed.

## Evidence

`evidence/phase15/integrated-demo.json` records real run/plan IDs and numerical baseline, critical-load rescue, schedule, approval, simulation, verification and synthetic anomaly outcomes. Screenshots in that directory show authenticated settings, live home, appliance selection, roof, saved-run replay, validated scheduling, operations and the light theme at 390px width. Tests also cover the SDK 58 custom tab callback without a navigation prop.

Source encoding was repaired and a UTF-8 checker added to CI. Expo dependencies were aligned to SDK 58, including React Native 0.88.1 and the matching React test renderer. Native Android interaction and AR were not exercised in this phase.

## Dependency finding

The production npm audit reports 5 low and 3 high package entries. The three high entries share GHSA-mrhx-c7xc-m3w5 through Expo CLI's Zod 3 dependency. The advisory's patch is Zod 4.6.6; overriding a major version or downgrading Expo is not a validated fix. This remains an upstream development-tool dependency finding, not a clean audit. Reference: https://github.com/advisories/GHSA-mrhx-c7xc-m3w5 .

AR/VR, final GUI overhaul and APK/dev-client packaging remain deferred under the user's instruction. Delivery authorization does not imply manual acceptance of those deferred items.

## Validation commands

- `cd backend; .venv/Scripts/python.exe -m pytest -q`: 74 passed.
- `cd mobile; npm test -- --runInBand`: 34 passed.
- `npx tsc --noEmit`: passed.
- `npx expo install --check`: dependencies up to date.
- `EXPO_OFFLINE=1 npx expo export --platform web --max-workers 1`: static web build.
- `backend/.venv/Scripts/python.exe scripts/check-source-encoding.py`: passed.

Metro excludes generated `.expo` preview bundles and `dist` exports from its source scan.
