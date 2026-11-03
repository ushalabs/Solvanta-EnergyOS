# Before and after: every screen

All images are 390px wide, captured from a web export in headless Chromium, in dark and light mode. They are full-length, so the viewport was grown to the scroll height and the dock appears at the bottom of each image. **They are not phone screenshots.** Native Android or iOS rendering was not checked.

- **Before:** `git archive` of commit `03f19e2` (HEAD). It does not include the uncommitted edits to `rooftop.tsx`, `TwinControls.tsx` and `roof.ts`.
- **After:** the working folder, uncommitted.
- **Same data in both:** the seeded demo building, plus four appliances, one saved roof, run, schedule, comparison and plan created through the public API. The demo account also has an "Integration Verification" building, which shows as an unselected chip on both sides.
- **Retaken:** both sides were retaken together on 3 November after the appliance popups were added.
- **Sign-in:** this web build has no Firebase config, so the captures use guest mode plus a backend token for the seeded demo account. Sign-in screens are shown signed out.

No screen failed to capture. Firebase-signed-in states (verified or unverified email badge) could not be captured without a Firebase project, and neither could the "Account Created" or "Reset Link Sent" success states. Empty-roof and live-result states are covered by the flow tests, not by images here.

The guest sign-in dead end is not fixed. These images show styling only; see [TEST_REPORT.md](TEST_REPORT.md).

Each row's audit counts come from the same script on both builds: controls under 44px / text samples below WCAG AA contrast / elements past the right edge. See [TEST_REPORT.md](TEST_REPORT.md) for what the audit can and cannot detect.

## Welcome

Gradient logo mark and readable accent text in light mode; every action is now exposed as a button.

| | Before | After |
|---|---|---|
| **Dark**<br>Before 0 / 1 / 0<br>After 0 / 0 / 0 | <img src="ui-evidence/before/welcome-dark.png" width="300" alt="Welcome, dark mode, before"> | <img src="ui-evidence/after/welcome-dark.png" width="300" alt="Welcome, dark mode, after"> |
| **Light**<br>Before 0 / 4 / 0<br>After 0 / 0 / 0 | <img src="ui-evidence/before/welcome-light.png" width="300" alt="Welcome, light mode, before"> | <img src="ui-evidence/after/welcome-light.png" width="300" alt="Welcome, light mode, after"> |

## Sign in

Back, show-password and link targets reach 44px, inputs fill their box and have names, and light-mode accents are readable.

| | Before | After |
|---|---|---|
| **Dark**<br>Before 6 / 0 / 0<br>After 0 / 0 / 0 | <img src="ui-evidence/before/login-dark.png" width="300" alt="Sign in, dark mode, before"> | <img src="ui-evidence/after/login-dark.png" width="300" alt="Sign in, dark mode, after"> |
| **Light**<br>Before 6 / 5 / 0<br>After 0 / 0 / 0 | <img src="ui-evidence/before/login-light.png" width="300" alt="Sign in, light mode, before"> | <img src="ui-evidence/after/login-light.png" width="300" alt="Sign in, light mode, after"> |

## Create account

Same target, input-naming and light-mode contrast fixes as Sign in.

| | Before | After |
|---|---|---|
| **Dark**<br>Before 7 / 0 / 0<br>After 0 / 0 / 0 | <img src="ui-evidence/before/register-dark.png" width="300" alt="Create account, dark mode, before"> | <img src="ui-evidence/after/register-dark.png" width="300" alt="Create account, dark mode, after"> |
| **Light**<br>Before 7 / 2 / 0<br>After 0 / 0 / 0 | <img src="ui-evidence/before/register-light.png" width="300" alt="Create account, light mode, before"> | <img src="ui-evidence/after/register-light.png" width="300" alt="Create account, light mode, after"> |

## Reset password

Back and cancel targets reach 44px, the email input fills its box and has a name.

| | Before | After |
|---|---|---|
| **Dark**<br>Before 3 / 0 / 0<br>After 0 / 0 / 0 | <img src="ui-evidence/before/forgot-password-dark.png" width="300" alt="Reset password, dark mode, before"> | <img src="ui-evidence/after/forgot-password-dark.png" width="300" alt="Reset password, dark mode, after"> |
| **Light**<br>Before 3 / 0 / 0<br>After 0 / 0 / 0 | <img src="ui-evidence/before/forgot-password-light.png" width="300" alt="Reset password, light mode, before"> | <img src="ui-evidence/after/forgot-password-light.png" width="300" alt="Reset password, light mode, after"> |

## Home

The wall of lime buttons is replaced by a settings icon, gradient hero, metric tiles and action tiles; every figure still comes from saved data.

| | Before | After |
|---|---|---|
| **Dark**<br>Before 0 / 0 / 0<br>After 0 / 0 / 0 | <img src="ui-evidence/before/home-dark.png" width="300" alt="Home, dark mode, before"> | <img src="ui-evidence/after/home-dark.png" width="300" alt="Home, dark mode, after"> |
| **Light**<br>Before 0 / 1 / 0<br>After 0 / 0 / 0 | <img src="ui-evidence/before/home-light.png" width="300" alt="Home, light mode, before"> | <img src="ui-evidence/after/home-light.png" width="300" alt="Home, light mode, after"> |

## Home, not signed in to the API

The error becomes a warning with one clear next step, and the hero says "No building data" instead of showing nothing.

| | Before | After |
|---|---|---|
| **Dark**<br>Before 0 / 0 / 0<br>After 0 / 0 / 0 | <img src="ui-evidence/before/home-signed-out-dark.png" width="300" alt="Home, not signed in to the API, dark mode, before"> | <img src="ui-evidence/after/home-signed-out-dark.png" width="300" alt="Home, not signed in to the API, dark mode, after"> |
| **Light**<br>Before 0 / 1 / 0<br>After 0 / 0 / 0 | <img src="ui-evidence/before/home-signed-out-light.png" width="300" alt="Home, not signed in to the API, light mode, before"> | <img src="ui-evidence/after/home-signed-out-light.png" width="300" alt="Home, not signed in to the API, light mode, after"> |

## Appliances

Stat tiles, priority badges and a full-row toggle replace text lines and the browser-default switch; Edit and Delete sit side by side, and the form and delete confirmation are now popups (shown below).

| | Before | After |
|---|---|---|
| **Dark**<br>Before 7 / 0 / 0<br>After 0 / 0 / 0 | <img src="ui-evidence/before/appliances-dark.png" width="300" alt="Appliances, dark mode, before"> | <img src="ui-evidence/after/appliances-dark.png" width="300" alt="Appliances, dark mode, after"> |
| **Light**<br>Before 7 / 1 / 0<br>After 0 / 0 / 0 | <img src="ui-evidence/before/appliances-light.png" width="300" alt="Appliances, light mode, before"> | <img src="ui-evidence/after/appliances-light.png" width="300" alt="Appliances, light mode, after"> |

## Simulation

One primary action per card, grouped result tiles, a 270-degree SoC gauge, a labelled time axis, and chips instead of stacked lime buttons.

| | Before | After |
|---|---|---|
| **Dark**<br>Before 2 / 9 / 0<br>After 0 / 0 / 0 | <img src="ui-evidence/before/simulation-dark.png" width="300" alt="Simulation, dark mode, before"> | <img src="ui-evidence/after/simulation-dark.png" width="300" alt="Simulation, dark mode, after"> |
| **Light**<br>Before 2 / 24 / 0<br>After 0 / 0 / 0 | <img src="ui-evidence/before/simulation-light.png" width="300" alt="Simulation, light mode, before"> | <img src="ui-evidence/after/simulation-light.png" width="300" alt="Simulation, light mode, after"> |

## Scheduling

Back icon, status badges, a labelled 24-hour axis, and priority badges on each load's timeline.

| | Before | After |
|---|---|---|
| **Dark**<br>Before 0 / 0 / 0<br>After 0 / 0 / 0 | <img src="ui-evidence/before/scheduling-dark.png" width="300" alt="Scheduling, dark mode, before"> | <img src="ui-evidence/after/scheduling-dark.png" width="300" alt="Scheduling, dark mode, after"> |
| **Light**<br>Before 0 / 1 / 0<br>After 0 / 0 / 0 | <img src="ui-evidence/before/scheduling-light.png" width="300" alt="Scheduling, light mode, before"> | <img src="ui-evidence/after/scheduling-light.png" width="300" alt="Scheduling, light mode, after"> |

## Rooftop

Split into Photo, Layout, Measurements, AR and PV cards; radio-style mode switch, map legend, plain field names and two-column measurements.

| | Before | After |
|---|---|---|
| **Dark**<br>Before 1 / 0 / 0<br>After 0 / 0 / 0 | <img src="ui-evidence/before/rooftop-dark.png" width="300" alt="Rooftop, dark mode, before"> | <img src="ui-evidence/after/rooftop-dark.png" width="300" alt="Rooftop, dark mode, after"> |
| **Light**<br>Before 1 / 1 / 0<br>After 0 / 0 / 0 | <img src="ui-evidence/before/rooftop-light.png" width="300" alt="Rooftop, light mode, before"> | <img src="ui-evidence/after/rooftop-light.png" width="300" alt="Rooftop, light mode, after"> |

## Rooftop, AR gate open

The gate is outlined in amber and sits in its own AR card, and its wording still says native AR is not integrated.

| | Before | After |
|---|---|---|
| **Dark**<br>Before 1 / 1 / 0<br>After 0 / 0 / 0 | <img src="ui-evidence/before/rooftop-ar-gate-dark.png" width="300" alt="Rooftop, AR gate open, dark mode, before"> | <img src="ui-evidence/after/rooftop-ar-gate-dark.png" width="300" alt="Rooftop, AR gate open, dark mode, after"> |
| **Light**<br>Before 1 / 3 / 0<br>After 0 / 0 / 0 | <img src="ui-evidence/before/rooftop-ar-gate-light.png" width="300" alt="Rooftop, AR gate open, light mode, before"> | <img src="ui-evidence/after/rooftop-ar-gate-light.png" width="300" alt="Rooftop, AR gate open, light mode, after"> |

## Operations (AI tab)

Tools become secondary buttons under one primary action, and results get a source badge and a monospace block.

| | Before | After |
|---|---|---|
| **Dark**<br>Before 0 / 0 / 0<br>After 0 / 0 / 0 | <img src="ui-evidence/before/ai-dark.png" width="300" alt="Operations (AI tab), dark mode, before"> | <img src="ui-evidence/after/ai-dark.png" width="300" alt="Operations (AI tab), dark mode, after"> |
| **Light**<br>Before 0 / 1 / 0<br>After 0 / 0 / 0 | <img src="ui-evidence/before/ai-light.png" width="300" alt="Operations (AI tab), light mode, before"> | <img src="ui-evidence/after/ai-light.png" width="300" alt="Operations (AI tab), light mode, after"> |

## Settings

Chips no longer run off the screen, targets reach 44px, sentence-case headings, and theme rows are radios; light-mode accents are readable.

| | Before | After |
|---|---|---|
| **Dark**<br>Before 43 / 8 / 2<br>After 0 / 0 / 0 | <img src="ui-evidence/before/settings-dark.png" width="300" alt="Settings, dark mode, before"> | <img src="ui-evidence/after/settings-dark.png" width="300" alt="Settings, dark mode, after"> |
| **Light**<br>Before 43 / 30 / 2<br>After 0 / 0 / 0 | <img src="ui-evidence/before/settings-light.png" width="300" alt="Settings, light mode, before"> | <img src="ui-evidence/after/settings-light.png" width="300" alt="Settings, light mode, after"> |

# Appliance popups: after only

HEAD has no before image for these. There, Delete acted on one tap with no prompt, and the form opened below the list. The popups are captured at 390x844, the size a phone user sees, not full length.

## Delete confirmation

Names the appliance, with Cancel and a danger Delete button. Nothing is deleted until Delete is pressed.

| Dark | Light |
|---|---|
| <img src="ui-evidence/after/appliances-delete-confirm-dark.png" width="300" alt="Delete confirmation, dark mode"> | <img src="ui-evidence/after/appliances-delete-confirm-light.png" width="300" alt="Delete confirmation, light mode"> |
| 0 / 0 / 0 | 0 / 0 / 0 |

## Add appliance modal

Opens over the screen, with Save and Cancel fixed at the bottom. The body scrolls when the window is short.

| Dark | Light |
|---|---|
| <img src="ui-evidence/after/appliances-add-modal-dark.png" width="300" alt="Add appliance modal, dark mode"> | <img src="ui-evidence/after/appliances-add-modal-light.png" width="300" alt="Add appliance modal, light mode"> |
| 0 / 0 / 0 | 0 / 0 / 0 |
