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
