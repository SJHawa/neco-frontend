# Phase 2 Task 4: Realtime Event Reducers

## Entry: 2026-05-31 Task 4

**Track:**
- Plan file: `docs/plans/2026-05-31-spec-sync-follow-up-plan.md`
- Task: `Task 4: Add realtime event reducers for waiting-room sync and gameplay entry`
- Dependencies reviewed:
  - `docs/implementation-logs/spec-sync-2026-05-31/phase-2-task-3-socket-close-policy.md`
  - `docs/specs/06-realtime-and-gameplay.md`, `docs/specs/07-state-and-client-data.md`

**What was done:**
- Added pure reducers in `realtimeEventReducers.ts` for `room-participants-updated`, `game-started`, and `game-state-updated`, bound via `roomRealtimeEvents.ts` on store-backed socket connect.
- `game-started` bootstraps `game`, `editor` file tabs (empty buffers), and `showMissionGuideModal`; routes to `/rooms/:gameRoomId/play` only when `uiHints.enterGameScreen` is true (`useRealtimeGameEntry` + `realtimeNavigation.ts`).
- Extended `/main` with `useRoomSocketLifecycle`, `shouldRetainRoomSocketForPath` (`/main` → `/play` transition keeps socket), and realtime-first waiting-room hydration (`realtimeSnapshot` in `buildRoomWaitingState`).
- Added MainPage room-context helpers so stale HTTP responses do not tear down authoritative realtime state: `resolveCurrentRoomAfterHttpHydration`, `resolveMainPageWaitingRoomCurrentRoom`, `resolveMainPageDisplayCurrentRoom`, `resolveMainPageVisibleInvitations`.
- Incorporated review feedback (3 rounds): HTTP `WAITING` overwrite guard; `showMissionGuideModal` client state; editor bootstrap clears prior buffers; empty HTTP `currentRoom` no longer clears store/socket; user-visible view model (`MainReadyState`, AI chat, invitations) uses `mainPageDisplayCurrentRoom`.

**Why it matters for the next worker:**
- Task 5 should read gameplay data from `game.gameState`, `game.missionState`, `realtime.participants`, and `editor` — not RoomPage mocks.
- `game.showMissionGuideModal` is set at `game-started` time; Task 5 can wire the mission guide UI without re-parsing past events.
- `/main` treats realtime as authoritative when `activeRoomId` matches store room; do not reintroduce HTTP-only current-room or polling paths that regress `IN_PROGRESS` back to `WAITING` or show empty-room UX during transient query gaps.
- Gameplay entry remains `game-started` + `enterGameScreen` only; HTTP start success is still not a route gate.

**Dependency impact:**
- Satisfies Phase 2 Task 4 acceptance criteria for the three inbound waiting/gameplay sync events.
- Unblocks Task 5 (store-driven RoomPage) and Task 6–7 (editor, turn, result events) on a shared realtime state contract.

**Files touched:**
- `src/features/realtime/realtimeEventReducers.ts`
- `src/features/realtime/realtimeNavigation.ts`
- `src/features/realtime/roomRealtimeEvents.ts`
- `src/features/realtime/useRealtimeGameEntry.ts`
- `src/features/realtime/roomSocketLifecycle.ts`
- `src/features/realtime/useRoomSocketLifecycle.ts`
- `src/features/room-waiting/roomWaitingState.ts`
- `src/pages/MainPage/mainInitialization.ts`
- `src/pages/MainPage/index.tsx`
- `src/app/router/AppRouter.tsx`
- `src/shared/types/clientState.ts`
- `src/app/store/clientState.ts`
- `tests/app/realtimeEventReducers.test.mjs`
- `tests/app/roomSocketLifecycle.test.mjs`
- `tests/app/mainInitialization.test.mjs`
- `tests/app/roomWaitingState.test.mjs`

**Commit:**
- `95c926b`

**Verification completed:**
- [x] `node --experimental-strip-types --import ./tests/helpers/registerResolveTsLoader.mjs --test tests/app/realtimeEventReducers.test.mjs tests/app/roomSocketLifecycle.test.mjs tests/app/mainInitialization.test.mjs tests/app/roomWaitingState.test.mjs` (66 passed)
- [x] `npx tsc -p tsconfig.app.json`
- [x] Manual contract review against `docs/specs/06-realtime-and-gameplay.md`
- [x] Human review feedback incorporated (3 rounds, no remaining blockers)

**Not verified:**
- [ ] `npm run build` — fails on pre-existing `vite.config.ts` Node/`lib` typing (`process`, `startsWith`), unrelated to Task 4 source
- [ ] End-to-end manual QA against a live backend

**Design decisions:**
- Navigation on `game-started` uses a module-level navigate handler registered in `AppLayout` so socket bindings stay framework-light and testable.
- `bootstrapEditorFromMission` initializes tab paths with empty content so a new mission never reuses prior session buffers; file content loading stays deferred to Task 6.
- Stale-empty HTTP guard preserves store `currentRoom` when `activeRoomId` matches and `game.gameState` or a valid main-page room context exists; display/invitation/AI-chat view models use the same resolved room as socket lifecycle.

**Deviations from spec:**
- `RoomPage` UI remains the static shell; Task 5 owns rendering from store. Event reducers and routing gate are in place.

**Trade-offs:**
- Participants polling on `/main` still runs for membership deltas but merges through `realtimeSnapshot` instead of replacing authoritative game/mission state.
- `showMissionGuideModal` is stored but not yet rendered; avoids losing the event-time hint before Task 5 UI work.

**Open questions:**
- [x] Should HTTP `WAITING` polling overwrite realtime `IN_PROGRESS`? → No; use `realtimeSnapshot` and preserve helpers (review resolved).
- [x] Should stale HTTP `currentRoom: null` clear active socket? → No; preserve store room and derived waiting/display context (review resolved).
- [x] Should empty HTTP room show invitations/empty prompt while realtime room exists? → No; use `mainPageDisplayCurrentRoom` (review resolved).

**Instructions for the next worker:**
- Read this entry, then start **Task 5** in `docs/plans/2026-05-31-spec-sync-follow-up-plan.md`.
- Build RoomPage from `game`, `editor`, `realtime.participants`; wire mission guide modal from `game.showMissionGuideModal`.
- Add `code-updated`, `turn-evaluated`, `turn-changed`, `mission-result` in Tasks 6–7 without breaking MainPage realtime-first hydration or `game-started` route gating.
