<p align="center">
  <img src="docs/assets/solvanta-banner.png" alt="Solvanta — Building Energy Intelligence. Prototype to MVP. React Native, Expo, TypeScript, FastAPI, PostgreSQL, OR-Tools, Docker, n8n and MCP." width="100%" />
</p>

<p align="center">
  <strong>PROTOTYPE PHASE · MOVING TOWARDS MVP</strong><br />
  Model your energy. Understand your backup. Plan for the outage.
</p>

Solvanta is an Android-first building energy digital twin that brings solar design, appliance priorities and backup planning into one workflow. Explore what happens during a power outage, compare alternatives and review a plan before running its simulation.

## Inside the prototype

<table>
  <tr>
    <th width="25%">Energy overview</th>
    <th width="25%">Load priorities</th>
    <th width="25%">Outage scenarios</th>
    <th width="25%">Rooftop studio</th>
  </tr>
  <tr>
    <td><img src="docs/ui-evidence/android/01-overview-dark.png" alt="Earlier Android prototype: neon energy overview and flow diagram" width="220" /></td>
    <td><img src="docs/ui-evidence/android/02-appliances-dark.png" alt="Earlier Android prototype: appliance selection and load priorities" width="220" /></td>
    <td><img src="docs/ui-evidence/android/03-simulation-dark.png" alt="Earlier Android prototype: battery reserve gauge and outage scenario" width="220" /></td>
    <td><img src="docs/ui-evidence/android/05-rooftop-dark.png" alt="Earlier Android prototype: rooftop geometry and solar panel layout" width="220" /></td>
  </tr>
</table>

*Screenshots show the earlier Android UI prototype with fixture data. The current integrated build and its validation are documented in the [project status](docs/STATUS.md); the final visual overhaul is still ahead.*

## Product modules

### Building & appliance digital twin

Create a building profile with its solar array, inverter, battery, grid connection and optional generator. Register individual appliances with power ratings, criticality, required runtime and operating windows, then select the loads to include in a scenario. This turns equipment specifications into a model of the building's energy needs.

### Rooftop & solar planning

Calibrate a roof drawing to real dimensions, define boundaries and obstacles, and explore panel placement with setbacks. Estimate PV capacity and daily generation from the saved layout and irradiance assumptions to connect rooftop space with the energy available to the building.

### Outage simulation & shortage forecasting

Explore how solar, batteries, grid supply and an optional generator serve demand across a day in 15-minute intervals. Inspect battery state of charge, unmet demand and critical-load shortages during configured outages. Persistence-based projections use configured or saved simulated profiles to estimate where shortages may occur.

### Appliance scheduling & backup resilience

Schedule selected appliances within their runtime, flexibility and interruption constraints using the available solar and grid power budget. Compare baseline dispatch with a critical-reserve strategy that preserves battery energy for essential loads. Results expose unmet demand and infeasible schedules so users can see where their configuration falls short.

### What-if comparisons & human approval

Compare the current configuration with hypothetical battery or PV capacity changes and inspect the resulting energy tradeoffs. Submit a plan for review, approve or reject it, then simulate the approved snapshot and verify its results. Revision checks and audit records keep each decision tied to the inputs that were reviewed.

### Digital twin replay

Play, pause and seek through a saved simulation to follow energy flows, battery charge and requested appliance activity over time. Replay uses the recorded scenario rather than silently substituting the building's latest settings, making it easier to explain and revisit a result.

### Energy operations & incident evidence

Generate explicitly simulated telemetry and examine persistent PV, battery or load mismatches against the expected trace. Incident records include supporting evidence and possible causes, with post-plan checks that evaluate synthetic model consistency. This provides an operations workflow for investigating scenarios without claiming real hardware diagnosis.

### Workflow automation & engineering tools

Coordinate shortage response, daily planning and anomaly incidents through n8n workflows with durable approval waits. Nine authenticated MCP tools expose building profiles, saved scenarios, simulation, forecasting, scheduling, resilience, configuration comparison, anomalies and plan proposals. The mobile Operations page calls the same engineering services; proposals stay pending until explicitly approved.

## One connected workflow

**Model the building → Explore an outage → Compare options → Review a plan → Approve → Simulate & verify → Replay the outcome.**

Solvanta connects design assumptions with operational decisions, helping users understand which loads can be supported, when appliances can run and how changes affect backup resilience.

## Tech stack

| Layer | Technologies |
|---|---|
| Mobile | React Native · Expo · TypeScript · Expo Router |
| API & data | Python · FastAPI · Pydantic · SQLAlchemy · PostgreSQL |
| Engines & operations | OR-Tools · Docker · n8n · Official Python MCP SDK |

## Towards MVP

The core simulation workflow is implemented. Next are the remaining GUI overhaul, AR/VR, native dev-client/APK validation and user testing. Energy results and telemetry are simulated; the prototype does not control electrical equipment.

[Product status](docs/STATUS.md) · [Architecture](docs/ARCHITECTURE.md) · [MCP tools](docs/MCP.md)
