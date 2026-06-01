# Gameplay Frontend Fix Plan: Task 1 Contract Audit

## Entry: 2026-06-01 Task 1

**Track:**
- Plan file: `docs/plans/2026-06-01-gameplay-frontend-fix-plan.md`
- Task: `Task 1: Audit gameplay state ingestion against the current backend contract`
- Dependencies reviewed:
  - `docs/etc/api-spec.md`
  - `src/features/realtime/realtimeEventReducers.ts`
  - `src/features/realtime/roomRealtimeEvents.ts`
  - `src/pages/RoomPage/index.tsx`
  - `src/pages/RoomPage/roomPageViewModel.ts`
  - `src/features/editor/useGameplayCodeSync.ts`
  - `src/features/game-turn/submitTurn.ts`
  - `src/features/realtime/emitGameplayRealtimeEvent.ts`

**What was done:**
- Audited the frontend gameplay state path from realtime event receipt to RoomPage rendering against the current backend contract, using `docs/etc/api-spec.md` sections 12.2 through 12.10 as a comparison document rather than the final source of truth.
- Identified the current frontend ingestion path for the key gameplay events:
  - `room-participants-updated` is accepted in `bindRoomRealtimeEvents()` and stored through `applyRoomParticipantsUpdated()`.
  - `game-started` is accepted in `bindRoomRealtimeEvents()` and bootstraps gameplay state through `applyGameStarted()`.
  - `code-updated` is accepted in `bindRoomRealtimeEvents()` and merged through `applyCodeUpdated()`.
  - `turn-evaluated` is accepted in `bindRoomRealtimeEvents()` and stored through `applyTurnEvaluated()`.
  - `turn-changed` is accepted only when `event.turnState?.turnId` is present, then applied through `applyTurnChanged()`.
- Mapped the currently reported gameplay symptoms to concrete frontend state-ingestion gaps or backend contract dependencies:
  - `수행해야 할 미션이 보이지 않음`
    - Frontend rendering depends on `missionState.title` and `missionState.description` in `RoomPage`.
    - Frontend gap: gameplay bootstrapping leaves editor content empty and does not compensate for missing mission text in any structured way.
    - Backend dependency: the current backend runtime payload determines whether `game-started.missionState` actually contains `title`, `description`, and `language`. If those fields are absent at runtime, the frontend will stay on placeholder text until either the backend or frontend display policy changes.
  - `게임 시작후 참가자가 방장밖에 보이지 않음`
    - Frontend rendering depends entirely on `realtime.participants`, filtered to `JOINED` participants in `buildParticipantRows()`.
    - Frontend gap: gameplay relies on fresh realtime participant state and does not explicitly preserve broader waiting-room participant state through the route transition.
    - Backend dependency: the spec treats `room-participants-updated` as the authoritative participant sync event. If the server does not emit the full roster at the right times, gameplay will render stale or incomplete rows.
  - `다른 참가자의 화면에서도 방장밖에 보이지 않음`
    - Same core dependency as above, but it confirms the issue is room-wide state propagation rather than a single-client rendering quirk.
  - `다른 참가자는 코드 수정도 되지않음`
    - Frontend editability is strictly controlled by `turnState.currentPlayerId === authUserId` and `turnState.status === "IN_PROGRESS"`.
    - Frontend gap: `turn-changed` is ignored entirely if `turnState.turnId` is missing, so gameplay editability can stay stale even when some next-turn signal arrives.
    - Backend dependency: the spec requires a complete `turn-changed.turnState` payload. If runtime events omit it, the frontend cannot safely enable the next editor.
  - `제출하기를 눌렀을때 ai의 평가가 안옴`
    - Frontend submission path emits `turn-submit` with `{ gameRoomId, userId, turnId, codeSnapshot, submittedAt }`, matching the API spec.
    - Frontend ingestion for the response side is present: `turn-evaluated` would populate `lastTurnEvaluation` and markers if it arrives.
    - Backend dependency is dominant here: if the server is still expecting another submit payload shape, the frontend will not receive `turn-evaluated` at all.
- Recorded the later product decision that the current backend implementation is the canonical contract for upcoming frontend work, and that `content`-based sync should be treated as authoritative over the `codeDelta`-first wording in `docs/etc/api-spec.md`.
- Restated the expected frontend behavior from the chosen backend-first contract in implementation terms for the next tasks:
  - Mission metadata must come from the runtime `game-started.missionState` payload and be stored without dropping fields actually used by `RoomPage`.
  - Participant rows must be driven by authoritative `room-participants-updated` state, with a safe waiting-room-to-gameplay handoff.
  - Editability must be driven only by authoritative `turnState.currentPlayerId` and `turnState.status`.
  - Code sync fixes in later tasks must follow the current `content`-based backend behavior before any future `codeDelta` migration work is reconsidered.
  - Turn evaluation UI must remain locked after submit, then display `turn-evaluated`, and only unlock or rotate ownership on `turn-changed`.

**Why it matters for the next worker:**
- Task 2 can now align shared gameplay types against the chosen backend-first contract instead of re-auditing the gameplay surface.
- Tasks 3 through 5 now have a clear split between frontend ingestion fixes and backend-emission dependencies, reducing the risk of adding broad defensive fallbacks that hide contract drift.
- The known gameplay failures have been reduced to a small number of concrete seams:
  - gameplay mission bootstrapping
  - participant handoff and retention
  - `turn-changed` gating and editability
  - turn-evaluation response visibility

**Dependency impact:**
- Completes Task 1 in `docs/plans/2026-06-01-gameplay-frontend-fix-plan.md`.
- Unblocks Task 2 by naming the exact documented gameplay fields that shared types must represent.
- Narrows the implementation scope for later frontend tasks so they can focus on reducer and UI behavior rather than repeating contract discovery.

**Files touched:**
- `docs/plans/2026-06-01-gameplay-frontend-fix-plan.md`
- `docs/implementation-logs/gameplay-frontend-2026-06-01-task-1-contract-audit.md`

**Commit:**
- Not created in this session

**Verification completed:**
- [x] Manual source review against the current backend-facing contract notes and `docs/etc/api-spec.md`
- [x] Manual source review of gameplay ingestion and rendering files:
  - `src/features/realtime/realtimeEventReducers.ts`
  - `src/features/realtime/roomRealtimeEvents.ts`
  - `src/pages/RoomPage/index.tsx`
  - `src/pages/RoomPage/roomPageViewModel.ts`
  - `src/features/editor/useGameplayCodeSync.ts`
  - `src/features/game-turn/submitTurn.ts`
  - `src/features/realtime/emitGameplayRealtimeEvent.ts`
- [x] Plan Task 1 checklist updated to reflect the completed audit

**Not verified:**
- [ ] Live browser QA against a reachable backend
- [ ] Runtime capture of actual `game-started`, `room-participants-updated`, `turn-evaluated`, and `turn-changed` frames during a multi-user game
- [ ] Whether the backend currently emits every documented gameplay field in production-like runs

**Design decisions:**
- Treated `docs/etc/api-spec.md` as a comparison document during the initial audit, then updated the execution stance after the user chose the current backend implementation as the contract source of truth.
- Kept the audit focused on frontend state ingestion and rendering boundaries rather than broad backend refactoring advice.
- Marked backend-emission gaps explicitly instead of recommending speculative page-level fallbacks.
- Captured the follow-up decision that `content`-based sync is canonical for this frontend fix track.

**Deviations from spec:**
- The current frontend implementation assumes some mission fields may be absent and falls back to placeholder mission copy.
- The current frontend route transition into gameplay does not explicitly guarantee participant-state preservation when realtime participant updates lag behind route entry.
- The current frontend ignores `turn-changed` unless `turnState.turnId` is present, which is stricter than a more defensive normalization path but still compatible with the chosen backend-first flow as long as that event keeps carrying `turnState`.

**Trade-offs:**
- Keeping this task as a documentation-first audit avoids premature code changes, but it means the identified issues remain unresolved until Tasks 2 and onward are implemented.
- Explicitly separating frontend gaps from backend dependencies makes follow-up work more reviewable, but it also means some symptoms still require live runtime confirmation before they can be declared frontend-only bugs.

**Open questions:**
- [ ] Should the frontend preserve waiting-room participants into gameplay until a newer `room-participants-updated` arrives, or only during the initial gameplay bootstrap window?
- [ ] If the backend still omits `missionState.title` and `missionState.description`, should the frontend keep the current placeholder copy or show a more explicit contract-gap state?
- [ ] When documentation is reconciled later, should `docs/etc/api-spec.md` be rewritten to match the current `content`-based contract before any new delta-sync migration is planned?
- [ ] Do we want to add a small debug hook for realtime gameplay payload inspection during manual QA, or rely entirely on tests and source review?

**Instructions for the next worker:**
- Start with Task 2 in `docs/plans/2026-06-01-gameplay-frontend-fix-plan.md`.
- Preserve the contract split captured here:
  - shared gameplay types in Task 2
  - reducer and editor bootstrapping fixes in Task 3
  - participant handoff fixes in Task 4
  - editability and turn-progression fixes in Task 5
- Do not widen the scope into backend changes inside the frontend repo; instead, keep backend-emission gaps documented as dependencies when encountered.
