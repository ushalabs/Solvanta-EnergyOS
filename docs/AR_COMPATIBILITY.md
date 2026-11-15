# ViroReact integration — 3 November 2026, branch `feat/ar-viro`

ViroReact 3.0.3 is installed and the AR screen is written. See ADR-010 in `DECISIONS.md`. **AR has not been built into an app or run on a phone, so it is not known to work.** The sections below this one are history and no longer describe this checkout.

Peer ranges, read again before installing with `npm view @reactvision/react-viro@3.0.3 peerDependencies --json`:

| Peer | Required | This checkout | Result |
|---|---|---|---|
| `expo` | `>=57.0.0 <58.0.0` (optional) | 57.0.31 | Inside |
| `react` | `>=19.0.0` | 19.2.3 | Inside |
| `react-native` | `>=0.86.0 <0.87.0` | 0.86.3 | Inside |
| `react-native-web` | `>=0.19.0` (optional) | ^0.21.2 | Inside |
| `@reactvision/viro-web-renderer` | `^1.0.1` (optional) | Not installed | Not needed: web never loads Viro |
| `@reactvision/react-native-visionos` | `>=0.86.0 <0.87.0` (optional) | Not installed | Not needed |

Being inside a peer range does not prove that AR works.

## What each environment does

| Environment | Result of Preview in AR | Evidence |
|---|---|---|
| Web | "AR NOT AVAILABLE ON WEB" gate. The 2D editor works | Run in Chromium from the web export |
| Expo Go | "Expo Go cannot open AR" gate. ViroReact is never loaded, because loading it without its native module would fail | Unit tests only |
| Dev build, device reports `UNSUPPORTED` | "ARCORE NOT SUPPORTED" gate | Unit tests only |
| Dev build, ARCore still `TRANSIENT` after 5 tries, `UNKNOWN`, or no answer in 5 s | "ARCORE CHECK FAILED" gate with Check Again | Unit tests only |
| iOS | "ANDROID ONLY FOR NOW" gate. iOS is not configured or tested | Unit tests only |
| Dev build, device reports `SUPPORTED` | AR screen | **Never run** |

Android availability values come from the `ViroViewARCore$ARCoreAvailability` class in Viro's Android library. `SUPPORTED` means the device is capable, and ARCore may still need installing. Viro's renderer contains the install request, so that prompt should appear when the session starts. This is read from the package and has not been seen on a device.

## Android manifest from prebuild

From `expo prebuild` in a scratch copy, using a dummy `google-services.json`:

- `com.google.ar.core` is `optional`. The Viro plugin hard-codes this and has no option to change it. It is the value this project needs: `required` would stop devices without ARCore from getting the app from Play, and the 2D editor must work on them.
- `android.permission.CAMERA` is declared. `RECORD_AUDIO`, which Viro's libraries add for video recording, is removed through `blockedPermissions`, because the app does not record.
- `ReactViroPackage` is registered in `AR` mode only, with no Cardboard or Daydream categories. No location permission is added, because the provider is `none`.
- `android.hardware.camera` is declared without `required="false"`, so Play would hide the app from devices with no camera. This does not affect installing the APK directly.
- The plugin replaces the manifest's `<queries>` block with one entry for ARCore.

Android has no permission text in the manifest. The reason is shown in the runtime prompt, from `cameraPermission.ts`. The text in `app.json` is the iOS one.

## Not verified

- Gradle has never compiled this project on SDK 57 with Viro. There is no Java on the machine that made this change, and no cloud build has been started.
- No Viro code has executed: camera start, plane detection, placement, tracking, real scale, the ARCore install prompt and leaving AR are all untested. The steps are in [AR_TEST_PLAN.md](AR_TEST_PLAN.md).
- The app's other native modules, including Firebase and Google Sign-In, have not been built alongside Viro.
- `react-native-reanimated` and the other native dependencies have not been checked for native conflicts with Viro's prebuilt libraries.

---

# SDK 57 pin — 3 November 2026 (ViroReact has since been installed, see above)

The app is on Expo SDK 57 again (Expo 57.0.31, React 19.2.3, React Native 0.86.3). See ADR-009 in `DECISIONS.md`. The sections below are history and no longer describe this checkout.

Executed `npm view @reactvision/react-viro version peerDependencies --json`:

```text
version: 3.0.3
expo: >=57.0.0 <58.0.0
react: >=19.0.0
react-native: >=0.86.0 <0.87.0
react-native-web: >=0.19.0
@reactvision/viro-web-renderer: ^1.0.1
@reactvision/react-native-visionos: >=0.86.0 <0.87.0
```

The Expo, React, React Native and React Native Web versions in this checkout fall inside these ranges. The Viro web renderer and visionOS peers were not evaluated.

**Native AR is still not implemented.** Being inside a peer range does not prove that AR works:

- ViroReact is not installed, and the app has no AR code.
- No custom development client has been built on SDK 57 from this checkout.
- No physical ARCore device has been used; `adb` is not on PATH on the machine that made this change.
- Camera permission, tracking, scale, alignment, anchoring and return to 2D are all untested. The steps are in [AR_TEST_PLAN.md](AR_TEST_PLAN.md).

The app shows the `ARCapabilityFallback` gate and keeps the measured 2D roof editor, obstacle and setback geometry, and saved panel layout.

Next steps: install ViroReact 3.0.3 in a development client, build it, and run it on a supported phone. Capture evidence before marking native AR complete.

---

# Phase 12 compatibility update — 29 October 2026 (superseded by the SDK 57 pin above)

The repository was upgraded to Expo SDK 58 at eec22db. The original Phase 1 decision below is historical and no longer establishes native AR compatibility for this checkout.

Executed `npm view @reactvision/react-viro version peerDependencies --json`: version 3.0.3 requires Expo >=57.0.0 <58.0.0 and React Native >=0.86.0 <0.87.0. The current app uses Expo ~58.0.21. ViroReact is not installed, and a forced incompatible peer installation has not been performed. `adb devices` returned no connected devices during this check.

**Native AR is blocked.** This build cannot claim camera anchoring, alignment or ARCore runtime support. The app displays an explicit native-build gate and retains the measured 2D roof editor, obstacle/setback geometry and persisted panel arrangement.

Unblock path: use a Viro release that declares SDK 58 support, or evaluate an isolated compatible native development-client baseline. Build and run on a physical ARCore-supported device; verify camera permission, tracking, scale/alignment, anchoring and return to 2D. Capture evidence before marking native AR complete. Keep the existing SDK 58 app usable during that compatibility spike. No device support probe or native AR success is claimed by the 2D fallback.

---

# Phase 1 SDK decision and AR limits

Checked 28 October 2026. The mobile baseline remains Expo 57.0.31, React Native 0.86.3, React 19.2.3. `package-lock.json` records the resolved dependency tree. `npx expo install --check` passes after aligning native module versions and React.

The official [Expo SDK reference](https://docs.expo.dev/versions/latest/) maps SDK 57 to React Native 0.86 / React 19.2.3. The official [ViroReact Expo integration guide](https://viro-community.readme.io/docs/integrating-with-expo) documents SDK 57 / RN 0.86 support for ViroReact 2.57.3 and requires a custom development client or prebuild; ViroReact does not run in Expo Go.

Executed metadata check:

```text
npm view @reactvision/react-viro@2.57.3 peerDependencies --json
expo: >=55.0.0 <58.0.0
react: >=18.0.0
react-native: >=0.83.0 <0.87.0
```

This verifies that the chosen baseline falls inside the published compatibility range. Native UI screens were run in matching Expo Go 57.0.9. It does **not** prove native AR integration: ViroReact is not installed, no Viro native scene was built, and no physical ARCore device was tested. A native integration/hardware spike remains a prerequisite for claiming AR works in Phase 12. The Phase 1 rooftop is explicitly a static 2D demo; editing, persistence, measurement, and feasible panel placement belong to later phases.

The earlier phrase “AR Locked” and unconditional “100% operational” editor claim were inaccurate and have been removed from the app.
