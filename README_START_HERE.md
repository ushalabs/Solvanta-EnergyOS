# Solvanta FYP-I — GPT + Antigravity Handoff Pack

Prepared **28 October 2026** for the **28 Oct–10 Nov** local-prototype-through-MCP target. The target is aggressive and is **not** guaranteed; user approval is required after every phase.

## What this package contains

- `Solvanta.md` — project-wide product/domain/engineering context, updated with the new design + approval contract.
- `AntiGravity_prompt.md` — **NEW full master prompt (revision 3.0)** covering Phases 0–17, implementation/test acceptance criteria, n8n/MCP, GitHub commit and human approval gates.
- `UI_DESIGN_SPEC.md` — exact reference-matched design tokens, seven screen layouts and interactive behavior.
- `design/reference/Neon_Smart_Home_Reference.png` — original screenshot the user supplied (mandatory aesthetic reference).
- `design/Solvanta_Six_Screen_Mockups.png` — original Solvanta six-screen concept board. **Illustrative UI only, not working screenshots.** Generated labels/figures are not authoritative.
- `design/Solvanta_Light_Mode_Concept.png` — optional visual reference for settings and light mode; illustrative.
- `design/Solvanta_Design_Tokens_Concept.png` — optional visual palette/component concept; textual tokens in UI design spec are authoritative.

## Setup on GitHub

1. Create the empty `Solvanta` GitHub repository.
2. Upload the **contents** of this pack to the repo root, maintaining `design/` file paths.
3. Start new GPT chat with `Solvanta.md`, `AntiGravity_prompt.md` and `UI_DESIGN_SPEC.md`, plus the repository URL.
4. In Antigravity, open the repository and give it **AntiGravity_prompt.md** as its master instruction. Show the primary supplied screenshot as a reference.
5. Antigravity begins **Phase 0 only**, creates tested changes, commits and pushes, requests user approval, and **does not start Phase 1** until user authorizes it.

## What is not promised

No application code has been implemented or pushed by this handoff. Native AR and Expo SDK version compatibility require a physical/runtime proof. FYP-II real inverter integration, physical control and production release are separate milestones. A generated mockup is not a verified app screenshot.
