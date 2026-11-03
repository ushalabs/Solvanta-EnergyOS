# Native AR test plan (physical device)

Status: native AR is **not implemented** in the current build (see AR_COMPATIBILITY.md). The app shows an explicit gate (`ARCapabilityFallback`) and keeps the measured 2D roof editor. Nothing in this document shows that AR works. The automated and web results below cover the gate and the rooftop geometry only. The manual device cases have **not been executed**, because there is no AR build to run them on.

Last automated run: 3 November 2026, Windows 11, Node 24, Python 3.14. Full results are in [TEST_REPORT.md](TEST_REPORT.md).

## Automated: Jest, no device (all passing)

| File | Tests | What it covers |
|---|---:|---|
| `mobile/__tests__/ar_fallback.test.tsx` | 15 | The gate says native AR is not integrated and names ARCore, the dev client, Expo Go, web and SDK 57, and says ViroReact is not installed. It makes no claim that AR, camera, anchoring or tracking works, and no accuracy claim. "Return to 2D" fires once and rendering does not fire it. It has one named button, a live region and a heading, and readable colours in both themes. **Guards:** fails if an AR or camera package joins `package.json`, an AR plugin joins `app.json`, any app source imports an AR module, or Expo moves off SDK 57 or React Native off 0.86, so the gate text cannot go stale silently. |
| `mobile/__tests__/rooftop_ar_flow.test.tsx` | 25 | The whole Rooftop screen with the API mocked. The gate is hidden until requested. Opening it makes no camera request and no API call. Returning keeps saved geometry and panels. It can be reopened, the editor still works while it is open, and it works with no building. Also covers taps in roof, obstacle and scale mode, release past the canvas edge, undo, the obstacle three-point rule, the third scale tap restarting the line, refusal to calculate without a measured scale, an unfinished obstacle, malformed vertices, preview vs save, surfaced server errors, camera permission denial, picker cancel, photo size and aspect limits. |
| `mobile/__tests__/roof_geometry.test.ts` | 31 | Tap-to-roof mapping at several view widths, uniform scale, edge clamping, marker sizing, defaults within API limits, coordinate parsing and round trips. |

## Automated: backend geometry, pytest (all passing)

`backend/tests/test_roof_geometry_deep.py` (43 tests) adds to `test_roof.py`: scale from a line at any angle, area scaling, physical panel size and gap, setback on a rectangle, setback larger than the roof, panel larger than the roof, an obstacle covering or splitting the roof, a triangle roof, no overlaps, panels inside the canvas, determinism, 25 kinds of invalid input, and preview that does not persist.

## Automated: web export in Chromium at 390px (all passing)

The end-to-end flow run drove the real UI against the local API: tap roof vertices, undo, refuse calculation without a scale, mark a scale, draw an obstacle, drag past the canvas edge, save and reload, then open the gate and return. On opening the gate it checked that no API request was sent and that geometry was unchanged.

This run shows the gate and the 2D editor work in a browser. It says nothing about camera AR.

## Defect found and fixed by this testing

A finger released outside the canvas reported a position outside the roof, which the API then rejected on save with "All points must lie inside the image canvas". `tapToRoofPoint` now clamps to the canvas.

## Known limits of the gate

- It shows the same message on every device. There is no ARCore capability probe, so case 1 below cannot pass until one exists.
- The gate text says "no physical ARCore device is connected for validation". That is a fixed statement about the project, not a live check of the phone.

## Preconditions for the manual cases

1. ARCore-supported Android phone with Google Play Services for AR installed and up to date.
2. A Viro (or other AR) release that declares Expo SDK 57 support (ViroReact 3.0.3 does, but it is not installed yet), built as a custom development client. Expo Go and web cannot run it. Update the guards in `ar_fallback.test.tsx` in the same change.
3. Backend running and reachable from the phone; a signed-in user with one building and a saved roof.

## Manual device cases (not executed)

| # | Area | Steps | Pass when |
|---|------|-------|-----------|
| 1 | Capability gate | Open Rooftop, tap Check Native AR Preview on a device without ARCore | A clear unsupported message appears; the 2D editor still works |
| 2 | Camera permission | First launch of AR; deny, then allow | Denial shows a recoverable message; allow starts the camera |
| 3 | Tracking start | Move phone slowly over a flat surface | Tracking state is shown; no crash while tracking is limited |
| 4 | Scale | Place a known reference (for example a 1 m rule) and compare to the on-screen measure | Error within the tolerance the team agrees (record it) |
| 5 | Anchoring | Place the saved panel layout, walk around it | Panels stay fixed to the surface without visible drift |
| 6 | Alignment | Compare AR layout against the saved 2D layout | Panel count and positions match the saved layout |
| 7 | Low light / glare | Repeat 3 and 5 in dim light and in direct sun | Degrades gracefully; a message explains lost tracking |
| 8 | Interruptions | Background the app, lock the screen, take a call, rotate | AR session resumes or ends cleanly; no crash |
| 9 | Return to 2D | Leave AR from every state | The 2D editor shows the same saved geometry |
| 10 | Performance | Run AR for 5 minutes | No overheating warning, memory growth or frame stalls you can see |
| 11 | Back navigation | Use the hardware back button inside AR | Returns to Rooftop, camera released |
| 12 | Honest labelling | Read all AR text | No text claims accuracy or AR support that was not measured |

## Evidence to capture

Device model and Android version, app build id, a screen recording per case, measured vs reference distances for case 4, and a pass/fail table with the date. Attach it to the phase report before marking native AR complete.
