# Phase 1 independent visual and runtime audit

Reviewed 28 October 2026 against `design/reference/Neon_Smart_Home_Reference.png`.

The earlier Antigravity report is superseded by this audit. Its eight tests checked constants and fixture values, and the original emulator evidence was a browser preview. The repository also contained alerts claiming database writes, physics execution, verified results, and active MCP without implementing those operations.

## Corrections

- Explicit Phase 1 demo notices on every screen; truthful simulation, save, approval, MCP, and AR messages. Demo plan approval only changes screen state and never approves a project phase.
- Expo-compatible React/native dependencies and a regenerated lockfile. React was previously resolving to 19.3.1 instead of the SDK 57 baseline 19.2.3.
- Theme hydration waits for stored appearance before rendering. Direct-entry back buttons have a Home fallback.
- Native narrow-screen header wrapping, named appliance switches, readable energy-flow symbols, and a roof schematic with 24 visible panels matching its example count.
- Local interactive ADB viewer and repeatable native evidence capture. The viewer uses real Android screenshots and forwards taps/swipes; it does not serve the React Native web export.

## Verification

- `npm test -- --runInBand`: 10 tests pass, including theme persistence across provider remount and delayed hydration without rendering the wrong default theme. React test renderer emits its upstream deprecation notice.
- `npx tsc --noEmit`: passes.
- `npx expo install --check`: passes.
- `npx expo export --platform web --max-workers 2`: static export passes (14 routes, including router aliases).
- Android: Expo Go 57.0.9 / Expo SDK 57 / React Native 0.86.3, `emulator-5554`, 1080 x 2400. This is a native Expo Go run, not a standalone Solvanta APK.
- Native UI evidence: seven dark screens and overview/appliances/settings in light. The ADB smoke script exercises dock navigation, scheduling back navigation, appearance selection, JavaScript reload, and the AC scenario switch (2.45 to 0.95 kW and back).
- Scope: these checks establish UI behavior. Token/fixture assertions do not validate energy conservation, forecasts, scheduling, or numerical engine accuracy.

## Screenshot evidence

All screenshots below were captured from Android using ADB. XML files alongside them record the native UI hierarchy. `android/results.json` records the smoke script outcome.

| Screen | Dark | Light |
|---|---|---|
| Overview | [Native dark](android/01-overview-dark.png) | [Native light](android/08-overview-light.png) |
| Appliances | [Native dark](android/02-appliances-dark.png) | [Native light](android/09-appliances-light.png) |
| Simulation | [Native dark](android/03-simulation-dark.png) | — |
| Scheduling | [Native dark](android/04-scheduling-dark.png) | — |
| Rooftop | [Native dark](android/05-rooftop-dark.png) | — |
| AI Operations | [Native dark](android/06-ai-dark.png) | — |
| Settings | [Native dark](android/07-settings-dark.png) | [Native light](android/10-settings-light.png) |

[Light theme after native JavaScript reload](android/11-overview-light-after-reload.png). Expo Go reload returns to Home; the saved light preference is retained.

The palette, gradient, rounded graphite cards, radial gauge, and floating dock follow the supplied visual reference. This is an adapted Solvanta layout, not a pixel-identical reconstruction of the smart-home reference. Small-screen overlaps found during review were corrected. Screens scroll to reveal lower content; the dock remains fixed above the Android gesture area.

## Limits and handoff

This is a fixture-only UI foundation. Appliance filters/toggles, appearance, tab navigation, and local approval presentation are interactive. Simulation and optimization values are illustrative; backend, database persistence, appliance registration, roof editing, native AR, actual MCP execution, and physical controls remain future-phase work. No engine or invariant has been verified by these screenshots. [AR compatibility notes](../AR_COMPATIBILITY.md) distinguish supported package ranges from an actual hardware spike.

User approval remains pending. Phase 2 has not started. Changes/evidence are local and uncommitted, based on branch HEAD `f4ab108`; no new commit SHA or push is claimed.

For testing, leave Metro and the viewer running. Open `http://localhost:8765` in the right panel, click to tap, and drag to scroll. `scripts/start-android-preview.ps1` restarts the local servers when an emulator with matching Expo Go is available. Metro must bind IPv4 localhost for `adb reverse` to work. The viewer binds only to `127.0.0.1`.
