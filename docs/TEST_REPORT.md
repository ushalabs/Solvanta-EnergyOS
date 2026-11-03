# Test report: whole app, AR gate, GUI pass and appliance popups

Date: 3 November 2026. Base commit: `03f19e2` on `main`. All changes are uncommitted in the working folder.

Environment: Windows 11, Node 24.20, npm 11.19, Python 3.14.10, Docker Desktop 29.8, Postgres 16 in Docker, Playwright 1.49.1 with Chromium 131 (installed outside the repo).

## Summary

| Check | First baseline | Before appliance popups | Now |
|---|---|---|---|
| `npx tsc --noEmit` | Pass | Pass | Pass |
| Jest suites | 17 of 17 | 20 of 20 | **21 of 21** |
| Jest tests | 89 of 89 | 220 of 220 | **241 of 241** |
| `pytest` | 77 of 77 | 120 of 120 | **120 of 120** |
| `scripts/check-source-encoding.py` | Pass | Not re-run | Pass |
| `scripts/check-source-security.py` | Pass | Not re-run | Pass |
| Web export without Firebase config | Builds (HEAD copy) | Builds | Builds |
| End-to-end flows at 390px | 39 of 43 (HEAD copy) | Not re-run | **54 of 54** (the same 43 plus 11 new) |

The first baseline for Jest and `tsc` was the working folder as first found, including uncommitted edits and new tests. The flow baseline came from the HEAD copy, using the original 43-flow script. That script has since changed for the popups, so the 39 of 43 figure was not measured again.

| Audit, 26 captures | HEAD | Now |
|---|---|---|
| Controls under 44px | 140 of 508 | **0 of 508** |
| Text samples below WCAG AA | 93 of 1352 | **0 of 1418** |
| Captures with elements past the right edge | 2 of 26 | **0 of 26** |

The 4 popup captures, which exist only in the working build, also show 0 of 124 controls under 44px, 0 of 342 text samples below AA and no overflow.

`verify_integrated_demo.py` and `verify_mcp.py` (9 tools, stdio SDK client) passed once, earlier on 3 November. They were not re-run after the popup work. No backend application code has changed.

**Native AR is not implemented and was not tested.** Everything AR-related here covers the fallback gate and the 2D geometry. See [AR_TEST_PLAN.md](AR_TEST_PLAN.md).

## Sign-in logic: reverted, known defects for the auth owner

The sign-in module belongs to a teammate, so the sign-in logic changes were reverted by the project owner.

- `mobile/src/auth/AuthContext.tsx` and `mobile/__tests__/auth_context.test.tsx` match commit `03f19e2`.
- The routing block in `mobile/app/_layout.tsx` matches `03f19e2`. The only remaining difference in that file is the splash screen colours.
- `authRouting.ts` and `auth_routing.test.ts` are no longer in the app. Copies of the reverted work, including a patch, are in `_auth_changes_backup/`, which is untracked and is being kept.
- The six guest sign-in flows were removed from the flow run because they describe these defects.
- The visual restyle of the login, register, forgot-password, Welcome and Settings screens is still in place.

**Guest sign-in is not fixed.** Two defects remain:

1. **Dead end, reproduced today on both builds.** A guest who taps **Sign In or Link Account** in Settings is redirected to Home and never reaches the login form.
2. **Sign-in race, latent while defect 1 exists.** If the Firebase observer is active, it can restore guest mode over a successful sign-in by email, registration or Google. Three tests with mocked Firebase events reproduced this on the same `AuthContext.tsx` code before the fix that was later reverted. It needs fixing together with defect 1, because fixing the redirect alone exposes it.

## Appliance popups

**Delete confirmation.** The row's Delete button now only opens a popup that names the appliance, with Cancel and a danger Delete button. Nothing is deleted until Delete is pressed. Cancel, tapping outside and Escape all close it without deleting. The backend delete is a hard delete, so the popup says it cannot be undone.

**Add and edit form.** The form now opens as a modal over the screen instead of below the list.

- The body scrolls, and Save and Cancel stay fixed at the bottom.
- `KeyboardAvoidingView` is in place. Its effect on a real keyboard was not verified (see below).
- It closes with Cancel, after a successful save, or with Android back or Escape. Tapping outside does not close it, so a stray tap cannot lose typed values.
- `validateAppliance` and the save requests are unchanged. The one addition: the screen's status message is hidden behind the modal, so validation and save errors are repeated inside the modal. A rejected save keeps the modal open with the typed values.

**Evidence: Jest.** `appliances_modal.test.tsx` has 21 tests on the real screen with a mocked API.

**Evidence: browser.** 11 new flows ran against the real API, and the flows for validation, edit and delete were rewritten for the popups:

- Delete: Cancel, tapping outside and Escape each send no `DELETE` request, the appliance survives a reload, and Delete sends exactly one request and removes only that appliance.
- Delete: Tab stays on Cancel and Delete.
- Add: the modal sits above the dock, and Cancel sends no `POST`.
- Add: the body scrolls in a short 390x560 window with Save still on screen, and everything fits at 390x844.
- Add: no overflow at 360px, targets are at least 44px, and tapping outside keeps typed values.

**Bug found and fixed while testing:** the page audit showed the backdrop was an unnamed keyboard stop in the web focus trap. It is now a plain view, and both a Jest test and a flow cover it.

**Known quirk:** react-native-web activates a modal only when its 300ms fade-in ends, so Escape does nothing during that fade.

## Your uncommitted edits

`rooftop.tsx`, `TwinControls.tsx`, `roof.ts`, `ar_fallback.test.tsx` and `roof_geometry.test.ts` compiled and passed unchanged. Review and the new tests found these, all now fixed:

- `tapToRoofPoint` did not clamp, so a release past the canvas edge produced a point the API rejects on save.
- Obstacle and panel strokes were still fixed-width, unlike the scaled strokes and markers you added.
- `PillSegmentedControl`, now used for drawing modes, had no accessibility role and was under 44px tall.

## Failed at baseline and fixed

| Defect | Evidence | Fix |
|---|---|---|
| Clicking the replay slider on web always jumped to interval 1, because web press events have no `locationX` | Flow failed on HEAD | `pressX` in `src/api/replay.ts`, with a test |
| Settings chips ran off the screen at 360, 390 and 412px | 3 flow checks failed on HEAD; visible in `before/settings-*.png` | Chips wrap |
| Touch release outside the roof canvas gave an unsaveable point | Unit test against the API rule | Clamp in `tapToRoofPoint` |
| Delete appliance ran on one tap with no confirmation | Code review | Confirmation popup |
| 140 undersized controls, including over 40 on Settings and the 40x20 switches | Audit | Minimum 44px targets, 48px inputs and buttons |
| Light-mode lime text about 1.8:1, amber about 4.1:1, muted about 3:1 | Audit | New text tokens `limeText`, `amberText` and others; spec tokens unchanged |
| Most auth and Settings controls had no button role, inputs had no accessible name | Flow script could not find them by role on HEAD | Roles and labels added |
| Dock width was computed once from window size at load | Code review | Now flexible with margins; not separately tested with rotation |

## Behaviour changes beyond styling

1. Deleting an appliance now requires confirmation.
2. The appliance add and edit form is a modal, and it also closes with Android back or Escape.
3. Save errors are shown inside the appliance modal as well as on the screen.
4. The replay slider now seeks correctly on web (`pressX`).
5. Roof taps released past the canvas edge are clamped (`tapToRoofPoint`).
6. `keyboardShouldPersistTaps="handled"` on the main scroll view lets the first tap on a button work while the keyboard is open.
7. The custom `Toggle` replaces the native `Switch`, so the whole row toggles, not just the switch.
8. Controls changed type: Home actions became tiles and an icon button, and building selection, filters and fixtures became chips. Their actions are the same.
9. Visible wording changed: section headings, some field labels (`setback m` is now `Setback (m)`), short button text with the full name kept for screen readers, and a Home hero derived from saved data.

## Found and not fixed

| Severity | Finding | Where |
|---|---|---|
| High | The guest sign-in dead end and sign-in race, described above, are for the auth owner. | `app/_layout.tsx`, `AuthContext.tsx` |
| High | The seeded demo email and password are prefilled in shipped code, and a "Demo Credentials" button fills them. The security check does not flag this. | `BuildingEquipmentEditor.tsx` |
| Medium | Two sign-ins exist. Firebase sign-in does not obtain the backend token (only `api.login` stores one), and data screens need that token. Read from the code; Firebase itself was not run. | `AuthContext.tsx`, `client.ts` |
| Medium | Guest copy says data is "stored securely on this device", but without an API sign-in the data screens only show "Not authenticated". | `app/settings.tsx`, `app/welcome.tsx` |
| Low | The label "Sign In or Link Account" promises linking, but no linking or data migration exists. Read from the code. | `app/settings.tsx`, `AuthContext.tsx` |
| Low | The Welcome tagline "Decentralized Microgrid Operating System" does not match the product identity in `Solvanta.md`. | `app/welcome.tsx` |
| Low | `parsePoints` accepts forms like `0x10` and `1e3` because it uses `Number()`. Read from the code, not run. | `src/api/roof.ts` |
| Docs | The compose service is `db`, so `docker compose up -d postgres` fails; I used `db`. | `docker-compose.yml` |
| Docs | `docs/STATUS.md` still says 34 mobile tests. `TEST_PLAN.md` names test files such as `test_tokens.py` that do not exist. | `docs/` |
| Docs | `.editorconfig` says LF while the working tree is CRLF. | Repo root |

## End-to-end flows

Run in headless Chromium at 390px wide, with a 1500px tall viewport so the canvas was not under the dock (some popup flows use other sizes), against the real API and Postgres, using a throwaway registered account.

All 54 passed on the current build. They cover:

- **Entry:** redirect to Welcome, dark first launch, the sign-in message without Firebase, forgot-password and register validation, guest entry, the recoverable signed-out state.
- **Settings:** API sign-in, empty state with no building, building creation, theme switch persisting across reload.
- **Navigation:** all five dock tabs and their selected state.
- **Appliances:** modal validation, create, scenario toggle, edit, the 11 popup flows above, and confirmed delete.
- **Rooftop:** the sequence in [AR_TEST_PLAN.md](AR_TEST_PLAN.md), then PV calculate and save.
- **Simulation:** invalid input, run, replay, slider, telemetry, resilience, forecast, and plan create, submit, approve, simulate, verify.
- **Other:** scheduling, an Operations read tool, API offline showing an error, no horizontal overflow at 360, 390 and 412px, exit guest, no uncaught page errors.

The four failures on HEAD with the original 43-flow script were the slider and the three Settings overflow checks.

Flow scripts live outside the repo because Playwright must stay out of it, so these flows are not repeatable from the repo today.

## Audit method and limits

The audit script runs in the page on each capture: 13 screens in 2 themes, plus the 2 popups in 2 themes.

- **Touch targets:** bounding box of each interactive element.
- **Contrast:** text colour against the resolved background. It **skips text on gradients** and ignores element opacity, so the hero cards were judged by eye and token tests only.
- **Not covered:** non-text contrast is only unit-tested for chart marks, and it was not measured in the page.

A clean audit is not a full accessibility pass. **No screen reader (TalkBack, VoiceOver) was used.**

The expected console errors on `home-signed-out` are 401s from the API with no token.

## Could not be verified

| Item | Reason |
|---|---|
| Native AR, camera, tracking, anchoring | Not implemented; no AR build |
| Any native Android or iOS run, including the toggles, gauge, layouts and both popups | No device or emulator used; `adb` is not on PATH. All visual checks are web export only |
| Android back button on the popups | Only the `onRequestClose` handler was exercised, in Jest. Escape was exercised on web |
| Popups with a real on-screen keyboard | `KeyboardAvoidingView` is in place, but only a short window was simulated. Its behaviour with a real keyboard is untested |
| Firebase email sign-in, registration, password reset, email verification | No Firebase project config here. Only the "unavailable in this build" path and client validation ran in a browser, plus mocked unit tests |
| Google sign-in | Needs an Android dev build |
| Firebase-enabled web export | Needs config variables |
| n8n workflows | n8n image not pulled or started; `verify-n8n.py` not run. Backend automation tests did pass |
| Photo import and camera in the real UI | Mocked in Jest only |
| Text scaling, rotation, reduced-motion settings | Not exercised. Layouts were built to wrap, but that is untested at large text sizes |
| Light and dark on 393px | Overflow checked at 360, 390 and 412px; 393px not run separately |
| Visual match to the reference on a device | Compared by eye against web captures only |
| `npm run lint`, `ruff` | ESLint is not in `package.json` and ruff is not in `requirements.txt`; not added, per the project rules |
| `npm audit` | Not re-run; the open advisory in `STATUS.md` is untouched |

## Spec items still open

These needed new data or behaviour, so they stayed out:

- Home energy-flow diagram and usage history (S01)
- Appliance form fields: optional user-estimated actual power and a `high` priority choice (S02); the form has rated power and critical, medium and low
- Baseline, Outage and What-if tabs, and side-by-side comparison (S03)
- Image, Layout and AR tabs (S05), and an ARCore capability probe
- Inter font (needs a font asset)

Screens are long, Simulation especially at about 5000px, because every tool stays on one page.

## Environment notes

- **Port 8000:** another process holds port 8000, so my API server could not bind to it. Its command line is not readable and I did not touch it. The final flows and captures used this checkout's backend on port 8001, with the browser's calls to 8000 rerouted there. One earlier flow attempt in this round reached that other server and created a throwaway account in the same database.
- **Demo data, Refrigerator:** the Refrigerator row was found missing from the demo building. Nothing in my scripts deletes on that account, and how it went is unknown. It was added back with its original values, so it has a new id and now lists last.
- **Demo data, second building:** the demo account has an "Integration Verification" building from the integrated demo run. It shows as an unselected chip in the images, with the fixture building selected.
- **Screenshots:** all 52 before and after images were retaken after the popup work, so both sides show this same data. The popup images were added.
- `constraints.txt` says it was verified on Python 3.13. Only 3.14 is installed here, and everything installed and passed on 3.14.
- `docker compose up -d db` created a new volume, `solvanta-energyos_pgdata`. The older `solvanta_pgdata` volume and `solvanta-db` container were not touched, and no volumes were removed.
- Throwaway QA accounts and buildings remain in the new volume's database.
- `verify_integrated_demo.py` and `verify_mcp.py` overwrite tracked files in `docs/evidence/`. Those were backed up and restored byte for byte, so they show no change.
- `../Solvanta-before` and `../Solvanta-before.zip` remain outside the repo.
