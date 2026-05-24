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
