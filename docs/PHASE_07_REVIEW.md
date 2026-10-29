# Phase 7 — Deterministic energy simulator

96 quarter-hour AC-bus intervals track PV, selected appliance demand, grid limits/outages, battery charge/discharge, generator, export, curtailment and unmet demand. Each saved run contains immutable equipment, appliance, PV and outage snapshots and the full numerical trace. Building access is checked on execution, listing and retrieval.

Battery energy stays between nominal capacity and the greater of the reserve threshold or nominal minus usable capacity. Round-trip efficiency is split symmetrically using its square root. Charge/discharge never occur together. The baseline dispatch is PV, grid, battery, then optional generator; generator minimum runtime is conservatively rounded to intervals and excess output is charged, exported or curtailed. Critical load receives available power first for unmet-demand accounting. This is a fixed baseline, not the Phase 10 optimizer.

Selected appliances start at their earliest minute and run for their required duration. Partial intervals contribute average power in proportion to overlap. Scheduling flexibility is stored but not optimized in this phase. PV uses the saved design's representative solar-hour profile as a scenario assumption; mapping to clock-hour intervals is explicitly approximate. All powers are interval means. Battery and PV have independent AC power limits; a shared hybrid inverter power envelope is not represented.

The mobile simulation screen runs/saves scenarios, reloads historical runs and displays a battery ring, 96-interval chart and per-interval source/energy values. Existing fixture screens retain demo labels. No native device control occurs.

Validation: 47 backend tests pass (including isolated migration roundtrip), 29 mobile tests, TypeScript and SDK 58 web export pass. Native device interaction has not been verified. Docker startup was recovered by preserving inaccessible socket-only runtime directories under backup names; PostgreSQL volume data was retained.
