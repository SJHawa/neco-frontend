# Raw WebSocket Migration: Task 4 Room Socket Lifecycle

## Entry: 2026-06-01 Task 4

**Track:**
- Plan file: `docs/plans/2026-06-01-raw-websocket-migration-plan.md`
- Task: `Task 4: Adapt the room socket lifecycle to raw WebSocket semantics`
- Dependencies reviewed:
  - `docs/implementation-logs/raw-websocket-2026-06-01-task-1-contract-discovery.md`
  - `docs/implementation-logs/raw-websocket-2026-06-01-task-2-adapter-boundary.md`
  - `docs/implementation-logs/raw-websocket-2026-06-01-task-3-raw-socket-client.md`
  - `docs/specs/01-architecture.md`
  - `docs/specs/08-error-loading-and-navigation.md`
  - `src/features/realtime/roomSocketLifecycle.ts`
  - `src/features/realtime/useRoomSocketLifecycle.ts`
  - `src/features/realtime/socketClosePolicy.ts`
  - `tests/app/roomSocketLifecycle.test.mjs`
  - `tests/app/socketClosePolicy.test.mjs`

**What was done:**
- Reviewed the current lifecycle/controller layer against the Task 4 acceptance criteria and confirmed the raw WebSocket migration work is already reflected in the implementation.
- Verified that `createRoomSocketLifecycleController()` now drives the raw adapter through synthetic `connect`, `disconnect`, and `connect_error` events and emits `join-room` only after the raw socket reaches the connected state.
- Verified that lifecycle state continues to publish `activeRoomId`, `connectionStatus`, `closeCode`, and `closeReasonCode`, with close parsing handled by `parseSocketDisconnectClose()`.
- Verified that the existing close-policy model is preserved for `4401`, `4403`, `4404`, and `1000` through `resolveSocketClosePolicyAction()` and terminated-session latching behavior.
- Updated the Task 4 checklist and the Phase 2 checkpoint in the migration plan to reflect the completed implementation and verification state.

**Why it matters for the next worker:**
- Task 5 can assume the room lifecycle already sends `join-room` at the correct raw WebSocket timing and that lifecycle state remains compatible with the existing store and close-policy consumers.
- Reconnect behavior is intentionally split: transport-only disconnects can create a new socket on the next sync, while application close codes latch the closed state and block silent reconnect.
- `socket.id` remains optional compatibility metadata. Task 5 should not treat it as a server-issued session identity.

**Dependency impact:**
- Satisfies Task 4 of `docs/plans/2026-06-01-raw-websocket-migration-plan.md`.
- Unblocks Task 5 by confirming that the remaining risk is now live event-flow verification against the backend, not lifecycle/controller transport semantics.

**Files touched:**
- `docs/plans/2026-06-01-raw-websocket-migration-plan.md`
- `docs/implementation-logs/raw-websocket-2026-06-01-task-4-room-socket-lifecycle.md`

**Commit:**
- Not created in this session

**Verification completed:**
- [x] Manual contract review against `docs/specs/01-architecture.md` and `docs/specs/08-error-loading-and-navigation.md`
- [x] `node --experimental-strip-types --import ./tests/helpers/registerResolveTsLoader.mjs -e "await import('./tests/app/roomSocketLifecycle.test.mjs'); await import('./tests/app/socketClosePolicy.test.mjs');"`
- [x] `node ./node_modules/typescript/bin/tsc -p tsconfig.app.json`

**Not verified:**
- [ ] Live browser verification that `/main` joins the room and receives backend events over the migrated raw WebSocket path
- [ ] End-to-end confirmation that a real backend `game-started` event still drives gameplay entry

**Design decisions:**
- Treated Task 4 as implementation verification plus handoff capture rather than forcing redundant code churn, because the existing code already satisfied the requested lifecycle semantics.
- Kept the validation note explicit that the planned `--test` command could not run verbatim in this sandbox due `spawn EPERM`, and used a single-process import path to execute the same test files instead.

**Deviations from spec:**
- None intentional. The reviewed lifecycle and close-policy behavior still align with the current architecture and error/navigation specs.

**Trade-offs:**
- Using the single-process `node -e` path preserves meaningful test coverage in this environment, but it is a sandbox workaround rather than the exact command string documented in the plan.
- No code diff was introduced for lifecycle logic because expanding scope beyond the verified behavior would have created unnecessary churn.

**Open questions:**
- [ ] Does the live backend emit any additional disconnect patterns that should map into `parseSocketDisconnectClose()` beyond the currently tested application close codes and generic transport text?
- [ ] Should Task 5 add a browser-level assertion for the closed recovery banner copy, given the current lifecycle tests focus on state and policy rather than rendered UI?

**Instructions for the next worker:**
- Read this entry after Task 3, then proceed to Task 5 in `docs/plans/2026-06-01-raw-websocket-migration-plan.md`.
- Preserve the current lifecycle invariants:
  - `join-room` is sent only after `connect`
  - application close codes latch the session closed
  - transport-only disconnects remain eligible for a later reconnect
- Focus the next step on live backend event-flow verification and any reducer mismatches that appear once real frames reach the client.
