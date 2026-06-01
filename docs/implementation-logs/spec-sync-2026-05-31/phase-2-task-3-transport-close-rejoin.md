# Phase 2 Task 3 Follow-up: Transport Close Rejoin

## Entry: 2026-06-01 Follow-up

**Track:**
- Plan file: `docs/plans/2026-05-31-spec-sync-follow-up-plan.md`
- Follow-up topic: `game-started delivery blocked when room socket is no longer joined`
- Dependencies reviewed:
  - `docs/implementation-logs/spec-sync-2026-05-31/phase-2-task-3-socket-close-policy.md`
  - `docs/specs/06-realtime-and-gameplay.md`
  - `docs/specs/08-error-loading-and-navigation.md`

**What was done:**
- Narrowed the socket-session latch so only reflected application closes (`4401`, `4403`, `4404`, `1000`) remain terminal.
- Restored reconnect-and-rejoin behavior for transport-only disconnects such as `transport close`, which can happen before `game-started` is delivered.
- Replaced the previous lifecycle regression with a transport-close reconnection test that proves a new socket is created and emits `join-room` again after `sync()`.

**Why it matters for the next worker:**
- `POST /game-rooms/{gameRoomId}/start` can now still lead to gameplay entry after a transient socket drop because `/main` may rejoin the room before `game-started` is emitted.
- Application-level closes remain terminal, so auth / forbidden / missing-room safety behavior from the original Task 3 log still applies unchanged.

**Dependency impact:**
- Fixes a follow-up gap in Task 3 where transport disconnects were incorrectly treated as terminal room-session closures.
- Keeps the reflected “no reconnect-and-resume” policy for application close codes while allowing safe recovery from non-policy network interruptions.

**Files touched:**
- `src/features/realtime/socketClosePolicy.ts`
- `tests/app/roomSocketLifecycle.test.mjs`

**Verification completed:**
- [x] `node --experimental-strip-types --import ./tests/helpers/registerResolveTsLoader.mjs --test tests/app/roomSocketLifecycle.test.mjs tests/app/socketClosePolicy.test.mjs tests/app/specSyncRegression.test.mjs`
- [x] `npx tsc -p tsconfig.app.json`
- [x] Manual contract review against `docs/specs/06-realtime-and-gameplay.md` and `docs/specs/08-error-loading-and-navigation.md`

**Not verified:**
- [ ] End-to-end manual QA against a live backend socket session
- [ ] `npm run build` — not rerun because the targeted typecheck already covers the changed files

**Design decisions:**
- Reused `resolveSocketClosePolicyAction()` as the single source of truth for terminal-close latching instead of duplicating another allowlist in the lifecycle layer.
- Left `1000` as a terminal intentional close to preserve the existing recovery-UI contract on RoomPage.

**Deviations from spec:**
- None intentional. This change restores behavior closer to the spec by limiting terminal handling to the reflected application close-code policy.

**Trade-offs:**
- Transport-only disconnects can now reconnect on the next lifecycle sync, which improves resilience but may mask intermittent network instability unless additional diagnostics are surfaced later.

**Open questions:**
- [ ] Should `/main` surface lightweight realtime connection status while waiting for `game-started`, so join failures are visible before a start request is sent?

**Instructions for the next worker:**
- If `game-started` is still missing after this fix, inspect live socket join timing and backend room membership at emit time before changing HTTP start behavior.
