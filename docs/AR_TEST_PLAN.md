# Native AR test plan (physical device)

Status: tracked AR with ViroReact is **written but not proven**. The code is on branch `feat/ar-viro`. No development build has been made, and it has never run on a phone. Nothing in this document shows that AR works. Every manual case below is **not executed**.

Last automated run: 3 November 2026, Windows 11, Node 24.

## Automated: Jest, no device (all passing)

Whole mobile suite: 361 of 361 tests in 26 suites. ViroReact and the native module are mocked in all of them.

| File | Tests | What it covers |
|---|---:|---|
| `mobile/__tests__/roof_to_ar.test.ts` | 18 | Layout to AR conversion: real size from `meters_per_pixel`, scale doubling, centring, plan orientation with no mirroring, preserved distances, span, flat rotation and lift, empty layout, refusal of a bad scale or panel. |
| `mobile/__tests__/ar_capability.test.ts` | 27 | Each capability state, their order, retry while ARCore answers `TRANSIENT`, a probe that throws or never answers, error mapping, and the wording of each message: no accuracy or success claim. |
| `mobile/__tests__/viro_native.test.ts` | 11 | The native bridge: ViroReact is not loaded just to ask about the module, the AR view is not loaded into a binary without the module, and each native answer maps to a capability result. The web stub reports no AR. |
| `mobile/__tests__/roof_ar_view.test.tsx` | 17 | The tree handed to ViroReact: provider `none`, upward horizontal planes, anchor events forwarded to the selector, one flat quad per panel at real size. The overlay: visualization label, Back to 2D always offered, scan to choose to placed guidance, lost plane, tracking messages. |
| `mobile/__tests__/rooftop_ar_screen.test.tsx` | 24 | The AR route's order: capability, saved layout, camera, AR view. Unsupported device, no module and Expo Go make no roof or camera request. No saved roof, no panels, server error and missing scale never ask for the camera. Camera granted, denied, blocked, return from Settings, and a permission API failure. A JavaScript failure in the view keeps the way back open. |
| `mobile/__tests__/ar_fallback.test.tsx` | 33 | The gate for all six reasons, its buttons and accessibility, and readable colours in both themes. **Guards:** Viro pinned to 3.0.3 on SDK 57 and React Native 0.86, the dev client present, AR-only plugin config, camera declared and microphone blocked, square icon, the EAS profile, and only `RoofARView.tsx` and `viroNative.native.ts` importing ViroReact. |
| `mobile/__tests__/rooftop_ar_flow.test.tsx` | 30 | The whole Rooftop screen with the API mocked: the AR button opens the route only when the check says ready, otherwise the gate appears inline and the 2D editor keeps working. Also the existing roof, obstacle, scale, save and photo cases. |
| `mobile/__tests__/roof_geometry.test.ts` | 31 | Tap-to-roof mapping, uniform scale, edge clamping, marker sizing, defaults and coordinate parsing. |

These tests show that the app's logic and its calls into ViroReact are what the Viro 3.0.3 source asks for. They do not show that a scene renders, that planes are found, or that panels stay in place.

## Automated: build-level checks

| Check | Result | What it does not show |
|---|---|---|
| `npx tsc --noEmit` | Pass, including `RoofARView.tsx` against Viro's own type definitions | Runtime behaviour |
| `npx expo-doctor` | 21 of 21 | That Gradle can build the app |
| `node scripts/export-web.cjs --without-firebase` | Pass, 19 static routes. No Viro code in the web bundle (`VRTARSceneNavigator`, `ViroARScene` and `isARSupportedOnDevice` each appear 0 times) | Anything native |
| Exported web build in Chromium at 375px | `/rooftop-ar` shows "AR NOT AVAILABLE ON WEB". Rooftop's Preview in AR shows the same gate inline, and Back to 2D layout works, with no crash | Camera AR. The roof API was not signed in during this check |
| `npx expo export --platform android` | Pass. Metro bundles ViroReact and the AR scene into the Android JS bundle | That the bundle runs |
| `npx expo prebuild --platform android`, in a scratch copy with a dummy `google-services.json` | Pass. See the manifest result in [AR_COMPATIBILITY.md](AR_COMPATIBILITY.md) | That the generated project compiles |

## Automated: backend geometry

`backend/tests/test_roof_geometry_deep.py` and `test_roof.py` cover scale, setbacks, obstacles and panel placement. They were not rerun for this change, because the backend did not change.

## Build and install the development client

**Blocker first:** `mobile/google-services.json` is not in this checkout and is gitignored, and `app.json` points to it. Prebuild stops with "Cannot copy google-services.json" without it. Download the file from the Firebase console (Android app `com.solvanta.energyos`) and put it in `mobile/`.

No cloud build has been started. From `mobile/`, with your own Expo account:

```bash
npx eas-cli@latest login
```

```bash
npx eas-cli@latest init
```

`init` adds a project id to `app.json`, so commit that change. If it reports that it cannot write to the config, add the id it prints under `expo.extra.eas.projectId` by hand.

```bash
npx eas-cli@latest env:set --environment development --name GOOGLE_SERVICES_JSON --type file --value ./google-services.json --visibility secret --scope project
```

```bash
npx eas-cli@latest build --profile development --platform android
```

EAS uploads the repository except for gitignored files. That includes the untracked `_auth_changes_backup/` folder if it is still there, so move it out first if you do not want it uploaded.

When the build finishes, open the install link EAS prints on the phone and install the APK, allowing installs from that source. With `adb` on your PATH you can run `adb install <downloaded>.apk` instead.

Then start the backend and the JS server, with the phone on the same Wi-Fi:

```powershell
cd backend
.venv/Scripts/python.exe run.py
```

```bash
npx expo start --dev-client
```

Open the Solvanta app on the phone and connect to the server it lists, or scan the QR code. Keep `EXPO_PUBLIC_API_BASE_URL` blank to follow the LAN host. If the app cannot reach the API, set it to `http://<your-PC-LAN-IP>:8000` in `mobile/.env` and restart. Rebuild only when native config or native dependencies change.

## Preconditions for the manual cases

1. An ARCore-supported Android phone. [Google's device list](https://developers.google.com/ar/devices) is the reference. A second phone without ARCore for case 1, if available.
2. The development build above, installed.
3. Backend reachable from the phone, and a signed-in user with one building and a saved roof with panels. Google Sign-In may not work in this build until its signing certificate is registered in Firebase, so use another sign-in if it fails.

## Manual device cases (not executed)

| # | Area | Steps | Pass when |
|---|------|-------|-----------|
| 1 | Capability gate | Tap Preview in AR on a device without ARCore | The "ARCORE NOT SUPPORTED" message appears; the 2D editor still works |
| 2 | ARCore not installed | On a supported phone, uninstall Google Play Services for AR, then open AR | Viro's install prompt appears. Declining leaves a tracking message and Back to 2D layout, with no crash. Record what actually happens: this path was read from Viro's code, not seen |
| 3 | Camera permission | First AR launch: deny, then allow | Denial shows a recoverable message; allowing starts the camera |
| 4 | Camera blocked | Deny until Android stops asking, tap Open Settings, grant, come back | Settings opens; AR starts on return |
| 5 | Tracking start | Move the phone slowly over a flat surface | Guidance and tracking messages change; no crash while tracking is limited |
| 6 | Plane detection and placement | Wait for a highlighted surface, then tap it | Panels appear flat on that surface, centred where you tapped |
| 7 | Scale | With a tape, compare one drawn panel with the panel size saved on the roof, outdoors or in a large room | Record the observed difference. It is an observation, not an accuracy claim, and the labels stay as they are |
| 8 | Anchoring | Walk around the placed layout | Panels stay on the surface without drift you can see |
| 9 | Alignment | Compare AR with the saved 2D layout | Panel count and arrangement match, including left and right (not mirrored) |
| 10 | Another surface | Tap Choose Another Surface, then a different surface | The layout moves; the guidance returns to placing |
| 11 | Low light / glare | Repeat 5 and 8 in dim light and in direct sun | Degrades gracefully; a message explains limited tracking |
| 12 | Interruptions | Background the app, lock the screen, take a call | AR resumes or ends cleanly; no crash |
| 13 | Return to 2D | Tap Back to 2D layout from every state | The 2D editor shows the same geometry, including unsaved edits |
| 14 | Performance | Run AR for 5 minutes | No overheating warning, memory growth or frame stalls you can see |
| 15 | Back navigation | Use the hardware back button inside AR | Returns to Rooftop; the camera is released |
| 16 | Honest labelling | Read all AR text | "VISUALIZATION ONLY" is always visible; no text claims accuracy or support that was not measured |
| 17 | Large layout | Open a roof of 10 m or more in a small room | The layout runs off the surface at real scale, with no crash. Note whether that is usable, because no scale-down mode exists |

## Evidence to capture

Device model and Android version, app build id, a screen recording per case, and a pass/fail table with the date. Add tape readings for case 7. Attach it to the phase report before marking native AR complete.

## Defect found earlier by this testing

A finger released outside the canvas reported a position outside the roof, which the API then rejected on save with "All points must lie inside the image canvas". `tapToRoofPoint` now clamps to the canvas.
