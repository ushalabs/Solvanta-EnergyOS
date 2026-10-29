# Phase 12 — Digital twin replay and native AR gate

Saved energy traces drive play/pause, speed, seek, restart, accessible interval adjustment, source-flow values, served demand, unmet critical energy, battery state and requested appliance activity. Partial runtime intervals come from the saved snapshot, not current equipment edits. Activity labels distinguish requested runtime from aggregate served energy because individual-device service cannot be inferred from aggregate unmet load. Saved plan simulation runs appear in the same history.

The measured rooftop editor remains the functional 2D preview. Native AR has an explicit build gate: ViroReact 3.0.3 excludes Expo SDK 58 and no ADB device is connected. See AR_COMPATIBILITY.md for exact metadata and the hardware validation path. Camera anchoring/alignment is not implemented or verified; Phase 12 is complete for 2D replay but remains blocked for native AR.

Validation: 31 mobile tests pass, TypeScript clean, SDK 58 web export succeeds for 14 routes. Backend was unchanged and its last full suite passed 64 tests in Phase 11. Seek bounds and partial-interval activity are tested. Native camera/anchor tests cannot pass in this environment and remain explicitly blocked.
