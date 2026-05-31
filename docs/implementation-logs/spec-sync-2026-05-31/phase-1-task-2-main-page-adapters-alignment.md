# Phase 1 Task 2: Main Page Adapters Alignment

## Entry: 2026-05-31 Task 2

**Track:**
- Plan file: `docs/plans/2026-05-31-spec-sync-follow-up-plan.md`
- Task: `Task 2: Align main-page adapters and waiting-room derivation to the reflected API contract`
- Dependencies reviewed:
  - `docs/implementation-logs/spec-sync-2026-05-31/phase-1-task-1-shared-contract-alignment.md`
  - `docs/specs/04-api-and-auth.md`, `docs/specs/06-realtime-and-gameplay.md`, `docs/specs/08-error-loading-and-navigation.md`

**What was done:**
- Tightened `invitationApi` and `roomWaitingApi` normalization to use reflected field names only (`membershipStatus`, `roomStatus`); removed legacy `status` membership fallbacks.
- Added `isMainPageRoomContextStatus` / `resolveMainPageRoomContextRoom` in `mainInitialization.ts` so `/main` treats `WAITING` and `IN_PROGRESS` rooms as the same room-context surface for participant hydration and `buildRoomWaitingState`.
- Updated `MainPage` to show full waiting-room metadata for `IN_PROGRESS` rooms (status card, participants) with a dedicated in-progress notice, while `JUDGING` / `ANALYZED` / `FINISHED` still use the compact `CurrentRoomSummary`.
- Incorporated review feedback: same-room `gameState` now rebuilds when `CurrentGameRoom` metadata changes (fixes `WAITING` → `IN_PROGRESS` stale `gameState.status`); `getWaitingRoomStartButtonState` hides the owner start CTA unless `status === "WAITING"`.

**Why it matters for the next worker:**
- `/main` does not auto-route to `/rooms/:gameRoomId/play` for `IN_PROGRESS` rooms; gameplay entry remains gated on `game-started` (Task 4).
- `buildRoomWaitingState` may reuse `previousState.gameState` only when the same `gameRoomId` and room metadata fields are unchanged; realtime reducers (Task 4) should merge richer fields without assuming HTTP-only snapshots stay authoritative.
- `getWaitingRoomStartButtonState` is the single gate for the “게임 시작 준비” section; do not reintroduce owner-only visibility for non-`WAITING` statuses in UI-only conditionals.

**Dependency impact:**
- Completes Phase 1 Tasks 1–2 checkpoint: shared types and `/main` adapters align with the reflected spec.
- Task 3 can focus on close-code lifecycle policy without revisiting main-page HTTP adapter shapes.

**Files touched:**
- `src/features/invitation/invitationApi.ts`
- `src/features/room-waiting/roomWaitingApi.ts`
- `src/features/room-waiting/roomWaitingState.ts`
- `src/pages/MainPage/mainInitialization.ts`
- `src/pages/MainPage/index.tsx`
- `tests/app/mainInitialization.test.mjs`
- `tests/app/roomWaitingState.test.mjs`

**Commit:**
- `517144f`

**Verification completed:**
- [x] `node --experimental-strip-types --import ./tests/helpers/registerResolveTsLoader.mjs --test tests/app/mainInitialization.test.mjs tests/app/roomWaitingState.test.mjs tests/app/invitationFlow.test.mjs` (45 passed)
- [x] `npx tsc -p tsconfig.app.json`
- [x] Manual contract review against `docs/specs/04-api-and-auth.md` and `docs/specs/06-realtime-and-gameplay.md`

**Not verified:**
- [ ] `npm run build` — same pre-existing `vite.config.ts` typing issue noted in Task 1
- [ ] End-to-end manual QA against a live backend

**Design decisions:**
- `IN_PROGRESS` on `/main`: show participant and room metadata, prepare socket eligibility via existing lifecycle rules, and do not navigate to `/play` until `game-started` with `enterGameScreen` (Task 4).
- Same-room `gameState` reuse is keyed on reflected room metadata equality, not `gameRoomId` alone, so HTTP room-status transitions refresh `gameState.status` without discarding unrelated realtime-enriched fields when metadata is unchanged.

**Deviations from spec:**
- None intentional. `id` → `participantId` / `gameRoomId` normalization remains as a tolerant adapter for incomplete payloads; it does not reintroduce removed domain fields such as `title` or `gameRoomTitle`.

**Trade-offs:**
- `IN_PROGRESS` reuses the waiting-room layout instead of a separate gameplay-resume shell on `/main`, to keep one participant/metadata path until realtime reducers land in Task 4.

**Open questions:**
- [x] Should `/main` auto-enter gameplay for `IN_PROGRESS` rooms? → No; stay on `/main` and wait for `game-started` routing (deferred to Task 4).
- [ ] Should `roomWaitingApi` require `roomStatus` from the API instead of defaulting to `WAITING` when absent?

**Instructions for the next worker:**
- Read this entry, then start **Task 3** in `docs/plans/2026-05-31-spec-sync-follow-up-plan.md`.
- Preserve `resolveMainPageRoomContextRoom`, metadata-aware `gameState` refresh, and `getWaitingRoomStartButtonState` invariants when touching `/main` or waiting-room code.
- When adding realtime reducers (Task 4), merge `gameState` / `missionState` from events without bypassing `hasRoomGameStateMetadataChanged` guards across room switches.
