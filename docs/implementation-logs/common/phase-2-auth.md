## Entry: 2026-05-25 Task 3

**Track:**
- Plan file: `docs/plans/common-sequential-plan.md`
- Task: `Task 3: Implement signup flow and nickname availability check`
- Dependencies reviewed:
  - `docs/implementation-logs/README.md`
  - `docs/implementation-logs/common/README.md`
  - `docs/implementation-logs/common/phase-1-foundation.md`
  - `docs/specs/04-api-and-auth.md`
  - `docs/specs/05-ai-chat-flow.md`
  - `docs/specs/08-error-loading-and-navigation.md`
  - `docs/specs/09-testing-and-milestones.md`

**What was done:**
- Added a shared auth feature module for nickname availability checks, signup submission, SHA-256 password hashing, request shaping, and conflict-to-field error mapping.
- Replaced the `/signup` placeholder with a real form that validates required fields, checks nickname availability, blocks submission while the nickname check is pending, and redirects successful signup back to `/login`.
- Added a page-level authenticated-user redirect from `/signup` to `/main` so the signup route already behaves as guest-only before the broader Task 4 route-guard work lands.
- Added regression tests for signup request routing, legacy `/auth/register` compatibility fallback, field validation, error mapping, password hashing, and post-signup redirect behavior.
- Requested a `gpt-5.4` review subagent after implementation, addressed the findings about submit-during-check behavior and the `/auth/signup` vs `/auth/register` spec mismatch, then re-ran verification.

**Why it matters for the next worker:**
- Task 4 can build login, token persistence, and full route guards on top of a concrete signup path without revisiting password hashing or conflict messaging behavior.
- Task 6's AI chat session initialization depends on the backend side effect from signup; the frontend now prefers `/auth/signup` but retries `/auth/register` on `404` to stay compatible with the current spec naming mismatch.

**Dependency impact:**
- Satisfied the Phase 2 signup prerequisite by wiring the public auth request path, field-level conflict handling, and post-signup navigation without writing auth storage prematurely.
- Reduced downstream risk for Task 4 by making `/signup` guest-only now, while leaving shared token storage and the rest of the auth-route matrix to the dedicated login/guard task.

**Files touched:**
- `package.json`
- `src/features/auth/*`
- `src/pages/SignupPage/index.tsx`
- `src/shared/styles/global.css`
- `tests/auth/*`

**Commit:**
- `89b41bc`

**Verification completed:**
- [x] Task 3 implementation review against `docs/specs/04-api-and-auth.md`, `docs/specs/05-ai-chat-flow.md`, `docs/specs/08-error-loading-and-navigation.md`, and `docs/specs/09-testing-and-milestones.md`
- [x] `npm test`
- [x] `npm run build`
- [x] Independent `gpt-5.4` subagent review after implementation, with findings incorporated before the code commit

**Not verified:**
- [ ] DOM/component-level automated coverage for signup field rendering, pending nickname-check UI, and `/signup` guest redirect
- [ ] Browser-level manual signup smoke test against a running app instance

**Design decisions:**
- Chose `/login` as the post-signup destination so Task 3 does not invent authenticated state before Task 4 defines login storage and refresh behavior.
- Treated nickname availability as a gating pre-submit check once it is in flight, which avoids contradictory UI states where signup can finish before the duplication check returns.
- Added a `404` fallback from `/auth/signup` to `/auth/register` because the current spec set names the same backend side effect both ways.

**Deviations from spec:**
- No intentional product-flow deviation. The only contract ambiguity was the signup endpoint name: `docs/specs/05-ai-chat-flow.md` and `docs/specs/09-testing-and-milestones.md` mention `POST /auth/register`, while the concrete API document uses `POST /auth/signup`. The implementation preserves compatibility with both names until the docs are reconciled.

**Trade-offs:**
- Kept verification inside the existing Node test harness instead of introducing a full DOM/component test stack during Task 3, which kept the code change focused but leaves some user-visible behavior unverified at the UI level.
- Added only the `/signup` guest redirect now, rather than broadening scope into a full route-guard matrix before Task 4.

**Open questions:**
- [ ] The repository still lacks a DOM/component test harness for auth UI flows; decide whether Task 4 should introduce one or defer that to the Phase 8 QA tooling work.
- [ ] The browser-level route smoke harness noted in earlier common-track logs is still unresolved.
- [x] `POST /auth/signup` vs `POST /auth/register` created a spec conflict around AI chat session bootstrap → handled with a `404` compatibility fallback and documented here for later doc cleanup

**Instructions for the next worker:**
- Read `src/features/auth/authApi.ts`, `src/features/auth/signupModel.ts`, and this log before implementing login or full route guards.
- Preserve the client-side SHA-256 hashing contract and the rule that signup must not write auth tokens or authenticated user state.
- When Task 4 expands route protection, keep `/signup` aligned with the current guest-only redirect behavior instead of replacing it with a conflicting flow.

## Entry: 2026-05-25 Task 4

**Track:**
- Plan file: `docs/plans/common-sequential-plan.md`
- Task: `Task 4: Implement login, token persistence, refresh, and route guards`
- Dependencies reviewed:
  - `docs/implementation-logs/README.md`
  - `docs/implementation-logs/common/README.md`
  - `docs/implementation-logs/common/phase-2-auth.md` Task 3 entry
  - `docs/specs/01-architecture.md`
  - `docs/specs/04-api-and-auth.md`
  - `docs/specs/07-state-and-client-data.md`
  - `docs/specs/08-error-loading-and-navigation.md`
  - `docs/specs/09-testing-and-milestones.md`

**What was done:**
- Added the public login API path, login form model, SHA-256 login request hashing, invalid-credential form error mapping, and a working `/login` page UI.
- Added auth session persistence helpers that store the access token in `sessionStorage`, the refresh token in `localStorage`, and the current authenticated user snapshot in `sessionStorage`, then hydrate Zustand auth state from that browser snapshot.
- Synced auth state with refresh-success and logout events so refresh-once retry keeps the in-memory auth state aligned with storage and refresh failure clears auth state before routing back to `/login`.
- Wrapped `/login` and `/signup` in guest-only routing and `/main`, `/rooms/:gameRoomId/play`, and `/rooms/:gameRoomId/result` in protected routing.
- Added regression tests for login request shaping, auth session hydration, token-plus-user persistence, route-guard decision rules, and browser auth-storage behavior.
- Requested a `gpt-5.4` review subagent after implementation, addressed the finding about token-only hydration incorrectly marking the user authenticated, added the missing login API coverage, then re-ran verification.

**Why it matters for the next worker:**
- Task 5 and Task 6 can now assume the app arrives at `/main` with protected-route behavior and a restorable auth snapshot instead of rebuilding auth checks locally.
- Shared API refresh behavior now updates browser storage and the app store together, so downstream features should continue using the centralized auth/session helpers instead of duplicating refresh or logout logic.

**Dependency impact:**
- Completed the remaining Phase 2 auth runtime pieces required before `/main` initialization: login submission, session restore, refresh-failure cleanup, and route guards.
- Reduced downstream ambiguity by making the auth store boot from browser state, which gives the next tasks a stable place to read `auth.user` and `auth.user.userId`.

**Files touched:**
- `package.json`
- `src/app/providers/ClientStateProvider.tsx`
- `src/app/router/*`
- `src/app/store/clientState.ts`
- `src/features/auth/*`
- `src/pages/LoginPage/index.tsx`
- `src/shared/api/*`
- `src/shared/constants/auth.ts`
- `tests/app/*`
- `tests/auth/*`
- `tests/shared/browserApiClient.test.mjs`

**Commit:**
- `757ba1c`

**Verification completed:**
- [x] Task 4 implementation review against `docs/specs/01-architecture.md`, `docs/specs/04-api-and-auth.md`, `docs/specs/07-state-and-client-data.md`, `docs/specs/08-error-loading-and-navigation.md`, and `docs/specs/09-testing-and-milestones.md`
- [x] `npm test`
- [x] `npm run build`
- [x] Independent `gpt-5.4` subagent review after implementation, with the hydration guard fix and extra login API coverage incorporated before commit
- [x] Manual route-guard matrix review against `docs/specs/01-architecture.md`

**Not verified:**
- [ ] DOM/component-level automated coverage for the rendered login form, real `AppRouter` redirects, and provider event listeners
- [ ] Browser-level manual smoke test for login success, refresh-success session continuity, and refresh-failure return to `/login`

**Design decisions:**
- Kept the token storage contract exactly as specified while persisting the authenticated user snapshot in `sessionStorage` so later `/main` initialization still has `userId` after an in-session reload.
- Treated a token-only snapshot as logged out during hydration, because the app cannot safely enter protected routes without the `AuthUser` data required by the next auth-dependent tasks.
- Added pure route-decision helpers for testability, then used those helpers inside the React router wrappers to keep the route matrix explicit.

**Deviations from spec:**
- The spec set explicitly resolves token storage but is silent on `AuthUser` persistence. This implementation stores the current authenticated user snapshot in `sessionStorage` to preserve `auth.user` across in-session reloads; the behavior is documented here because later `/main` initialization depends on `userId`.

**Trade-offs:**
- Stayed inside the existing Node test harness instead of introducing a DOM/integration stack during Task 4, which kept the change set focused but leaves the actual rendered router and provider flow only indirectly covered.
- Chose event-based auth-store synchronization over direct coupling between the API client and the Zustand store, which keeps the shared API layer framework-agnostic at the cost of one extra browser event contract.

**Open questions:**
- [ ] The repository still lacks a DOM/component test harness for auth UI and router flows; decide whether that lands in Phase 8 QA or earlier if `/main` initialization work starts needing stronger route-level confidence.
- [ ] The browser-level route smoke harness noted in earlier common-track logs is still unresolved.
- [x] Hydration previously treated an access-token-only snapshot as authenticated → fixed by requiring a restorable `AuthUser` before protected-route entry

**Instructions for the next worker:**
- Read `src/features/auth/authSession.ts`, `src/shared/api/authStorage.ts`, and `src/app/router/AppRouter.tsx` before extending auth-dependent behavior.
- Preserve the current auth snapshot contract: access token in `sessionStorage`, refresh token in `localStorage`, authenticated user snapshot in `sessionStorage`.
- Reuse the protected/guest route wrappers and auth session helpers instead of adding parallel route checks inside feature pages.
