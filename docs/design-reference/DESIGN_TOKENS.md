# Design reference

Six target screens live in this folder (screen-1 to screen-6). Match them. They are the visual spec for the mobile app.

## Colours
- Background: #090C0A
- Card: #101512, 1px border #1E2621, radius 18
- Icon tile: #1A221D
- Text: #E8EEEA, muted #8A968F
- Accent (lime): #B8F23A, button gradient #C6F94A to #A9E42C, glow rgba(184,242,58,0.3)
- Secondary: cyan #5CD8FF, amber #FFC46B, teal #34D8B0, red #FF6B5A

## Shape and type
- Font: Inter (or Sora for titles). Screen title 19 semibold. Body 13 to 15. Captions 10.5 to 12.
- Primary button: height 50, radius 16, lime gradient, soft lime glow
- Segmented control: card background, active pill lime with dark text
- Toggle: 44x26, on = lime
- Bottom nav: floating pill, height 64, radius 26, active item is a lime circle (44) with glow
- Screen padding 16, gap 10 to 12

## Screens
1 Energy Overview: header (logo, city, bell), weather card, glowing house image, flow lines to a lime hub, four nodes (Solar, Grid, Battery with bar, Home), Today's Generation bar chart
2 Appliances: filter chips, rows with icon, name, watts and priority, toggle, Add Appliance button
3 Simulation: Normal/Outage/Custom, outage card with 3 stats, battery line chart (current vs optimized), status tiles, Run Simulation
4 Scheduling: Today/Tomorrow/Custom, timeline, lime AI recommendation card, schedule rows with tags, Apply Schedule
5 Rooftop Analysis: Map/Design/AR View, roof design, stats, panel configuration, View in AR
6 Solvanta AI: greeting, suggestion chips, user bubble, running-simulation checklist, input bar

Numbers in the images are placeholders. Use live data and show a dash when empty.
