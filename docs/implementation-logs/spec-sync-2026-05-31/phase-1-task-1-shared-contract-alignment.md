# Phase 1 Task 1: Shared Contract Alignment

## Entry: 2026-05-31 Task 1

**Track:**
- Plan file: `docs/plans/2026-05-31-spec-sync-follow-up-plan.md`
- Task: `Task 1: Align shared domain and client-state types with the reflected spec`
- Dependencies reviewed:
  - `docs/implementation-logs/spec-sync-2026-05-31/shared-api-spec-reflection.md`
  - `docs/specs/02-domain-model.md`, `docs/specs/06-realtime-and-gameplay.md`, `docs/specs/07-state-and-client-data.md`

**What was done:**
- Updated `src/shared/types/domain.ts` to match the reflected contract: `CurrentGameRoom` (difficulty, time limits, strikes; no `title`), `GameRoomParticipant` (`membershipStatus`; no `gameRoomTitle`), `AiChatCommandResult` (no `title`), expanded `MissionState` / `GameState`, nullable `HintResponse`, and delta-based realtime event types (`CodeChangeEvent`, `CodeUpdatedEvent`, `RoomParticipantsUpdatedEvent`, `GameStartedEvent`, turn/result events, etc.).
- Replaced `realtime.terminatedReason` with `closeCode` and `closeReasonCode` in `clientState.ts`, the Zustand initial state, and `roomSocketLifecycle.ts` (including `parseSocketDisconnectClose` / `formatRealtimeCloseMessage`).
- Applied minimal compile-safe adapter and UI touch-ups so the type cleanup lands: `gameRoomApi`, `invitationApi`, `roomWaitingApi`, `roomWaitingState`, `invitationFlow`, `MainPage`, `RoomPage`, and `mockMode`.
- Incorporated review feedback: terminated-session guard uses `closeCode || closeReasonCode`; waiting-room `gameState` / `missionState` reuse only when `gameRoomId` matches; removed inviter nickname inference and switched invitation copy to neutral wording.

**Why it matters for the next worker:**
- Task 2+ should treat `docs/specs/*` and `domain.ts` as the source of truth for field names (`membershipStatus`, room metadata, delta sync).
- Realtime close metadata is structured; Task 3 can implement `4401` / `4403` / `4404` policy on top of `closeCode` / `closeReasonCode` without reintroducing a free-form termination string.
- `RoomWaitingState` now carries `gameState` and `missionState`; do not re-derive them from stale HTTP-only shapes when realtime payloads arrive in Task 4.
- Do not infer invitation inviter identity from `GameRoomParticipant.nickname`; the API row is the invitee’s participant record.

**Dependency impact:**
- Satisfies the Phase 1 prerequisite for Task 2 (main-page adapters) and Task 3 (close-code lifecycle behavior).
- Downstream gameplay work should consume `MissionState.projectStructure` and delta event types already declared in `domain.ts`.

**Files touched:**
- `src/shared/types/domain.ts`
- `src/shared/types/clientState.ts`
- `src/app/store/clientState.ts`
- `src/features/realtime/roomSocketLifecycle.ts`
- `src/features/game-room/gameRoomApi.ts`
- `src/features/invitation/invitationApi.ts`
- `src/features/invitation/invitationFlow.ts`
- `src/features/room-waiting/roomWaitingApi.ts`
- `src/features/room-waiting/roomWaitingState.ts`
- `src/pages/MainPage/index.tsx`
- `src/pages/MainPage/mockMode.ts`
- `src/pages/RoomPage/index.tsx`
- `tests/app/roomSocketLifecycle.test.mjs`
- `tests/app/mainInitialization.test.mjs`
- `tests/app/roomWaitingState.test.mjs`
- `tests/app/invitationFlow.test.mjs`
- `tests/app/aiChatInitialization.test.mjs`
- `tests/app/roomCreateFlow.test.mjs`
- `tests/app/mainPageMockMode.test.mjs`

**Commit:**
- `4bb7f59`

**Verification completed:**
- [x] `node --experimental-strip-types --import ./tests/helpers/registerResolveTsLoader.mjs --test tests/shared/*.test.mjs tests/app/roomSocketLifecycle.test.mjs tests/app/mainInitialization.test.mjs tests/app/roomWaitingState.test.mjs tests/app/invitationFlow.test.mjs` (57 passed)
- [x] `npx tsc -p tsconfig.app.json`
- [x] Manual contract review against `docs/specs/02-domain-model.md`, `docs/specs/06-realtime-and-gameplay.md`, `docs/specs/07-state-and-client-data.md`

**Not verified:**
- [ ] `npm run build` — fails on pre-existing `vite.config.ts` Node/`lib` typing (`process`, `startsWith`), unrelated to Task 1 source changes
- [ ] End-to-end manual QA against a live backend

**Design decisions:**
- Terminated socket sessions are blocked from reconnect when either `closeCode` or `closeReasonCode` is set, so numeric-only application closes (`"4401"`, `1000`) are not lost when `closeReasonCode` is null.
- Waiting-room `gameState` / `missionState` follow the same `gameRoomId` guard as `changedParticipant` to prevent cross-room leakage during `/main` room switches.
- Invitation UX uses neutral copy because `GET /game-room-participants?membershipStatus=INVITED` does not expose a dedicated inviter field and `nickname` may refer to the invitee.

**Deviations from spec:**
- None intentional. Minimal adapter/UI edits beyond the “likely touched” list were required so the shared-type removal compiles and tests pass.

**Trade-offs:**
- Task 1 included light adapter changes (not only types) to keep the branch buildable and testable; Task 2 still owns deeper `/main` initialization rules such as explicit `IN_PROGRESS` re-entry policy.

**Open questions:**
- [ ] Should `/main` auto-enter gameplay for `IN_PROGRESS` rooms, or always require explicit navigation to `/rooms/:gameRoomId/play`? (Plan open question — defer to Task 2 / product decision.)
- [x] How to show invitations without an inviter nickname? → Neutral card copy and no `pickInvitationInviterNickname` override.

**Instructions for the next worker:**
- Read this entry, then start **Task 2** in `docs/plans/2026-05-31-spec-sync-follow-up-plan.md`.
- Preserve `membershipStatus`, room difficulty/time-limit/strike fields, and realtime close-code state; do not reintroduce `title`, `gameRoomTitle`, or `terminatedReason`.
- When extending waiting-room derivation, merge realtime `gameState` / `missionState` from events (Task 4) instead of resetting from HTTP-only guesses across room changes.
