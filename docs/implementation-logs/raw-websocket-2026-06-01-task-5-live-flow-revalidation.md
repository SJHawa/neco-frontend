# Raw WebSocket Migration: Task 5 Live Flow Revalidation

## Entry: 2026-06-01 Task 5

**Track:**
- Plan file: `docs/plans/2026-06-01-raw-websocket-migration-plan.md`
- Task: `Task 5: Revalidate waiting-room join and gameplay-entry flows against the live backend`
- Dependencies reviewed:
  - `docs/implementation-logs/raw-websocket-2026-06-01-task-1-contract-discovery.md`
  - `docs/implementation-logs/raw-websocket-2026-06-01-task-4-room-socket-lifecycle.md`
  - `docs/manual-qa/spec-sync-reflected-contract.md`
  - `src/features/realtime/roomRealtimeEvents.ts`
  - `src/features/realtime/realtimeEventReducers.ts`
  - `tests/app/realtimeEventReducers.test.mjs`
  - `tests/app/specSyncRegression.test.mjs`
  - `.env`

**What was done:**
- Revalidated the waiting-room and gameplay-entry event flow at the reducer and event-binding layer after the raw WebSocket migration.
- Confirmed that `room-participants-updated` remains the waiting-room hydration event consumed by the frontend and still updates `room`, `game`, and `realtime.participants` in one reducer path.
- Confirmed that gameplay entry still depends on `game-started` plus `uiHints.enterGameScreen: true`, and that HTTP start success alone does not navigate the client to `/rooms/:gameRoomId/play`.
- Confirmed that `game-state-updated` continues to merge authoritative game state without acting as a route trigger.
- Updated the manual QA checklist prerequisites so future live verification uses the raw WebSocket endpoint terminology instead of stale Socket.IO wording.
- Updated the Task 5 verification checklist in the migration plan to reflect the checks that passed in this session.

**Why it matters for the next worker:**
- Task 6 can update the specs with confidence that the frontend still preserves the pre-existing product semantics while using raw WebSocket transport.
- The remaining Task 5 risk is no longer reducer-level route gating. It is the missing live backend confirmation that the browser receives the expected `room-participants-updated` and `game-started` frames end to end.
- The waiting-room flow should still treat realtime as authoritative for entering gameplay. Any future change that routes on `POST /game-rooms/{gameRoomId}/start` success alone would be a regression against the verified contract.

**Dependency impact:**
- Advances Task 5 of `docs/plans/2026-06-01-raw-websocket-migration-plan.md` by completing the automated regression and documentation handoff work.
- Leaves the live manual QA acceptance items open until a reachable backend is available.
- Unblocks Task 6 documentation work because the current frontend expectations and the remaining live-verification gap are now explicit.

**Files touched:**
- `docs/plans/2026-06-01-raw-websocket-migration-plan.md`
- `docs/manual-qa/spec-sync-reflected-contract.md`
- `docs/implementation-logs/raw-websocket-2026-06-01-task-5-live-flow-revalidation.md`

**Commit:**
- Not created in this session

**Verification completed:**
- [x] `node --experimental-strip-types --import ./tests/helpers/registerResolveTsLoader.mjs -e "await import('./tests/app/realtimeEventReducers.test.mjs'); await import('./tests/app/specSyncRegression.test.mjs');"`
- [x] `node ./node_modules/typescript/bin/tsc -p tsconfig.app.json`
- [x] Manual source review confirmed:
  - `applyRoomParticipantsUpdated()` still persists the waiting-room sync payload
  - `applyGameStarted()` only returns a gameplay navigation target when `uiHints.enterGameScreen` is true
  - `applyGameStateUpdated()` does not expose any gameplay route transition
  - `bindRoomRealtimeEvents()` routes gameplay only from `game-started`

**Not verified:**
- [ ] Live browser QA that `/main` joins a real room and receives the initial `room-participants-updated` payload
- [ ] Live browser QA that `POST /game-rooms/{gameRoomId}/start` is followed by a backend `game-started` emit that reaches the client
- [ ] Live backend mismatch detection for any frame-shape differences beyond the contract captured in Task 1

**Environment blockers:**
- `http://127.0.0.1:8080` was not reachable in this session, so the planned live backend QA could not be executed from the frontend workspace.
- The plan's direct `node --test` invocation hit sandbox `spawn EPERM`; the same test files were executed through a single-process import command instead.

**Design decisions:**
- Treated Task 5 as a verification-and-handoff step, not a speculative code-change step, because the existing reducer and event-binding logic already matched the expected gameplay-entry contract.
- Kept the documentation update local to Task 5 artifacts rather than rewriting broader transport docs early, since Task 6 is the explicit spec cleanup stage.

**Deviations from spec:**
- None intentional in frontend behavior. The remaining gap is environmental verification, not a known code/spec mismatch.

**Trade-offs:**
- The single-process test command gives meaningful regression confidence inside this sandbox, but it is a runner workaround rather than the exact command written in the plan.
- Without a reachable backend, Task 5 cannot claim full live acceptance even though the route-gating logic is covered by tests and source review.

**Open questions:**
- [ ] When the backend is reachable again, does the live waiting-room join emit only `room-participants-updated`, or is there an additional room-sync frame that the frontend should normalize?
- [ ] Does the backend emit any `game-started` variants that omit `uiHints.enterGameScreen`, requiring a defensive default in the frontend?

**Instructions for the next worker:**
- Bring up the backend referenced by `VITE_API_PROXY_TARGET` / `VITE_SOCKET_URL`, then execute the live manual QA steps in `docs/manual-qa/spec-sync-reflected-contract.md`.
- Capture at least one real `room-participants-updated` frame and one real `game-started` frame before closing Task 5.
- If the live frames differ from the normalized frontend expectations, record the mismatch in a new implementation log entry before changing reducers or specs.
