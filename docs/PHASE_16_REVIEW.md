# Phase 16 — Authenticated MCP Tools

Nine typed tools now expose real saved building/scenario data, baseline simulation, persistence forecasting, constrained scheduling, resilience comparison, three configuration presets, anomaly evidence and pending-only plan proposals. The official Python SDK 1.28.0 serves stdio; the mobile Operations page uses a bearer-authenticated HTTP gateway to the same service. No LLM execution or physical control is claimed.

A scenario is an immutable saved simulation run UUID. Every tool checks the active authenticated user and building access. Tool inputs cannot supply identity or roles. No approval tool exists. Proposals are audited and remain PENDING_APPROVAL without a run ID until the existing human review flow is used.

## Validation

- Full backend suite: 77 passed, including official SDK subprocess client, typed output schemas, engine-vs-REST consistency, invalid UUID/unknown tool, forged authentication, cross-tenant gateway access and pending-only audited proposals.
- Mobile: 34 tests passed; TypeScript passed; static export produced 14 routes.
- `python scripts/verify_mcp.py`: all nine real stdio calls succeeded against the Phase 15 fixture. Baseline output matched REST exactly, the grid scenario produced a validated saved schedule, and the proposal remained PENDING_APPROVAL. Credential-free evidence: `evidence/phase16/mcp-client.json`.
- `pip check`, UTF-8 checker and diff whitespace check passed.

The SDK/Pydantic settings combination emits an unresolved-lifespan-annotation warning at startup; the actual protocol initialization, schema listing and calls passed. Tokens stay in process environment, never evidence files. Mutations are not retry-idempotent; clients must inspect records after an uncertain response rather than automatically retrying.

See `MCP.md` for client setup, exact arguments and source/units contracts. Native Android, AR, final visual overhaul and packaging remain deferred. Phase 15's Expo CLI Zod dependency finding remains open.
