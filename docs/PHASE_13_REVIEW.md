# Phase 13 — Durable automation

Three importable n8n 2.45.6 workflows implement Energy Shortage Response, Daily Planner and Anomaly Incident. Authenticated webhooks and manual triggers feed authenticated backend calls; Daily Planner also has a daily schedule. A 70-second Wait node durably polls backend plan state. Only explicitly approved plans are simulated and verified. Rejected/expired paths terminate; modification requests remain waiting. Every request carries correlation/event IDs, revision checks and deterministic idempotency keys with bounded retries.

Backend events are stored under actor/event uniqueness and a transaction advisory lock, so concurrent retries create a single plan. Conflicting event bodies return 409. Notices and plan refresh are available in the Simulation screen. Backend plan rules continue to own authorization, expiry, actions and verification.

Verification: 65 backend tests, 31 mobile tests, TypeScript and web export pass. Real production n8n webhooks executed all three workflows with seeded SIMULATED data. n8n was restarted during the durable wait. Shortage and anomaly events reached VERIFIED with linked simulation IDs; Daily Planner was explicitly rejected and created no run. All three n8n executions recorded success. Exact version, execution IDs, states, timestamps and correlations are in docs/evidence/phase13/n8n-executions.json. Credentials and full execution payloads are excluded.

Workflow/configuration instructions are in workflows/README.md. The demo identity uses a short-lived local token; refresh credentials with setup. No electrical control is implemented. Automatic detector-to-incident polling is added in Phase 14.
