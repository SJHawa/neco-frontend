# Phase 3 Task 6: Hint Flow and Delta Editor Sync

## Entry: 2026-05-31 Task 6

**Track:**
- Plan file: `docs/plans/2026-05-31-spec-sync-follow-up-plan.md`
- Task: `Task 6: Implement hint flow, delta code sync, and editor synchronization`
- Dependencies reviewed:
  - `docs/implementation-logs/spec-sync-2026-05-31/phase-3-task-5-room-page-store-driven.md`
  - `docs/specs/04-api-and-auth.md`, `docs/specs/06-realtime-and-gameplay.md`, `docs/specs/07-state-and-client-data.md`

**What was done:**
- Added current-step hint API (`hintApi`) and client cache in `game.hintsByStepId` keyed by `gameRoomMissionStepId` (template fallback when step id is absent).
- Replaced hint UI placeholders on `RoomPage` with fetch-on-open, cache hit skip, and nullable `hintText` display via `formatHintDisplayText`.
- Implemented text-range delta helpers (`codeDelta.ts`) and inbound `applyCodeDeltaToEditor` for `code-updated` (working `editor.files` only; authoritative still merges optional `content`).
- Wired debounced outbound `code-change` through `useGameplayCodeSync`, `codeChangeEmitScheduler`, and `roomSocketLifecycle.emit`.
- Introduced per-file debounce coalescing: flush recomputes delta from debounce-window `anchorText` → `currentText` so rapid same-file input (`"" → "a" → "ab"`) is not reduced to the last partial delta.
- Introduced schedule-time emit snapshots (`codeChangeFlushPolicy`) so pending edits scheduled while emit-eligible still flush after `canEmit` or connection status changes before debounce expiry.
- Stabilized scheduler lifecycle: hook creates scheduler once per mount; `emitContextRef` supplies latest emit policy without disposing pending edits on dependency churn.
- `dispose()` on scheduler flush-all prevents unmount loss of pending eligible edits.
- Incorporated human review feedback across three rounds (hint null cache hit, per-file pending, same-file coalescing, emit snapshot on state transition).

**Why it matters for the next worker:**
- Task 7 should wire `turn-submit`, `turn-evaluated`, `turn-changed`, and `mission-result` without reintroducing full-file realtime sync or breaking turn baseline / authoritative merge rules from Task 5–6.
- Outbound code sync must continue to use `codeDelta` via `emitCodeChangeEvent`; do not bypass `codeChangeFlushPolicy` when adding turn-submit locks.
- Hint cache keys must keep treating `hintText: null` as a valid cached `HintResponse`, not a miss.
- Inbound `code-updated` still suppresses echo only when `sessionId` matches `realtime.socketId`; delta applies to `editor.files` only.

**Dependency impact:**
- Satisfies Task 6 acceptance criteria for nullable hint contract, delta `code-change` / `code-updated`, and existing `canEditGameplay` / readonly tab rules on `RoomPage`.
- Unblocks Task 7 (turn progression, evaluation UI, result routing) on a shared editor + hint state contract.

**Files touched:**
- `src/features/hint/hintApi.ts`
- `src/features/hint/hintCache.ts`
- `src/features/editor/codeDelta.ts`
- `src/features/editor/editorCodeDeltaSync.ts`
- `src/features/editor/codeChangeEmitScheduler.ts`
- `src/features/editor/codeChangeFlushPolicy.ts`
- `src/features/editor/useGameplayCodeSync.ts`
- `src/features/realtime/emitGameplayRealtimeEvent.ts`
- `src/features/realtime/realtimeEventReducers.ts`
- `src/features/realtime/roomSocketLifecycle.ts`
- `src/pages/RoomPage/index.tsx`
- `src/shared/types/clientState.ts`
- `src/app/store/clientState.ts`
- `tests/app/hintCache.test.mjs`
- `tests/app/codeDelta.test.mjs`
- `tests/app/editorCodeDeltaSync.test.mjs`
- `tests/app/codeChangeEmitScheduler.test.mjs`
- `tests/app/codeChangeFlushPolicy.test.mjs`
- `tests/app/roomRealtimeAuthoritativeSync.test.mjs`

**Commit:**
- `355472d`

**Verification completed:**
- [x] `node --experimental-strip-types --import ./tests/helpers/registerResolveTsLoader.mjs --test tests/app/codeDelta.test.mjs tests/app/editorCodeDeltaSync.test.mjs tests/app/hintCache.test.mjs tests/app/codeChangeEmitScheduler.test.mjs tests/app/codeChangeFlushPolicy.test.mjs tests/app/roomRealtimeAuthoritativeSync.test.mjs tests/app/realtimeEventReducers.test.mjs tests/app/roomSocketLifecycle.test.mjs`
- [x] `npx tsc -p tsconfig.app.json`
- [x] Manual contract review against `docs/specs/04-api-and-auth.md`, `docs/specs/06-realtime-and-gameplay.md`, `docs/specs/07-state-and-client-data.md`
- [x] Human review feedback incorporated (3 rounds, no remaining blockers)

**Not verified:**
- [ ] `npm run build` — fails on pre-existing `vite.config.ts` (`process` types, `lib` target for `startsWith`); unchanged from prior tasks
- [ ] End-to-end manual QA against a live backend

**Design decisions:**
- `getCachedHint` / `shouldRefetchHintOnOpen` use `hasOwnProperty` on `hintsByStepId` so `hintText: null` remains a cache hit.
- Same-file debounce keeps the first `anchorText` in a window and updates `currentText`; flush uses `buildTextRangeDelta(anchor, current)`.
- `wasEligibleAtSchedule` + `emitSnapshot` capture emit context at schedule time; flush prefers snapshot over current `canEmit` / `connectionStatus` so turn-end or modal transitions do not drop last eligible keystrokes.
- Scheduler is not recreated when `canEmit` changes; only unmount `dispose()` tears down pending timers (after flush-all).
- Never-eligible pending edits (scheduled while disconnected or read-only) are dropped on flush when no snapshot exists.

**Deviations from spec:**
- `occurredAt` on outbound `code-change` uses `Date.toISOString()` rather than explicit KST offset formatting; server accepts ISO timestamps per existing client patterns.
- Turn submit, evaluation panels, team chat, and `turn-changed` editor transitions remain for Task 7.

**Trade-offs:**
- Emit after connection close still attempts `code-change` with schedule-time snapshot if the socket controller is gone the emit is a no-op; acceptable for v1 versus queuing offline deltas.
- Rapid cross-file edits within 200ms emit separate events per file (intentional; server handles per-path buffers).

**Open questions:**
- [x] Should `hintText: null` skip cache? → No; store full `HintResponse` and treat as hit (review resolved).
- [x] Should same-file debounce keep only the last partial delta? → No; re-diff anchor→current on flush (review resolved).
- [x] Should scheduler recreate on `canEmit` change? → No; snapshot + stable scheduler (review resolved).
- [ ] Should self-originated `content` snapshots use a separate server event? → Deferred from Task 5; unchanged.

**Instructions for the next worker:**
- Read this entry, then start **Task 7** in `docs/plans/2026-05-31-spec-sync-follow-up-plan.md`.
- Wire `turn-submit` to emit reflected snapshot payload and lock editing until `turn-evaluated` / `turn-changed`.
- Extend realtime reducers for `turn-evaluated`, `turn-changed`, `mission-result` without resetting `turnBaselineFiles` after baseline seeding.
- Reuse `roomPageViewModel` editability; do not bypass `codeChangeFlushPolicy` when locking the editor after submit.
