# Phase 6 — Appliance digital twin

Appliance records are saved per building with name, rated power, priority, criticality, flexibility, required runtime, earliest/latest minutes, interruption permission and maximum interruptions. Scenario selection is persisted in a separate table, so toggles do not modify equipment parameters. The list endpoint returns the selected appliances and an authoritative requested kW / critical kW summary. The mobile screen supports creation, editing, deletion, filtering, selection and status messages. It explicitly says that toggles do not switch physical appliances or circuits.

The API verifies authentication and building ownership for list, create, update, delete and scenario selection. Server and client reject invalid power, runtime, windows, priority/critical conflicts and interruption settings. The server recalculates demand after each change.

Phase-end checks: isolated database migrations and complete backend suite, complete mobile suite, TypeScript check and web static export. Native phone interaction remains for user testing; emulator boot had a System UI ANR during Phase 4 verification.
