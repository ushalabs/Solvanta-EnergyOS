# Phase 11 — Alternatives and approved simulation plans

Three alternatives use immutable what-if snapshots: current equipment, 50% more nominal/usable battery capacity at unchanged power ratings, and 25% more PV clipped to the existing inverter. Inputs and installed equipment are preserved. Each alternative shows numerical energy outcomes and explicitly identifies design/cost limits.

Plan transitions are DRAFT -> PENDING_APPROVAL -> APPROVED / REJECTED / MODIFICATION_REQUESTED, with revision selection returning modification requests to DRAFT. Only APPROVED plans can create a linked simulation. SIMULATED plans pass deterministic replay and independent physical checks to reach VERIFIED, or persist FAILED with errors. Approval does not physically switch equipment. Expired plans reject further actions; new evidence requires a fresh plan.

Building access checks authorize every action/history/audit read. Row locks plus expected revisions serialize concurrent approvals. Actor-bound idempotency receipts replay identical requests without repeating work; changed requests using a key conflict. Audit entries record actor, transition, revision, comment and linked simulation, and can be loaded from the mobile review card.

Verification: 64 backend tests, 29 mobile tests, TypeScript and web export pass. Checks include three alternatives, tampered verification failure, full approval/simulation/verification flow, duplicate/stale/conflicting requests, concurrent approval, modification, rejection, expiry and cross-tenant denial. Native device interaction remains unverified.
