# Implementation Plan: Spec Sync Follow-up

## Overview
This plan covers the implementation work that remains after syncing `docs/specs/*` to the shared backend contract in [`docs/etc/api-spec.md`](/Users/imhyeon/Documents/GitHub/frontend/docs/etc/api-spec.md). The earlier plan files in `docs/plans/` describe the initial build-out and are partially reflected in the current codebase and implementation logs; this document focuses on the follow-up work needed to align the existing frontend with the updated spec and finish the remaining realtime and gameplay slices.

## Architecture Decisions
- Align shared contracts first. The current code still carries older assumptions such as `title`, `gameRoomTitle`, `status`-based invitation fields, and a free-form socket termination reason, so shared types and adapters must be corrected before deeper gameplay work continues.
- Preserve the existing route ownership split. `/main` remains the pre-game surface, and `/rooms/:gameRoomId/*` remains the gameplay surface. The new work should extend those boundaries instead of moving behavior across routes.
- Treat realtime events as authoritative for gameplay state. HTTP responses may acknowledge requests, but `room-participants-updated`, `game-started`, `game-state-updated`, `turn-evaluated`, `turn-changed`, and `mission-result` should drive state and navigation.
- Keep earlier plan documents as historical references. This plan should be used for new implementation tasks because it reflects the current codebase and the latest shared API contract.

## Parallelization Guidance
- Must stay sequential:
  - shared type and adapter alignment
  - realtime close-code state shape
  - gameplay bootstrapping contract
- Can parallelize after Task 4 if the shared reducers and store shape are stable:
  - one stream on RoomPage UI composition
  - one stream on editor, hint, and turn-flow behavior
  - the contract boundary is the updated `RootClientState` plus realtime event payload helpers

## Task List

### Phase 1: Shared Contract Alignment

## Task 1: Align shared domain and client-state types with the reflected spec

**Description:** Update the shared frontend contracts so the codebase matches the reflected spec before more feature work lands on top. This includes room, invitation, hint, mission, realtime close-code, and delta-sync types.

**Acceptance criteria:**
- [ ] `src/shared/types/domain.ts` matches the reflected spec for `CurrentGameRoom`, `GameRoomParticipant`, `AiChatCommandResult`, `MissionState`, `HintResponse`, and delta-based realtime payloads.
- [ ] `src/shared/types/clientState.ts` and `src/app/store/clientState.ts` expose the reflected realtime state fields, including close-code metadata instead of a single free-form termination string.
- [ ] No shared type continues to require removed fields such as `title`, `gameRoomTitle`, or full-file realtime sync semantics where the reflected spec no longer allows them.

**Verification:**
- [ ] Tests pass: `node --experimental-strip-types --import ./tests/helpers/registerResolveTsLoader.mjs --test tests/shared/*.test.mjs tests/app/roomSocketLifecycle.test.mjs`
- [ ] Build succeeds: `npm run build`
- [ ] Manual check: compare the updated shared types against `docs/specs/02-domain-model.md`, `docs/specs/06-realtime-and-gameplay.md`, and `docs/specs/07-state-and-client-data.md`

**Dependencies:** None

**Files likely touched:**
- `src/shared/types/domain.ts`
- `src/shared/types/clientState.ts`
- `src/app/store/clientState.ts`
- `tests/shared/createApiClient.test.mjs`
- `tests/app/roomSocketLifecycle.test.mjs`

**Estimated scope:** M: 3-5 files

## Task 2: Align main-page adapters and waiting-room derivation to the reflected API contract

**Description:** Update the `/main` initialization and waiting-room data adapters so they consume the reflected HTTP contract correctly, especially around invitation filtering, current-room metadata, and `IN_PROGRESS` room handling.

**Acceptance criteria:**
- [ ] `game-room`, `invitation`, and `room-waiting` adapters consume `membershipStatus`, room difficulty, time-limit, and strike metadata using the reflected field names.
- [ ] `/main` initialization no longer depends on deprecated room or invitation shape fallbacks that contradict the reflected spec.
- [ ] The waiting-room derivation path preserves the current `/main` UX while remaining compatible with both `WAITING` and `IN_PROGRESS` room initialization rules.

**Verification:**
- [ ] Tests pass: `node --experimental-strip-types --import ./tests/helpers/registerResolveTsLoader.mjs --test tests/app/mainInitialization.test.mjs tests/app/roomWaitingState.test.mjs tests/app/invitationFlow.test.mjs`
- [ ] Build succeeds: `npm run build`
- [ ] Manual check: review `/main` data-loading rules against `docs/specs/04-api-and-auth.md` and `docs/specs/06-realtime-and-gameplay.md`

**Dependencies:** Task 1

**Files likely touched:**
- `src/features/game-room/gameRoomApi.ts`
- `src/features/invitation/invitationApi.ts`
- `src/features/room-waiting/roomWaitingState.ts`
- `src/pages/MainPage/mainInitialization.ts`
- `tests/app/mainInitialization.test.mjs`

**Estimated scope:** M: 3-5 files

## Checkpoint: After Tasks 1-2
- [ ] Shared types and `/main` adapters match the reflected spec
- [ ] Application builds without shared-contract type errors
- [ ] Existing `/main` flows still work after the contract cleanup
- [ ] Review with human before proceeding

### Phase 2: Realtime Contract And Gameplay Entry

## Task 3: Upgrade socket lifecycle state for reflected close-code handling

**Description:** Extend the existing socket lifecycle controller so it records structured close information and applies the new reflected close-code policy for `4401`, `4403`, `4404`, and normal `1000` closure handling.

**Acceptance criteria:**
- [ ] Realtime state stores close code and reason code separately from generic connection status.
- [ ] `4401` drives auth-clear and login recovery behavior, while `4403` and `4404` drive terminated-session handling without pretending the session can resume.
- [ ] Tests cover the reflected close-code policy without reintroducing automatic reconnect-and-resume behavior.

**Verification:**
- [ ] Tests pass: `node --experimental-strip-types --import ./tests/helpers/registerResolveTsLoader.mjs --test tests/app/roomSocketLifecycle.test.mjs tests/app/authRouting.test.mjs`
- [ ] Build succeeds: `npm run build`
- [ ] Manual check: compare lifecycle behavior against `docs/specs/01-architecture.md` and `docs/specs/08-error-loading-and-navigation.md`

**Dependencies:** Task 1

**Files likely touched:**
- `src/shared/socket/socketClient.ts`
- `src/features/realtime/roomSocketLifecycle.ts`
- `src/shared/types/clientState.ts`
- `src/app/store/clientState.ts`
- `tests/app/roomSocketLifecycle.test.mjs`

**Estimated scope:** M: 3-5 files

## Task 4: Add realtime event reducers for waiting-room sync and gameplay entry

**Description:** Introduce explicit realtime event handling for `room-participants-updated`, `game-started`, and `game-state-updated` so room-scoped state, gameplay entry, and route transitions are driven by authoritative event payloads instead of the current static gameplay shell.

**Acceptance criteria:**
- [ ] `room-participants-updated` persists participants plus included `gameState` and `missionState` into shared state.
- [ ] `game-started` becomes the only route gate into `/rooms/:gameRoomId/play` and bootstraps store state from realtime payloads.
- [ ] `game-state-updated` refreshes room-scoped state without requiring manual page reconstruction or HTTP polling hacks.

**Verification:**
- [ ] Tests pass: `node --experimental-strip-types --import ./tests/helpers/registerResolveTsLoader.mjs --test tests/app/roomSocketLifecycle.test.mjs tests/app/mainInitialization.test.mjs`
- [ ] Build succeeds: `npm run build`
- [ ] Manual check: verify event-to-route/state rules against `docs/specs/06-realtime-and-gameplay.md`

**Dependencies:** Task 3

**Files likely touched:**
- `src/features/realtime/roomSocketLifecycle.ts`
- `src/features/realtime/useRoomSocketLifecycle.ts`
- `src/pages/MainPage/index.tsx`
- `src/pages/RoomPage/index.tsx`
- `src/app/store/clientState.ts`

**Estimated scope:** M: 3-5 files

## Checkpoint: After Tasks 3-4
- [ ] Realtime close handling matches the reflected spec
- [ ] Gameplay entry depends on `game-started`, not static placeholders or HTTP success
- [ ] Waiting-room and gameplay surfaces share one consistent realtime state contract
- [ ] Review with human before proceeding

### Phase 3: Gameplay Screen Completion

## Task 5: Replace the static RoomPage shell with store-driven gameplay state

**Description:** Rebuild `RoomPage` around shared store and realtime payloads so mission metadata, participant state, timer state, and file-tab structure come from authoritative data instead of hardcoded mock content.

**Acceptance criteria:**
- [ ] `RoomPage` renders mission, turn, strike, and participant information from `gameState`, `missionState`, and `realtime.participants`.
- [ ] File tabs are built from `missionState.projectStructure.files` and no longer rely on hardcoded mission fixtures.
- [ ] Terminated-session UI remains intact after the static shell is removed.

**Verification:**
- [ ] Tests pass: `node --experimental-strip-types --import ./tests/helpers/registerResolveTsLoader.mjs --test tests/app/roomSocketLifecycle.test.mjs`
- [ ] Build succeeds: `npm run build`
- [ ] Manual check: compare RoomPage structure against `docs/specs/06-realtime-and-gameplay.md`

**Dependencies:** Task 4

**Files likely touched:**
- `src/pages/RoomPage/index.tsx`
- `src/pages/RoomPage/RoomPage.css`
- `src/shared/types/clientState.ts`
- `src/app/store/clientState.ts`

**Estimated scope:** M: 3-5 files

## Task 6: Implement hint flow, delta code sync, and editor synchronization

**Description:** Add the gameplay editor behavior from the reflected spec, including current-step hint fetching, delta-based `code-change` and `code-updated` handling, and read-only/editable transitions tied to the active turn.

**Acceptance criteria:**
- [ ] Hint requests use the reflected nullable hint contract and cache by `gameRoomMissionStepId`.
- [ ] Outbound and inbound code sync use delta payload semantics rather than full-file snapshot semantics.
- [ ] Editor write access follows the current-player plus `IN_PROGRESS` rule from the reflected spec.

**Verification:**
- [ ] Tests pass: `node --experimental-strip-types --import ./tests/helpers/registerResolveTsLoader.mjs --test tests/app/roomSocketLifecycle.test.mjs`
- [ ] Build succeeds: `npm run build`
- [ ] Manual check: compare editor and hint behavior against `docs/specs/04-api-and-auth.md`, `docs/specs/06-realtime-and-gameplay.md`, and `docs/specs/07-state-and-client-data.md`

**Dependencies:** Task 5

**Files likely touched:**
- `src/features/realtime/*`
- `src/features/hint/*`
- `src/features/editor/*`
- `src/pages/RoomPage/index.tsx`
- `src/app/store/clientState.ts`

**Estimated scope:** M: 3-5 files

## Task 7: Implement turn progression, evaluation state, and result routing

**Description:** Complete the gameplay lifecycle by wiring `turn-submit`, `turn-evaluated`, `turn-changed`, and `mission-result` so the app can move through active turns and reach the result screen using reflected realtime payloads only.

**Acceptance criteria:**
- [ ] Turn submission emits the reflected snapshot payload and locks editing until a turn outcome arrives.
- [ ] `turn-evaluated` and `turn-changed` update evaluation output, markers, timer state, and editability without requiring a reload.
- [ ] `mission-result` stores final result data in memory and routes to `/rooms/:gameRoomId/result` without a separate fetch.

**Verification:**
- [ ] Tests pass: `node --experimental-strip-types --import ./tests/helpers/registerResolveTsLoader.mjs --test tests/app/roomSocketLifecycle.test.mjs`
- [ ] Build succeeds: `npm run build`
- [ ] Manual check: compare turn/result behavior against `docs/specs/06-realtime-and-gameplay.md` and `docs/specs/09-testing-and-milestones.md`

**Dependencies:** Task 6

**Files likely touched:**
- `src/features/realtime/*`
- `src/features/game-turn/*`
- `src/pages/RoomPage/index.tsx`
- `src/pages/ResultPage/index.tsx`
- `src/app/store/clientState.ts`

**Estimated scope:** M: 3-5 files

## Task 8: Add focused regression coverage and refresh manual QA paths

**Description:** Add the narrowest useful regression checks for the new reflected contracts and document the updated manual verification paths so the implementation can be reviewed without relying on stale mock assumptions or ad hoc smoke tests.

**Acceptance criteria:**
- [ ] Regression coverage exists for reflected close-code handling, gameplay entry, delta sync semantics, and result routing.
- [ ] Mock or manual QA instructions are updated only where they still reflect the current implementation path.
- [ ] The final verification checklist aligns with the reflected spec instead of the earlier pre-sync assumptions.

**Verification:**
- [ ] Tests pass: `npm test`
- [ ] Build succeeds: `npm run build`
- [ ] Manual check: verify that plan, tests, and implementation logs reference the same reflected contract terms

**Dependencies:** Task 7

**Files likely touched:**
- `tests/app/*`
- `docs/implementation-logs/*`
- `docs/plans/*`

**Estimated scope:** M: 3-5 files

## Checkpoint: Complete
- [ ] All acceptance criteria met
- [ ] Application builds without errors
- [ ] `/main` to gameplay to result works against the reflected contract
- [ ] Ready for review

## Risks and Mitigations
| Risk | Impact | Mitigation |
|------|--------|------------|
| Shared type cleanup breaks already-working `/main` flows | High | Land Tasks 1-2 first with targeted regression coverage before deeper gameplay changes |
| Realtime close handling gets implemented as generic disconnect UX and loses contract detail | High | Freeze the close-code state shape in Task 3 and test `4401`, `4403`, and `4404` explicitly |
| The static RoomPage shell masks missing gameplay data dependencies until too late | High | Replace the shell in Task 5 immediately after gameplay-entry reducers are available |
| Editor sync work reuses old full-file assumptions | Medium | Make delta payload semantics an explicit Task 6 acceptance criterion and regression target |
| Existing mock flows drift from the reflected gameplay contract | Medium | Keep mock/manual QA documentation narrow and refresh it only after gameplay state is real |

## Open Questions
- Should `/main` treat a reflected `IN_PROGRESS` room as an automatic gameplay re-entry path, or should it always require an explicit user action into `/rooms/:gameRoomId/play`?
- Does the backend intend to emit Socket.IO-style disconnect reasons only, or should the frontend expect custom application close-code payload data alongside them?
- Is an in-memory-only result screen still acceptable for v1 after the reflected spec updates, or should hard-refresh recovery be planned as a follow-up item?
