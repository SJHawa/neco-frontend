# Phase 3 Task 5: Store-Driven RoomPage

## Entry: 2026-05-31 Task 5

**Track:**
- Plan file: `docs/plans/2026-05-31-spec-sync-follow-up-plan.md`
- Task: `Task 5: Replace the static RoomPage shell with store-driven gameplay state`
- Dependencies reviewed:
  - `docs/implementation-logs/spec-sync-2026-05-31/phase-2-task-4-realtime-event-reducers.md`
  - `docs/specs/06-realtime-and-gameplay.md`, `docs/specs/07-state-and-client-data.md`

**What was done:**
- Rebuilt `RoomPage` to read mission, turn timer, strike hearts, participants, file tabs, and editor buffers from `game`, `editor`, and `realtime` store slices instead of hardcoded fixtures.
- Added `roomPageViewModel.ts` for pure UI derivation (file tabs, editability, readonly guards, participant rows, timer formatting).
- Wired mission guide modal from `game.showMissionGuideModal` with countdown dismiss writing back to the store.
- Preserved terminated-session banner and `/main` navigation via existing `roomSocketLifecycle` helpers.
- Introduced authoritative editor state: `authoritativeFiles`, per-turn `turnBaselineFiles` / `turnBaselineReady`, reset via `applyEditorFileReset`.
- Turn changes snapshot baseline from `authoritativeFiles` only; `convergeWorkingFilesToAuthoritative` clears prior-turn dirty local buffers on `onEditorTurnIdChanged`.
- Connected runtime `code-updated` in `roomRealtimeEvents.ts` → `applyCodeUpdated` → `applyAuthoritativeEditorFiles` when optional `content` is present.
- Echo suppression uses `sessionId === realtime.socketId` only (not `userId`); missing `sessionId` is accepted for legacy servers.
- Aligned `CodeUpdatedEvent` and `docs/specs/06-realtime-and-gameplay.md` / `docs/etc/api-spec.md` §12.5 on optional `sessionId`, optional `content`, and delta vs authoritative roles.
- Incorporated human review feedback across five rounds (readonly tabs, baseline source, runtime wiring, same-client semantics, optional `sessionId`).

**Why it matters for the next worker:**
- Task 6 should extend `code-updated` delta handling without breaking authoritative baseline semantics or reintroducing userId-based echo skips.
- Editor local edits update `editor.files` only; authoritative merges must continue through `applyAuthoritativeEditorFiles` / future delta appliers.
- Reset on RoomPage restores `turnBaselineFiles` for the active turn, not empty strings or dirty local-only buffers.
- Hint UI, turn submit, `turn-evaluated`, and `turn-changed` should plug into the existing store slices; do not restore RoomPage mocks.

**Dependency impact:**
- Satisfies Task 5 acceptance criteria for store-driven mission/turn/participant/file-tab rendering and intact terminated-session UX.
- Unblocks Task 6 (delta editor sync, hints) and Task 7 (turn/result routing) on a shared editor + gameplay state contract.

**Files touched:**
- `src/pages/RoomPage/index.tsx`
- `src/pages/RoomPage/roomPageViewModel.ts`
- `src/features/editor/editorTurnBaseline.ts`
- `src/features/editor/authoritativeEditorSync.ts`
- `src/features/realtime/realtimeEventReducers.ts`
- `src/features/realtime/roomRealtimeEvents.ts`
- `src/shared/types/domain.ts`
- `src/shared/types/clientState.ts`
- `src/app/store/clientState.ts`
- `docs/specs/06-realtime-and-gameplay.md`
- `docs/etc/api-spec.md`
- `tests/app/roomPageViewModel.test.mjs`
- `tests/app/editorTurnBaseline.test.mjs`
- `tests/app/roomRealtimeAuthoritativeSync.test.mjs`
- `tests/app/realtimeEventReducers.test.mjs`

**Commit:**
- `fca6802`

**Verification completed:**
- [x] `node --experimental-strip-types --import ./tests/helpers/registerResolveTsLoader.mjs --test tests/app/roomPageViewModel.test.mjs tests/app/editorTurnBaseline.test.mjs tests/app/roomRealtimeAuthoritativeSync.test.mjs tests/app/realtimeEventReducers.test.mjs tests/app/roomSocketLifecycle.test.mjs`
- [x] `npx tsc -p tsconfig.app.json`
- [x] Manual contract review against `docs/specs/06-realtime-and-gameplay.md`
- [x] Human review feedback incorporated (5 rounds, no remaining blockers)

**Not verified:**
- [ ] `npm run build` — not run; prior tasks report pre-existing `vite.config.ts` Node/`lib` typing issues
- [ ] End-to-end manual QA against a live backend

**Design decisions:**
- `canMutateMissionFile` / `isEditorContentReadOnly` enforce `projectStructure.files[].readonly` even during the player's turn.
- Turn baseline seeds on first authoritative `content` for a turn (`turnBaselineReady`); mid-turn authoritative updates do not move baseline after seeding.
- `game-started` does not pin baseline to empty bootstrapped buffers; baseline waits for authoritative `content` or turn-boundary snapshot.
- `code-updated` without `content` is a no-op for authoritative state until Task 6 applies deltas to the editor.

**Deviations from spec:**
- Turn submit, hint fetch, AI evaluation panels, and team chat remain UI placeholders; Tasks 6–7 own behavior.
- Delta-only `code-updated` editor patching is intentionally deferred to Task 6.

**Trade-offs:**
- Legacy servers without `sessionId` cannot suppress same-client echoes on delta events; full `content` events still apply when sent.
- Authoritative content depends on server sending optional `content` until delta + snapshot paths exist in Task 6.

**Open questions:**
- [x] Should baseline capture local `editor.files` on turn change? → No; authoritative snapshot only (review resolved).
- [x] Should `userId` match suppress `code-updated`? → No; `sessionId` vs `socketId` only (review resolved).
- [x] Should missing `sessionId` drop inbound events? → No; optional field for legacy compatibility (review resolved).
- [ ] Should self-originated `content` snapshots use a separate server event? → Deferred; current contract uses optional `content` on `code-updated`.

**Instructions for the next worker:**
- Read this entry, then start **Task 6** in `docs/plans/2026-05-31-spec-sync-follow-up-plan.md`.
- Implement delta `code-updated` / outbound `code-change` without overwriting `turnBaselineFiles` after seeding.
- Route hint API results through store; keep readonly and turn-editability rules from `roomPageViewModel.ts`.
- Preserve `onEditorTurnIdChanged` dirty-buffer clearing when extending turn transitions (`turn-changed` reducer).
