# Design gap analysis: current app vs `docs/design-reference/`

Date: 16 November 2026. Branch `feat/design-overhaul` at `71664a1`, which contains `origin/main` (`302fd13`) including the weather and solar-sizing work.

This is analysis only. No code was changed. It compares each of the six reference images with the screen as it is now, lists what can be reused, and flags every place where an image shows something the app has no real data or feature for.

**Visual reference.** `docs/design-reference/` (`DESIGN_TOKENS.md` and the six screen images) is the only visual reference for this work. Nothing in the `design/` folder was opened, used or copied for this analysis, and nothing in it is to be edited or deleted. Where `UI_DESIGN_SPEC.md` or `tokens.ts` names a `design/` image as the visual source of truth, `docs/design-reference/` replaces it. The spec's honesty and accessibility rules still apply, because they are about behaviour and do not depend on those images.

Sources read: `UI_DESIGN_SPEC.md`, `mobile/src/theme/tokens.ts`, `docs/design-reference/DESIGN_TOKENS.md`, the six reference images, `mobile/assets/images/home-house.png`, the six screens, the shared components, and the backend routes. The comparison is against the code, not against a running build: nothing was run or screenshotted for this document.

## Rules that still apply

From `UI_DESIGN_SPEC.md` (behaviour rules only) and `DESIGN_TOKENS.md`:

- Label data `SIMULATED`, `FORECAST` or `LIVE`. The app has no live telemetry, so nothing can be labelled `LIVE` today.
- Numbers in the images are placeholders. Show real values, or a dash when there is none.
- No fake taps: a control that does nothing must not be drawn as a control.
- Appliance toggles select a scenario. They do not switch equipment.
- No language model is connected. Tools run engines; nothing "thinks".
- Light mode must keep working, and touch targets stay at least 44px.

## Decisions needed before Step 2

These are the points where I cannot follow the image without your call. Each has my recommendation.

| # | Question | Recommendation |
|---|---|---|
| 1 | **Which colour tokens win?** `DESIGN_TOKENS.md` differs from `tokens.ts` and from `UI_DESIGN_SPEC.md` section 1.1 on almost every value (see the token table below). `tokens.test.ts` pins nine dark values, the card radius, dock radius and screen padding to the old spec. | **Decided (16 November 2026): `docs/design-reference/` wins.** Adopt its dark values in `tokens.ts`, update `tokens.test.ts`, and add a note to the spec. The test, the spec note and the header comment in `tokens.ts` will each say that `docs/design-reference/` is now the visual reference. Do it as its own commit before any screen work, because it restyles every screen at once. |
| 2 | **Light mode.** The references are dark only. `DESIGN_TOKENS.md` has no light values, and the light concept image in `design/` is not to be used. | Leave the light values already in `tokens.ts` unchanged, and apply only the shape changes (radius, padding) to both themes. The alternative is to derive a new light palette from the new dark one, which has no reference to check against. |
| 3 | **Home node values.** The image shows kW for Solar, Grid, Battery and Home as if live. There is no live source. | Show the latest saved simulation at the interval matching the current time of day, labelled `SIMULATED`, and a dash when no run exists. This needs one extra request for the full run. |
| 4 | **"Today's Generation".** The only hourly series is the PV estimate for a representative day (`GET /buildings/{id}/pv`). The weather solar forecast is per day, not per hour. | Draw the hourly PV estimate and title it honestly (for example "Estimated generation · SIMULATED representative day"). Leave out the "+12%" badge: nothing to compare with. |
| 5 | **Weather card needs a city.** The image shows weather with no input. The API needs a city on every call, and nothing stores one. | Remember the last city on the device, show the compact card when one is saved, and keep the existing detailed card and its input reachable. |
| 6 | **Bell with a red dot.** There is no notification feed. | Either drop the bell, or make it open Operations and show the dot only when the incidents endpoint returns open incidents. I recommend the second. |
| 7 | **AI chat input.** The image has a free-text box and a "Running simulation…" checklist. No model or assistant endpoint exists, and each tool is a single request. | Keep the chat look for suggestion chips and results, but do not ship a free-text box that cannot answer. Show real request state instead of invented checklist steps. |
| 8 | **"AI Recommendation" and "Apply Schedule".** The scheduler is a constraint solver, not AI, and the API has no apply step or savings figure. | Title the card "Optimized schedule", fill it from the solver result, and keep the button as "Solve & Save Schedule". |
| 9 | **Where the extra Simulation tools go.** The image has four blocks. The screen today has ten cards (replay, telemetry, automation, plans, resilience, forecast, saved runs). | Keep them, below the reference layout or behind a "More tools" section. Removing them would break tested flows. |
| 10 | **Inter font.** Not loaded today; no font package is a dependency. | Needs a new dependency or font files. Decide separately; the layout work does not depend on it. |

## Tokens

| Token | `DESIGN_TOKENS.md` | `tokens.ts` now | Note |
|---|---|---|---|
| Background | `#090C0A` | `#090B0A` | Pinned by test |
| Card | `#101512` | `#1B1D1B` (`surface`) | Pinned by test. New card is much closer to the background (1.06:1), so the 1px border carries the edge |
| Card border | `#1E2621` | `#343A33` | Pinned by test |
| Icon tile | `#1A221D` | `#262927` (`surfaceElevated`) | Pinned by test |
| Text | `#E8EEEA` | `#F7F8F5` | Pinned by test |
| Muted text | `#8A968F` | `#A6ADA4` secondary, `#737B72` muted | New muted is 6.0:1 on the new card, so it passes AA |
| Lime | `#B8F23A` | `#C6F43D` | Pinned by test |
| Button gradient | `#C6F94A` to `#A9E42C` | `#E1FF67`, `#C6F43D`, `#99D40A` | Pinned by test; three stops become two |
| Cyan, amber, red | `#5CD8FF`, `#FFC46B`, `#FF6B5A` | `#28CEDB`, `#F9BC46`, `#FF626A` | All pass AA on the new card |
| Teal | `#34D8B0` | none (`green` is `#4DE1A2`) | New token, or map to `green` |
| Glow | `rgba(184,242,58,0.3)` | none | New token |
| Card radius | 18 | 20 | Pinned by test |
| Dock radius | 26 | 30 | Pinned by test |
| Screen padding | 16 | 18 | Pinned by test |
| Primary button | height 50, radius 16 | min height 48, radius 16 (`Action`); height 52, radius 14 (`LimeCTA`) | Two button components exist today |
| Toggle | 44 x 26 | 48 x 28 | Row stays the touch target |

The header comment in `tokens.ts` and sections 0 and 1.1 of `UI_DESIGN_SPEC.md` still point at `design/` images. The token commit will change the comment and add a short note at the top of the spec; the rest of the spec text stays as written.

`tokens_contrast.test.ts` checks contrast by rule, not by fixed value, so it will keep guarding whichever values are chosen. I computed the new dark values against the new card and background: every text colour is above 4.5:1.

## Shared pieces that affect all six screens

| Piece | Reference | Now | Gap |
|---|---|---|---|
| Bottom dock | Height 64, radius 26, five icons, active item is a 44px lime circle with glow and no label | `FloatingTabDock`: height 64, radius 30, active item is a wide lime pill with a text label | Restyle the active state. Icons differ too: reference uses home, grid, bars, map pin, chat bubble; current uses Home, Sliders, Activity, Sun, Bot |
| Screen header | 44px round back button, title 19 semibold, round kebab button on the right | `ScreenHeader` in `TwinControls`: optional back button, 24px bold title, subtitle, optional right slot | Extend `ScreenHeader` (smaller title, kebab slot). The tab screens have nothing to go "back" to, and a kebab needs a real menu behind it |
| Provenance banner | Not in any image | `SolvantaScreen` draws an amber banner pill at the top of every screen | Keep the label, because the honesty rule requires it, but it can shrink to a small chip in the header or on each data card |
| Pinned primary button | Full-width lime button fixed above the dock | Buttons sit inside the scrolling content | `SolvantaScreen` needs a footer slot above the dock |
| Segmented control | Card-coloured track, lime active pill | `PillSegmentedControl` already matches this | Reuse as is |
| Cards | `#101512`, 1px border, radius 18 | `Card` in `TwinControls` | Follows tokens once decision 1 is made |
| Building choice | Home shows "Home · Islamabad" with a chevron; other screens show nothing | Every screen starts with a `BuildingPicker` card | Move building choice into the Home header dropdown. Other screens still need to know which building is active, so the selection logic in `useBuildings` stays |

Components that already exist but are not used by any screen: `EnergyFlowSvg`, `EnergyBarChart`, `BatterySocRing`, `EnergyMetricCard`, `ApplianceRow`, `ScheduleTimeline`, `RecommendationCard`, `ApprovalActions`, `IncidentCard`, `MCPToolResultCard`, `RoofPolygonEditor`. Several were written against fixture data and have hard-coded text or colours, so "reuse" below means extend them, not drop them in.

## Screen 1: Energy Overview (`mobile/app/(tabs)/index.tsx`)

**What exists.** Amber banner; `ScreenHeader` ("Solvanta", building name, settings icon); lime `NeonHeroCard` summarising the latest saved simulation; `BuildingPicker`; a status message; "Configured system" metric tiles; "Latest saved simulation" metric tiles; six action tiles including "Size Solar from Bill"; `WeatherCard` at the bottom. Data comes from `GET /buildings/{id}/equipment` and `GET /buildings/{id}/simulations`.

**What differs from `screen-1-energy.jpg`.**

| Reference | Now | Gap and data source |
|---|---|---|
| Header: leaf logo, "Solvanta", "Home · Islamabad" dropdown, bell | Title, building name, settings icon | Building `address` can supply the place name. Settings needs a new home if the bell replaces it. Bell: decision 6 |
| Compact weather card: icon, condition, temperature, "Good irradiance" | Full-width form card at the bottom that needs a city typed each time | Condition and temperature come from `/weather/forecast`. "Good irradiance" is not in the API; cloud cover is, so show that instead. City: decision 5 |
| Large house image | None | `home-house.png` exists (1024 x 986, transparent, 1.15 MB). It has its own lime glow baked in, which may look wrong on the light theme |
| Flow lines from the house base to a lime hub, branching to four cards | `EnergyFlowSvg` exists but is unused, and draws a different diagram: three diagonal lines, circles, a fixed "OUTAGE SIMULATED" badge | Rework `EnergyFlowSvg` into the hub-and-branch layout. Its hard-coded badge has to go |
| Four node cards: Solar, Grid, Battery (with bar), Home, in kW | Metric tiles for configured kWp, kW, kWh, % and for simulation kWh | No live power. Decision 3. The battery bar would be state of charge in %, while the image prints kW next to it; show both honestly or SoC only |
| "Today's Generation": total kWh, "+12%" badge, 14 bars, kebab | `EnergyBarChart` exists but is unused, and is a seven-bar "usage history" with day labels | Extend `EnergyBarChart` for hourly bars with gradient fill. Decision 4. No kebab unless it opens something |
| No hero card, no tiles | Hero card and six tiles | Tiles stay below the chart so navigation and "Size Solar from Bill" keep working. The hero card duplicates what the nodes will show |

**Reuse or extend.** `SolvantaScreen` (add header and footer slots), `ScreenHeader`, `WeatherCard` (add a compact mode, keep the full one), `EnergyFlowSvg` (rework), `EnergyBarChart` (extend), `Metric`, `Tile`, `NeonHeroCard`, `useBuildings`.

**Notes for the build.**

- `react-native-reanimated` 4.5.1 is installed but no file imports it yet, so this would be its first use. Jest runs under `ts-jest` in a Node environment with `react-native` mocked per test, so any test that renders the new Home will need a reanimated mock.
- `useReducedMotion` is exported by the installed version, which covers the reduced-motion rule.
- The flow lines must be positioned from measured layout, not fixed coordinates, or they will drift from the cards at 360px and with larger text.
- The house image should not be animated, as instructed.

## Screen 2: Appliances (`mobile/app/(tabs)/appliances.tsx`)

**What exists.** `ScreenHeader`; `BuildingPicker`; a card with the scenario-only notice, three metric tiles, a status line, filter chips (All, Critical, Flexible) and one nested card per appliance holding name, power, runtime, window, priority badges, a full-row scenario toggle, and Edit and Delete buttons; "Add Appliance" at the end of the list; the add/edit modal and the delete confirmation.

**What differs from `screen-2-appliances.png`.**

| Reference | Now | Gap |
|---|---|---|
| One compact row per appliance: icon tile, name, "150 W · Critical", toggle | Tall card per appliance with five lines and two buttons | Collapse to one row. Edit and Delete need a new entry point: tapping the row to open the existing edit modal, with Delete inside it, is the least surprising |
| Per-appliance icons (fridge, AC, pump, bulb, monitor) | No icons | The API has no appliance type. Icons would have to be guessed from the name, which is cosmetic but can be wrong; a single generic icon is the safe default |
| Filter chips: All, Critical, Flexible, Others | All, Critical, Flexible | "Others" can be computed on the device (neither critical nor flexible) |
| Priority words: Critical, Flexible, Essential, Important | API has `critical`, `medium`, `low`, plus critical and flexible flags | "Essential" and "Important" do not exist. Show the real priority |
| "Add Appliance" pinned above the dock | Button at the end of the list | Needs the `SolvantaScreen` footer slot |
| No summary numbers, no notice | Requested load, critical demand, selected count, and the scenario-only notice | The notice is required by the spec, so it stays in a compact form. The summary can become one line |
| Back button and kebab | Neither | A tab has no back target; kebab needs a real menu |

**Reuse or extend.** `ApplianceRow` (unused today, already close to the reference row; it uses `ScenarioToggle`, while the screen uses `Toggle`, so settle on one), `Chip`, `Toggle`, `PriorityBadge`, `ModalSheet`, `ConfirmDialog`, `Action`. The 21 tests in `appliances_modal.test.tsx` find buttons by label ("Edit Water pump", "Delete Water pump", "Add Appliance"), so the new row must keep those accessible names or the tests must be updated with it.

## Screen 3: Simulation (`mobile/app/(tabs)/simulation.tsx`)

**What exists.** `ScreenHeader`; `BuildingPicker`; an "Outage scenario" card with a minute-range text field, a generator toggle, "Run & Save Simulation" and a link to Scheduling; after a run, `TwinReplay` and a result card with six metric tiles, `SocGauge`, a state-of-charge bar strip, interval stepping and seven per-interval tiles; then `TelemetryCard`, `AutomationCard`, `PlanCard`, `ResilienceCard`, `ForecastCard` and "Saved runs".

**What differs from `screen-3-simulation.png`.**

| Reference | Now | Gap and data source |
|---|---|---|
| Normal / Outage / Custom segmented control | One text field for minute ranges | Normal can mean no outage and Custom the existing field. Outage needs a preset, which is a product choice |
| Outage card: "6 Hour Outage", "Tomorrow · 10:00 AM – 4:00 PM", edit pencil | Raw minutes such as `480-600` | Times can be formatted from the minutes. The simulation is a representative day, so "Tomorrow" would be untrue; show times only |
| Three stats: Battery at start, PV Generation, Total Load | Six result tiles after a run | Battery at start is the configured initial state of charge. PV and load come from the run summary and cover 24 hours, not just the outage; dash before a run |
| "Battery Level (Simulated)" line chart, Current Plan vs Optimized Plan | Gauge plus a bar strip; the comparison lives in `ResilienceCard` as numbers | The data exists: the resilience result returns a baseline trace and an optimized trace. A line chart component does not exist and must be built with `react-native-svg` |
| "Appliances Status": Running, Paused, Deferred counts | Per-appliance activity lines inside `TwinReplay` | The API has no paused or deferred state. Only "requested in this interval", "outside window" and "not selected" are known. Use those words, or show dashes |
| "Run Simulation" pinned above the dock | Button inside the first card | Footer slot. Keep the accessible name "Run & Save Simulation" or update the flows |
| Nothing else on the screen | Six more cards | Decision 9 |

**Reuse or extend.** `PillSegmentedControl`, `Metric`, `SocGauge`, `TwinReplay`, `ResilienceCard` (source of the two curves), `parseOutages`, and all the existing cards. `BatterySocRing` is unused and overlaps with `SocGauge`.

## Screen 4: Scheduling (`mobile/app/scheduling.tsx`)

**What exists.** A stack screen outside the tabs, so the dock is hidden on it. `ScreenHeader` with a back button; `BuildingPicker`; a card with the outage field and "Solve & Save Schedule"; a result card with status badges, the solver's notes, a 00 to 24 axis and one nested card per appliance with a single-lane bar and its times; "Saved schedules".

**What differs from `screen-4-scheduling.png`.**

| Reference | Now | Gap and data source |
|---|---|---|
| Dock visible with the Simulation tab active | No dock | Needs a routing change (move under the tab layout), which touches navigation; treat as its own step |
| Today / Tomorrow / Custom | None | The scheduler has no date. It solves one representative day. These tabs would be decoration unless the API gains a date |
| One shared timeline with lanes and a legend: Solar, Battery, Grid, Appliance | One bar per appliance card | Appliance lanes exist in the result. Solar could be drawn from the PV estimate and grid from the outage input. The scheduler excludes the battery, so a battery lane would be untrue |
| Lime "AI Recommendation" card with "Save 2.3 kWh and extend backup by 1.6 hours" | Status badges and solver text | Decision 8. The result has status, validation flag, objective text and requested kWh. It has no savings or backup-hours figure |
| Rows by time block with tags: Always on, Run flexible, Optimized, Balanced | Rows by appliance with a priority badge | The API returns segments per appliance, not named blocks. Rows can show each appliance's time range, with tags from real fields (fixed, flexible, priority) |
| "Apply Schedule" pinned | "Solve & Save Schedule" in the first card | Decision 8. The spec says apply means "run revised simulation", never switching equipment |

**Reuse or extend.** `ScheduleTimeline` (unused; takes hours and a colour per task, so it can become the shared multi-lane timeline), `NeonHeroCard` for the lime card (`RecommendationCard` is unused, takes coverage figures and has hard-coded colours), `PillSegmentedControl`, `PriorityBadge`, `Badge`, `ListAction`.

## Screen 5: Rooftop Analysis (`mobile/app/(tabs)/rooftop.tsx`)

**What exists.** `ScreenHeader` ("Rooftop studio"); `BuildingPicker`; "Roof photo" card (import or take a photo); "Roof layout" card with a Roof / Obstacle / Scale segmented control, the tappable canvas, a legend and undo and obstacle buttons; "Measurements" card with typed vertices, scale distance, four geometry fields, Calculate and Save, and area and panel tiles; "AR preview" card that checks ARCore and opens the `rooftop-ar` screen or shows `ARCapabilityFallback`; `PVDesigner` with nine numeric fields, optional string checks, an irradiance field, the estimate, a chart and warnings.

**What differs from `screen-5-rooftop.png`.**

| Reference | Now | Gap and data source |
|---|---|---|
| Map / Design / AR View tabs | Everything on one long page | Design and AR View map to existing parts. There is no map or satellite feature and no maps dependency; the closest real thing is the roof photo, so the first tab should be "Photo" |
| Roof drawing: grid background, dark roof, navy panels with lime outline | Lime-tinted polygon, lime panel outlines, vertex dots | Styling only |
| North arrow | None | The roof image has no known orientation (azimuth belongs to the panels), so a north arrow would be a guess. Leave it out |
| Obstacle label "Water tanks" | Unlabelled red polygons | Obstacles have no name in the API |
| "9.0 m usable width" dimension line | None | Not returned by the API. A roof width can be computed on the device from the saved scale, and must be labelled as that |
| Three stats: Usable Area, Panels, Est. Daily | Roof area, usable area, panels; daily energy sits in `PVDesigner` | Est. Daily is the PV estimate's daily energy, a `SIMULATED` representative day |
| "Panel Configuration" list: Panel Type, Tilt Angle, Orientation, each a dropdown | Nine numeric text fields | Wattage, tilt and azimuth exist. "Monocrystalline" is not stored. Orientation can show a compass word for the azimuth. The other six fields need an "Advanced" section |
| "View in AR" pinned | "Preview in AR" inside a card | Same action. The capability check and fallback must stay; AR has not been verified on a device in this work |
| No editing controls visible | Drawing modes, undo, obstacle and scale controls | The reference shows a finished design. Editing still has to live somewhere, for example an Edit mode on the Design tab |

**Reuse or extend.** `PillSegmentedControl`, the existing canvas and its helpers in `src/api/roof.ts`, `Metric`, `PVDesigner` (split into a short list and an advanced section), `ARCapabilityFallback`, `detectARCapability`. `RoofPolygonEditor` is an unused static mock with hard-coded colours; I would not build on it. The rooftop tests (`rooftop_ar_flow`, `rooftop_ar_screen`, `roof_geometry`) press buttons by label, so labels such as "Save Roof", "Calculate Placement" and "Preview in AR" either stay or change together with the tests.

## Screen 6: Solvanta AI (`mobile/app/(tabs)/ai.tsx`)

**What exists.** `ScreenHeader` ("Operations"); `BuildingPicker`; `OperationsTools`, which lists saved runs as chips and nine engine tools as buttons, then shows the result with a source badge and a JSON block; an "Incidents" card. The screen states that no language model is connected.

**What differs from `screen-6-assistant.png`.**

| Reference | Now | Gap and data source |
|---|---|---|
| Title "Solvanta AI · Your Energy Assistant" | "Operations" | Wording. The spec asks for an operations console, not a chatbot; the image is a chat. The image now wins on layout, but the honesty rules still limit what it may claim |
| Greeting bubble "Hello Usman!" | None | The name can come from `GET /auth/me`. Without a sign-in, greet without a name |
| Four suggestion chips | Nine tool buttons named after the tools | Three chips map to real tools: outage simulation, schedule optimisation, configuration comparison. "Explain my energy usage" has no engine behind it |
| User message bubble | None | Fine as an echo of the chip that was tapped |
| "Running simulation…" with four ticked steps (weather, solar, schedule, battery) | One status line | Each tool is one request, and these steps do not happen. Show real state: running, done, failed |
| Free-text input with send button | None | Decision 7 |
| No JSON, no run picker, no incidents | All three | Results need a readable summary. The run picker is required by most tools. Incidents can move under the bell (decision 6) |

**Reuse or extend.** `OperationsTools` and its `resultSummary` (keep the logic, change the presentation), `MCPToolResultCard` (unused; its props assume a coverage figure and duration that the tool result does not return, so it needs reshaping), `Chip`, `Message`, `Badge`.

## Suggested order

1. Tokens and shared pieces (decisions 1 and 2): tokens, dock, `ScreenHeader`, `SolvantaScreen` footer slot. One commit each.
2. Screen 1, as already planned for Step 2.
3. Screens 2 and 5, which are mostly re-layout of existing data.
4. Screen 3, which needs the new line chart.
5. Screens 4 and 6, which depend most on decisions 7 and 8.

## Limits of this analysis

- Based on reading code and images. The app was not run, and no measurement of the reference images was taken beyond reading them by eye.
- The reference images are dark only, so light mode has no target.
- I did not check the references against a phone. All earlier visual work in this project was verified on the web export only.
