# Gameplay Frontend Fix Plan: Task 4 Participant Handoff

## Entry: 2026-06-01 Task 4

**Track:**
- Plan file: `docs/plans/2026-06-01-gameplay-frontend-fix-plan.md`
- Task: `Task 4: Preserve and display authoritative participant state across waiting-room to gameplay transition`
- Dependencies reviewed:
  - `docs/plans/2026-06-01-gameplay-frontend-fix-plan.md`
  - `docs/implementation-logs/gameplay-frontend-2026-06-01-task-3-bootstrap-and-editor-state.md`
  - `src/features/realtime/realtimeEventReducers.ts`
  - `src/features/room-waiting/roomWaitingState.ts`
  - `src/pages/RoomPage/index.tsx`
  - `src/pages/RoomPage/roomPageViewModel.ts`
  - `tests/app/realtimeEventReducers.test.mjs`
  - `tests/app/roomWaitingState.test.mjs`

**What was done:**
- Added a small reducer-level helper in `src/features/realtime/realtimeEventReducers.ts` that resolves gameplay participant state for the active room by comparing:
  - `state.realtime.participants`
  - `state.room.roomWaitingState.participants`
- The helper now prefers the waiting-room participant snapshot only when it clearly has broader coverage than realtime state for the same room. This preserves the backend-driven realtime state as the default source while avoiding a regression where gameplay collapses to the owner only.
- Updated `applyGameStarted()` so the gameplay handoff writes the resolved participant list back into `realtime.participants` before `RoomPage` renders. This keeps the gameplay route store shape unchanged while fixing the state loss during route transition.
- Updated the room metadata merge path in both `applyGameStarted()`, `applyGameStateUpdated()`, and `applyMissionResult()` to use the same resolved gameplay participant set when computing joined counts and room state. This prevents stale single-user participant state from distorting room metadata after gameplay starts.
- Added a focused regression test that reproduces the failing handoff shape:
  - waiting-room state already has owner + participant + invited user
  - realtime participant state only has owner
  - `game-started` now preserves the broader waiting-room list in gameplay state

**Why it matters for the next worker:**
- `RoomPage` can keep reading `state.realtime.participants` without adding page-level fallback logic.
- Task 5 can work on turn editability and evaluation flow without also debugging participant disappearance during `/main` -> `/rooms/:id/play`.
- The participant list remains consistent until a newer backend `room-participants-updated` event arrives, which stays the authoritative sync event after gameplay begins.

**Dependency impact:**
- Completes Task 4 in `docs/plans/2026-06-01-gameplay-frontend-fix-plan.md`.
- Leaves `room-participants-updated` as the long-term authoritative event instead of replacing it with a permanent waiting-room fallback model.
- Keeps membership-status compatibility intact because the preserved snapshot still carries `INVITED`, `JOINED`, `LEFT`, and `DENIED` rows unchanged.

**Files touched:**
- `src/features/realtime/realtimeEventReducers.ts`
- `tests/app/realtimeEventReducers.test.mjs`
- `docs/plans/2026-06-01-gameplay-frontend-fix-plan.md`
- `docs/implementation-logs/gameplay-frontend-2026-06-01-task-4-participant-handoff.md`

**Commit:**
- Not created in this session

**Verification completed:**
- [x] Tests pass: `node --experimental-strip-types --import ./tests/helpers/registerResolveTsLoader.mjs --test tests/app/roomWaitingState.test.mjs tests/app/realtimeEventReducers.test.mjs`
- [x] Type check passes: `node ./node_modules/typescript/bin/tsc -p tsconfig.app.json`
- [x] Manual source review confirmed `RoomPage` still derives participant rendering, owner labeling, and current-turn highlighting from store state only

**Not verified:**
- [ ] Live multiplayer browser QA against a running backend
- [ ] Backend timing edge cases where a stale waiting-room snapshot might outlive a missed realtime participant update

**Design decisions:**
- Kept the fix at the reducer/state layer instead of introducing a separate gameplay participant selector in `RoomPage`.
- Chose a narrow fallback rule: only prefer waiting-room participants when that snapshot is clearly broader than the realtime participant list for the same room.
- Did not change `buildParticipantRows()` filtering behavior, since it already correctly hides non-`JOINED` participants from the gameplay roster while preserving them in store state.

**Deviations from spec:**
- The current backend-first track still treats `room-participants-updated` as the authoritative participant event, but this task explicitly preserves a broader pre-gameplay snapshot during handoff to cover the current transition gap.

**Trade-offs:**
- This fix improves gameplay continuity without changing page code, but it assumes the broader waiting-room snapshot is a better temporary fallback than a narrower realtime list during route transition.
- If backend participant updates are delayed for too long, gameplay can temporarily show a slightly older roster; this is still preferable to collapsing to the owner only.

**Open questions:**
- [ ] Should a later cleanup compare participant freshness more explicitly than list length, for example with timestamps or server sequence numbers?
- [ ] If the backend later guarantees a full participant snapshot before every `game-started`, should this fallback be simplified or removed?

**Instructions for the next worker:**
- Start with Task 5 in `docs/plans/2026-06-01-gameplay-frontend-fix-plan.md`.
- Assume gameplay participant state now survives the waiting-room to gameplay transition when the frontend already had a broader room snapshot.
- Keep future editability and evaluation fixes reducer-first so `RoomPage` remains declarative over shared store state.
