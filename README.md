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

## What it does

- **Model the building:** calibrated roof geometry, PV estimates, battery configuration and appliance constraints.
- **Plan for outages:** energy-balance simulation, shortage projections, constrained scheduling and resilience comparisons.
- **Keep decisions reviewable:** approval records, saved-run replay, simulated incident evidence, n8n workflows and nine authenticated MCP tools.

## Tech stack

| Layer | Technologies |
|---|---|
| Mobile | React Native · Expo · TypeScript · Expo Router |
| API & data | Python · FastAPI · Pydantic · SQLAlchemy · PostgreSQL |
| Engines & operations | OR-Tools · Docker · n8n · Official Python MCP SDK |

## Run locally

Use **Python 3.13**, **Node.js 24** and **Docker**. The [setup guide](docs/RELEASE_HANDOFF.md) covers the database, demo seed, API and Expo preview.

[Architecture](docs/ARCHITECTURE.md) · [MCP tools](docs/MCP.md) · [Validation & delivery](docs/DELIVERY_LEDGER.md)

## Towards MVP

The core simulation workflow is implemented. Next are the remaining GUI overhaul, AR/VR, native dev-client/APK validation and user testing. Energy results and telemetry are simulated; the prototype does not control electrical equipment.
