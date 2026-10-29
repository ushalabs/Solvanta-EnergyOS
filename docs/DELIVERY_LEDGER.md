# Delivery and authorization ledger

The user authorized continued sequential work through Phase 17 with full phase validation, separate branch pushes and merges to main. This supersedes older LOCKED planning rows. It does not certify manual acceptance. The user expressly deferred AR/VR, final GUI overhaul and APK/dev-client packaging. Earlier phase approval statements below are historical records, not newly obtained approvals.

Each commit can be inspected in Git history; later cumulative suites cover earlier code. Historic counts do not claim tests were repeated on a native device. See individual `PHASE_*_REVIEW.md` files for precise limits.

| Phase | Delivery | Implementation SHA | Main integration SHA | Evidence/status |
|---|---|---|---|---|
| 0 | Repo audit | `50140d3` | `50140d3` | Historical approval recorded; initial documentation/toolchain audit |
| 1 | Mobile foundation | `d8c918a` | `d8c918a` | Historical approval recorded; native evidence is from the earlier SDK baseline |
| 2 | Backend runtime | `f4cfd29` | `472fc4c` | Historical PR #5; 15 backend / 16 mobile tests at that point |
| 3 | Equipment models | `fc208d7` | `0f066c5` | Historical delivery plus fixes; 21 backend / 23 mobile |
| 4 | Roof geometry | `deee18f` | `5152a0a` | 28 backend / 26 mobile; native emulator limitation |
| 5 | PV estimate | `9075a5a` | `9996bf3` | 33 backend / 27 mobile |
| 6 | Appliance twin | `9a5ce02` | `b2bd4ec` | 41 backend / 28 mobile; later ledger merge 00f80bc |
| 7 | Outage simulator | `1947379` | `934e993` | 47 backend / 29 mobile |
| 8 | Persistence forecast | `88a8613` | `41a9811` | 50 backend / 29 mobile; no observed holdout |
| 9 | Constraint scheduler | `17ac645` | `b19bad0` | 55 backend / 29 mobile |
| 10 | Resilience heuristic | `4c2813e` | `edcab58` | 59 backend / 29 mobile |
| 11 | Plan approval | `6d92317` | `3e896d0` | 64 backend / 29 mobile |
| 12 | Saved-run replay | `e91d6ac` | `5e2d8b0` | 2D complete; native AR deferred, not complete; 31 mobile |
| 13 | Durable n8n | `18c0c11` | `263c8c1` | 65 backend / 31 mobile; real execution and restart evidence |
| 14 | Synthetic telemetry | `43f46f4` | `e96fd6d` | 71 backend / 31 mobile; detector-to-n8n evidence |
| 15 | Integration audit | `ea0344a` | `1710053` | 74 backend / 34 mobile; numerical fixture, web interaction, source encoding |
| 16 | MCP tools | `8cba51c` | `314f8c8` | 77 backend / 34 mobile; all nine actual stdio tools and mobile gateway |
| 17 | Source/API/Expo RC handoff | `a7c752e` + final handoff commit | See final Git merge | Fresh clone/environments/isolated database; native package and AR expressly deferred. See PHASE_17_REVIEW.md. |

Phase 17 validates source candidate `a7c752e` (based on main `314f8c83c6030060c814d7f7157e33d3688e67bc`), with only final documentation/evidence added afterward. Its own delivery/merge hashes are available in `git log --oneline main` and the final delivery report; a commit cannot include its own hash.
