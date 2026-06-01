# Gameplay Frontend Fix Plan: Task 5 Turn Progression And Editability

## Entry: 2026-06-01 Task 5

**Track:**
- Plan file: `docs/plans/2026-06-01-gameplay-frontend-fix-plan.md`
- Task: `Task 5: Restore turn-based editability and evaluation-driven gameplay progression`
- Dependencies reviewed:
  - `docs/specs/06-realtime-and-gameplay.md`
  - `docs/plans/2026-06-01-gameplay-frontend-fix-plan.md`
  - `docs/implementation-logs/gameplay-frontend-2026-06-01-task-4-participant-handoff.md`
  - `src/features/realtime/realtimeEventReducers.ts`
  - `src/features/realtime/roomRealtimeEvents.ts`
  - `src/pages/RoomPage/index.tsx`
  - `src/pages/RoomPage/roomPageViewModel.ts`
  - `tests/app/turnProgression.test.mjs`
  - `tests/app/gameTurn.test.mjs`
  - `tests/app/realtimeEventReducers.test.mjs`
  - `/Users/imhyeon/Documents/GitHub/backend/src/modules/realtime/service/realtime.interfaces.ts`
  - `/Users/imhyeon/Documents/GitHub/backend/src/modules/realtime/service/realtime-event-support.service.ts`

**What was done:**
- Updated `applyTurnEvaluated()` in `src/features/realtime/realtimeEventReducers.ts` so the active `gameState.turnState.status` now reflects `event.evaluatedTurn.status` when the evaluated turn matches the current turn.
- This means the gameplay editability rule now stays aligned with the authoritative runtime turn lifecycle more directly:
  - the submitter becomes non-editable once the backend reports `SUBMITTED` or `TIMEOUT`
  - `turnSubmissionPending` still remains `true` until `turn-changed`, preserving the existing submit-lock UX and sequencing
- Added a new turn-state normalization path for backend-first `turn-changed` payloads that do not include a full `turnState` object.
  - If the backend sends `currentTurnId`, `currentTurnUserId`, and `occurredAt`, the frontend now reconstructs a minimal next-turn `turnState`
  - the synthesized turn state reuses the known turn time limit, increments `turnNumber`, resets status to `IN_PROGRESS`, and derives a new deadline from `occurredAt`
- Relaxed `bindRoomRealtimeEvents()` so `turn-changed` is no longer dropped when `turnState` is absent but `currentTurnId` is present.
- Preserved the existing turn transition invariants:
  - `turn-evaluated` stores evaluation feedback and markers
  - `turn-evaluated` does not clear `turnSubmissionPending`
  - `turn-changed` clears `turnSubmissionPending`
  - `turn-changed` clears previous evaluation markers
  - `turn-changed` resets the editor baseline to the new authoritative turn snapshot path

**Why it matters for the next worker:**
- Gameplay editability no longer depends on the backend always embedding a complete `turnState` inside `turn-changed`.
- The next current player can become editable from the backend-first turn transition event that already exists today.
- Task 6 can keep `RoomPage` mostly declarative because the turn progression state is now normalized before it reaches the page layer.

**Dependency impact:**
- Completes Task 5 in `docs/plans/2026-06-01-gameplay-frontend-fix-plan.md`.
- Unblocks Task 6 by making mission/evaluation/participant rendering less sensitive to turn transition payload gaps.
- Keeps the gameplay state machine reducer-first rather than introducing page-level recovery logic.

**Files touched:**
- `src/features/realtime/realtimeEventReducers.ts`
- `src/features/realtime/roomRealtimeEvents.ts`
- `tests/app/turnProgression.test.mjs`
- `docs/plans/2026-06-01-gameplay-frontend-fix-plan.md`
- `docs/implementation-logs/gameplay-frontend-2026-06-01-task-5-turn-progression-and-editability.md`

**Commit:**
- Not created in this session

**Verification completed:**
- [x] Tests pass: `node --experimental-strip-types --import ./tests/helpers/registerResolveTsLoader.mjs --test tests/app/turnProgression.test.mjs tests/app/gameTurn.test.mjs tests/app/realtimeEventReducers.test.mjs`
- [x] Type check passes: `node ./node_modules/typescript/bin/tsc -p tsconfig.app.json`
- [x] Manual source review confirmed RoomPage still derives read-only state from current-turn ownership, turn status, timeout, mission-guide modal state, realtime availability, and submission pending state

**Not verified:**
- [ ] Live multiplayer browser QA against the running backend
- [ ] Whether backend runtime always includes `occurredAt` on `turn-changed` in every deployment environment

**Design decisions:**
- Kept `turnSubmissionPending` as a separate UX lock instead of removing it, because submit-to-turn-change is still a distinct product state even after `turnState.status` becomes `SUBMITTED`.
- Normalized backend-first `turn-changed` payloads in the reducer rather than forcing `roomRealtimeEvents` or `RoomPage` to understand multiple event shapes.
- Chose to synthesize `deadlineAt` from `occurredAt + timeLimitSeconds` so the timer can restart immediately even when the backend omits a full `turnState`.

**Deviations from spec:**
- `docs/specs/06-realtime-and-gameplay.md` still describes `turn-changed` primarily in terms of a full gameplay state transition, but the current backend-first runtime may emit only `currentTurnId/currentTurnUserId`. This task intentionally normalized that runtime shape rather than rejecting it.

**Trade-offs:**
- The synthesized next-turn timer is only as accurate as the received `occurredAt` timestamp and the locally known turn time limit.
- If the backend later emits a richer `turnState`, the reducer still prefers that full payload over the synthesized fallback.

**Open questions:**
- [ ] Should a later cleanup also normalize partial `game-state-updated.turnState` payloads if similar backend drift exists there?
- [ ] If backend `turn-changed` eventually always includes a full `turnState`, do we want to keep this fallback for resilience or remove it to narrow the contract?

**Instructions for the next worker:**
- Start with Task 6 in `docs/plans/2026-06-01-gameplay-frontend-fix-plan.md`.
- Assume turn progression now supports both:
  - full `turnState` payloads
  - backend-first `currentTurnId/currentTurnUserId` payloads with `occurredAt`
- Do not move turn recovery logic into `RoomPage`; keep page cleanup focused on presentation over the normalized shared store.
