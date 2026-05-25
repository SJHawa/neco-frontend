## Entry: 2026-05-25 Task 3

**Track:**
- Plan file: `docs/plans/worker-1-main-chat-and-waiting-room-plan.md`
- Task: `Task 3: Implement invitation accept and deny flows`
- Dependencies reviewed:
  - `docs/implementation-logs/README.md`
  - `docs/implementation-logs/worker-1/phase-4a-ai-chat.md` Task 1, Task 2, Mock QA Support entries
  - `docs/specs/05-ai-chat-flow.md`
  - `docs/specs/08-error-loading-and-navigation.md`
  - `docs/specs/09-testing-and-milestones.md`
  - `docs/plans/worker-1-main-chat-and-waiting-room-plan.md`

**What was done:**
- Added invitation accept/deny helpers that build natural-language follow-up messages and resolve which invitation cards should be removed after `ROOM_JOIN` or `USER_INVITE_DENY` success responses.
- Replaced the passive invitation card on `/main` with actionable accept/deny buttons, per-card pending/error handling, retry support for retryable failures, and terminal-state lockout for non-retryable failures.
- Synced invitation success back into `/main` state by hiding completed invitation cards immediately, clearing stored invitation entries, and entering a waiting-room transition state after successful `ROOM_JOIN`.
- Extended `/main` mock mode with invitation scenarios so invited-user accept/deny flows can be verified without backend APIs:
  - `/main?mock=invitation`
  - `/main?mock=invitation-delay`
- Added regression coverage for invitation helper behavior, auth bypass support for the new mock scenarios, and backendless invitation accept/deny mock flows.

**Why it matters for the next worker:**
- Task 4 can now build the richer waiting-room status and participant UI on top of a stable invitation-entry path that already transitions `/main` into waiting-room mode after join success.
- Invitation cards now follow the shared retryable vs terminal error split, so downstream waiting-room work should preserve that distinction instead of collapsing everything into generic retry.

**Dependency impact:**
- Satisfied Worker 1 Task 3 by wiring invitation-card actions into the existing AI chat message-send contract and current-room refresh flow.
- Added invitation-focused mock scenarios so future waiting-room/start-game work can be smoke-checked in the browser before realtime backends are available.

**Files touched:**
- `src/app/router/authRouting.ts`
- `src/features/invitation/invitationFlow.ts`
- `src/pages/MainPage/index.tsx`
- `src/pages/MainPage/mockMode.ts`
- `src/shared/styles/global.css`
- `tests/app/authRouting.test.mjs`
- `tests/app/invitationFlow.test.mjs`
- `tests/app/mainPageMockMode.test.mjs`

**Commit:**
- `8704099`

**Verification completed:**
- [x] `npm test`
- [x] `npm run build`
- [x] `node --experimental-strip-types --import ./tests/helpers/registerResolveTsLoader.mjs --test tests/app/invitationFlow.test.mjs tests/app/authRouting.test.mjs tests/app/mainPageMockMode.test.mjs`
- [x] Independent `gpt-5.4` subagent review after implementation, with follow-up fixes applied for terminal invitation failure lockout and targeted test-path validation
- [x] Manual contract review confirmed invitation accept/deny intents are still sent as natural-language chat messages rather than a revived client action field

**Not verified:**
- [ ] Planned component test for invitation card success and failure states because the repo still does not have a DOM/component test harness
- [ ] Planned integration test for invitation rendering and acceptance into waiting-room state because the repo still does not have an integration harness
- [ ] Browser-level manual `/main?mock=invitation` and `/main?mock=invitation-delay` smoke test inside a running dev server

**Design decisions:**
- Kept invitation accept and deny on the existing chat send mutation so Task 3 stays aligned with the spec rule that these intents are natural-language user messages.
- Used a local hidden-invitation list plus store update on successful responses so completed invitation cards disappear immediately without waiting for query refetch timing.
- Reused the waiting-room transition pattern introduced by Task 2 for successful `ROOM_JOIN`, which keeps `/main` behavior consistent between room creation and invitation entry.

**Deviations from spec:**
- No intentional contract deviation. `ROOM_JOIN` and `USER_INVITE_DENY` both remove invitation cards, and `ROOM_JOIN` enters waiting-room mode on `/main`.

**Trade-offs:**
- Added helper-level and mock-flow coverage instead of introducing a rendered component harness during Task 3, which keeps the diff smaller but leaves invitation-card DOM assertions for later QA work.
- Modeled invitation success with the same transition bridge used by room creation rather than fabricating a partial waiting-room payload before the authoritative current-room query returns.

**Open questions:**
- [ ] Browser-level `/main` verification remains unresolved for the Worker 1 stream.
- [ ] Task 4 still needs to define how waiting-room participant changes should be surfaced before Worker 2 realtime work lands.
- [x] Initial review found terminal invitation failures could still be retried from the same card → fixed by disabling accept/deny buttons when the per-card error is non-retryable
- [x] Initial review found the new targeted invitation tests were not yet validated through the project's direct node test path → fixed by running the targeted `node --experimental-strip-types ... --test ...` command after implementation

**Instructions for the next worker:**
- Read this entry, then open [index.tsx](/Users/imhyeon/Documents/GitHub/frontend/src/pages/MainPage/index.tsx) and [mockMode.ts](/Users/imhyeon/Documents/GitHub/frontend/src/pages/MainPage/mockMode.ts) before starting Task 4.
- Preserve the rule that invitation accept/deny flows go through natural-language chat messages and not direct invitation mutation APIs.
- Build Task 4 waiting-room UI on top of the existing `waitingRoomTransition` bridge instead of replacing it with route navigation or speculative room data.

## Entry: 2026-05-25 Task 4

**Track:**
- Plan file: `docs/plans/worker-1-main-chat-and-waiting-room-plan.md`
- Task: `Task 4: Implement waiting-room status, participant list, and start button`
- Dependencies reviewed:
  - `docs/implementation-logs/README.md`
  - `docs/implementation-logs/worker-1/phase-4b-waiting-room.md` Task 3 entry
  - `docs/specs/03-modules.md`
  - `docs/specs/06-realtime-and-gameplay.md`
  - `docs/specs/07-state-and-client-data.md`
  - `docs/specs/08-error-loading-and-navigation.md`
  - `docs/specs/09-testing-and-milestones.md`
  - `docs/plans/worker-1-main-chat-and-waiting-room-plan.md`

**What was done:**
- Added `room-waiting` feature helpers and API access for `GET /game-room-participants?gameRoomId=...`, then derived and stored `roomWaitingState` in Zustand from current-room plus participant-query data.
- Replaced the shallow waiting-room placeholder on `/main` with a real waiting-room section that shows room status, participant counts, my role, my membership status, and participant cards.
- Added waiting-room participant loading skeletons and retryable room-scoped error UI so first-load waiting-room failures no longer collapse into generic main-page messaging.
- Added owner-only start controls whose visibility and enabled state follow the Worker 1 spec rules, while leaving the actual start request wiring for Task 5.
- Extended mock scenarios so room-create and invitation paths also return room participant data for waiting-room verification without backend APIs.
- Added regression coverage for room-waiting API request shape, waiting-room state derivation, start-button gating, and mock participant data.

**Why it matters for the next worker:**
- Task 5 can now focus narrowly on start-game request submission because the waiting-room surface, participant list, and button state rules already exist on `/main`.
- Worker 2 will inherit a concrete `roomWaitingState` shape and waiting-room rendering path instead of needing to introduce it while wiring realtime events.

**Dependency impact:**
- Satisfied Worker 1 Task 4 by layering room-scoped participant status over the Task 3 invitation-entry bridge.
- Introduced a dedicated `room-waiting` feature slice that downstream start-game and realtime updates should keep using instead of duplicating participant rendering logic inside `MainPage`.

**Files touched:**
- `src/features/room-waiting/roomWaitingApi.ts`
- `src/features/room-waiting/roomWaitingState.ts`
- `src/pages/MainPage/index.tsx`
- `src/pages/MainPage/mockMode.ts`
- `src/shared/styles/global.css`
- `tests/app/mainPageMockMode.test.mjs`
- `tests/app/roomWaitingState.test.mjs`

**Commit:**
- `70fd1a4`

**Verification completed:**
- [x] `npm test`
- [x] `npm run build`
- [x] `node --experimental-strip-types --import ./tests/helpers/registerResolveTsLoader.mjs --test tests/app/roomWaitingState.test.mjs tests/app/mainPageMockMode.test.mjs`
- [x] Independent `gpt-5.4` subagent review after implementation, with follow-up fixes applied for first-hydration change-summary suppression and first-load waiting-room error rendering
- [x] Manual contract review confirmed owner-only start-button visibility and enabled state follow the exact spec rule based on role, room status, and `minParticipants`

**Not verified:**
- [ ] Planned component tests for waiting-room status, participant list, and start-button states because the repo still does not have a DOM/component test harness
- [ ] Planned integration test for waiting-room initialization after room join or room create because the repo still does not have an integration harness
- [ ] Browser-level manual `/main?mock=room-create`, `/main?mock=room-create-delay`, `/main?mock=invitation`, and `/main?mock=invitation-delay` smoke tests inside a running dev server

**Design decisions:**
- Used `GET /game-room-participants?gameRoomId=...` as the waiting-room participant source so Task 4 stays within existing HTTP contracts instead of inventing a temporary client-only participant model.
- Stored `roomWaitingState` in Zustand but derived it from query data each time, keeping current-room ownership authoritative while still giving Worker 2 a stable waiting-room state shape to update later.
- Suppressed “recent participant change” summaries on first hydration and only show them when the participant list actually changes after an existing waiting-room baseline is present.
- Left the owner start button as a readiness control with an explicit Task 5 note instead of silently no-oping or prematurely wiring the real start request in Task 4.

**Deviations from spec:**
- No intentional contract deviation. Waiting-room UI remains on `/main`, uses retryable room-scoped error UI, and follows the exact owner/minimum-participant button rule.

**Trade-offs:**
- Added helper and mock coverage instead of a rendered component harness, which keeps the Task 4 diff contained but still leaves real DOM assertions for later QA work.
- Used query-driven participant hydration rather than speculative chat-command parsing for participant list contents, which reduces drift from backend room state but means Task 4 still depends on room-participant query timing.

**Open questions:**
- [ ] Browser-level `/main` verification remains unresolved for the Worker 1 stream.
- [ ] Task 5 still needs to replace the temporary “Task 5에서 이어집니다” start-button note with the real start-game request flow.
- [x] Initial review found first waiting-room hydration could be misreported as a participant change → fixed by keeping `changedParticipant` null until there is a previous waiting-room baseline for the same room
- [x] Initial review found first-load waiting-room participant failures could leave a blank success-looking assistant bubble before the retry error → fixed by suppressing the waiting-room status bubble unless loading content or hydrated waiting-room data exists

**Instructions for the next worker:**
- Read this entry, then open [roomWaitingState.ts](/Users/imhyeon/Documents/GitHub/frontend/src/features/room-waiting/roomWaitingState.ts) and [index.tsx](/Users/imhyeon/Documents/GitHub/frontend/src/pages/MainPage/index.tsx) before starting Task 5.
- Preserve the existing `roomWaitingState` store contract and keep current-room query data authoritative when adding start-game request handling.
- Replace the temporary owner start-note path with the actual request lifecycle in Task 5, but do not change the visibility/enabled rules that Task 4 established.
