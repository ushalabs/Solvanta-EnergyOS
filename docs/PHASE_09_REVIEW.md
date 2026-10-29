# Phase 9 — Constraint-aware scheduling

OR-Tools CP-SAT schedules every selected appliance at one-minute resolution within its earliest/latest bounds. Fixed loads remain at earliest start. Flexible loads can move, and interruptible loads can use no more than max_interruptions + 1 blocks. Exact required runtime is enforced; noninterruptible runs are contiguous. Prototype limits are 20 selected appliances and a five-second solve budget with one worker and a fixed random seed.

Supply is deliberately conservative: PV design AC output plus grid import capacity outside outages. Battery and generator dispatch belong to Phase 10 and are excluded here. Demand is rounded upward and available power downward to whole watts. Each minute must fit the budget, which also bounds total energy. The objective minimizes priority-weighted delay for all required minutes (critical 10, medium 3, low 1). Loads are never silently dropped to produce feasibility.

An independent validator reconstructs runtime, continuity, windows, fixed-start behavior and real-valued per-minute demand from returned segments. Only validated feasible schedules are saved with immutable input and source-budget snapshots. Infeasible and time-limited unresolved results are distinct and include conflict information. Building authorization applies to solving and history retrieval. The mobile scheduling screen shows saved timelines and per-load activity segments.

Validation: 55 backend tests, 29 mobile tests, TypeScript and SDK 58 web export passed. Tests include a hand-calculated priority objective, continuity/interruption cases, impossible power budgets, independent rejection of tampered results, persistence, and cross-tenant rejection. Native phone interactions are not claimed.

Solver reference: https://developers.google.com/optimization/cp/cp_solver
