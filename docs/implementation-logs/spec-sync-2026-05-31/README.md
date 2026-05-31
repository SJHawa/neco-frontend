# API Spec Sync Log

## Entry: 2026-05-31 Shared API Spec Reflection

**Source reviewed:**
- `docs/etc/api-spec.md`

**What was done:**
- Synced `docs/specs` with the shared API document for auth, main-page initialization, AI chat, game-room, hint, and realtime contracts.
- Removed stale spec assumptions that were no longer supported by the shared API contract, including `POST /auth/register`, `membershipStatus` filtering via `status`, editor `fileUrl` bootstrap, and full-file realtime sync semantics.
- Added the shared close-code and `IN_PROGRESS` room-handling rules so routing and recovery expectations match the backend-facing document.

**Files touched:**
- `docs/specs/00-overview.md`
- `docs/specs/01-architecture.md`
- `docs/specs/02-domain-model.md`
- `docs/specs/04-api-and-auth.md`
- `docs/specs/05-ai-chat-flow.md`
- `docs/specs/06-realtime-and-gameplay.md`
- `docs/specs/07-state-and-client-data.md`
- `docs/specs/08-error-loading-and-navigation.md`
- `docs/specs/09-testing-and-milestones.md`

**Verification completed:**
- [x] Manual contract review of updated `docs/specs` content against `docs/etc/api-spec.md`
- [x] Targeted file inspection to ensure this was a docs-only change

**Not verified:**
- [ ] Runtime, build, or test execution was not run because the request was documentation-only

**Notes for future work:**
- The specs now treat the shared API document as the authoritative backend contract. If the backend changes the shared API again, update `docs/etc/api-spec.md` first and sync `docs/specs` from there.
