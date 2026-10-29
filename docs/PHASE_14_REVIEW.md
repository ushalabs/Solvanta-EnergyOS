# Phase 14 — Simulated telemetry and incident operations

A typed TelemetryProvider interface and deterministic SimulationProvider generate 96 aligned synthetic observations from a saved simulation. PV/load units are kW and SoC is percent. Validation rejects nonfinite, negative and misaligned observations. Seeded none/PV-dropout/battery-drain/load-spike fixtures are explicit; unavailable PV/battery fixtures reject rather than invent readings. There is no connected inverter adapter.

Residual rules require consecutive anomalous intervals and store expected/observed values, residuals, thresholds, units and possible causes as evidence. Telemetry streams and incidents are persisted and building-scoped. Cause indicators are hypotheses, not hardware diagnoses. The mobile Simulation screen generates labelled fixtures, loads incidents and can check synthetic post-plan response against a VERIFIED approved plan's linked run. Match and continued mismatch are persisted separately; no physical repair is claimed.

The anomaly n8n workflow polls open incidents once per minute, creates a correlated approval event and follows the existing durable approval/simulation/verification path. Incident row locking prevents concurrent event duplication. Old open incidents are polled before newer ones to avoid starvation.

Verification: 71 backend tests, 31 mobile tests, TypeScript and web export pass; targeted telemetry/automation suites pass after concurrency safeguards. Live evidence in docs/evidence/phase14/detector-workflow.json records a load-spike incident, scheduled n8n execution, approved VERIFIED plan, clean MODEL_MATCH response and continued-anomaly FAILED response. Execution metadata is whitelisted; secrets are excluded.
