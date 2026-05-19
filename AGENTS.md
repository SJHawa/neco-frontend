# AGENTS.md

Use the smallest safe change that satisfies the user's goal. Let the task context determine how much planning, clarification, implementation, retrieval, and verification are needed.

Prefer outcome-first execution over process-heavy behavior. Define the goal, make the smallest safe change, verify what matters, then stop.

## 1. Collaboration style

Be concise, direct, and practical.

Prefer making progress over stopping for clarification when the request is clear enough to attempt. Ask only when missing information would materially affect correctness, data safety, security, public API behavior, user-visible behavior, or irreversible work.

When ambiguity is low-risk, make a conservative assumption, state it briefly if it matters for review, and continue.

When disagreeing with a requested approach, explain the tradeoff and suggest the simpler or safer alternative.

## 2. Understand the task before changing code

Before editing, classify the task:

- trivial change: typo, copy, formatting, config value, small documentation update
- bug fix: existing behavior is wrong
- feature change: new behavior is requested
- refactor: structure changes without intended behavior change
- risky change: auth, security, data, schema, migration, public API, payment, permissions, privacy, or destructive operations

Use the classification to choose the appropriate level of planning, implementation, and verification.

For multi-step, risky, or tool-heavy tasks, start with a brief user-visible update that states the intended approach. Keep it to one or two sentences. Do not narrate every command or low-level operation.

## 3. Success criteria

A task is complete when:

- The requested behavior is implemented with the smallest safe change.
- The change is scoped to the user's goal.
- Relevant validation has passed, or the reason validation could not be run is clearly stated.
- Any assumption, blocker, skipped check, or follow-up risk is called out.
- The final response summarizes what changed and how it was verified.

Do not expand the task to improve unrelated code, add optional features, or perform speculative cleanup.

## 4. Choose the smallest safe implementation

Default to direct code.

Add abstraction only when justified by at least one of the following:

- current duplication exists
- domain behavior becomes clearer
- testability materially improves
- the existing codebase already uses the abstraction pattern locally

Do not add speculative flexibility for future requirements.

Avoid:

- features beyond what was requested
- configuration options that were not requested
- generic frameworks for one-off behavior
- broad rewrites when a local change is enough
- error handling for scenarios that cannot realistically occur in the current design

Before expanding scope, check whether the extra work is necessary for the stated goal. If not, leave it out.

## 5. Keep the diff local and reviewable

Change only the files and lines needed for the requested behavior.

Match local style, naming, formatting, file organization, testing patterns, and error-handling conventions, even if a different style would be preferable in isolation.

Adjacent cleanup is allowed only when your change would otherwise leave the code inconsistent, unsafe, untyped, failing tests, or difficult to verify.

When your own change creates unused imports, variables, functions, files, or dead branches, remove them.

If you notice unrelated issues, mention them instead of fixing them.

Every changed line should be traceable to the user's request, required validation, or cleanup caused by your own change.

## 6. Retrieval budget

Use existing repository context first.

Read or search additional sources only when needed to answer or implement safely.

For server-facing work, read the relevant spec documents under `docs/specs/` before implementing. Treat those spec documents as the source of truth unless a newer explicit project decision overrides them.

Retrieve more information when:

- the task depends on a specific library, framework, API, version, error message, or external behavior
- the repository does not contain enough evidence to make the change safely
- a specific document, URL, issue, ticket, design note, or code artifact must be read
- the user asks for current, source-backed, or exhaustive information
- the answer would otherwise rely on an unsupported factual claim

Stop retrieving once there is enough evidence to implement or answer the core request correctly.

Do not keep searching to improve phrasing, collect nonessential examples, or justify generic statements.

Prefer authoritative sources such as official documentation, repository code, project docs, specs, or directly relevant issues.

### Spec-first server development

Before changing behavior that touches APIs, auth, realtime events, state contracts, routing, or domain rules, read the relevant files in `docs/specs/` first.

- Do not implement server-facing behavior from memory.
- Do not infer a contract from incomplete code when a matching spec exists.
- If multiple spec files are relevant, read the narrowest set that covers the requested change.

### Spec routing

Use the following routing guide to decide which spec file to read first:

- Project purpose, domain terms, scope, and product rules:
  - `docs/specs/00-overview.md`

- System boundaries, runtime architecture, infrastructure assumptions, external services, and socket lifecycle:
  - `docs/specs/01-architecture.md`

- Domain entities, shared types, current-room rules, and business invariants:
  - `docs/specs/02-domain-model.md`

- Module ownership, responsibilities, dependencies, and layering:
  - `docs/specs/03-modules.md`

- HTTP API behavior, auth flows, token handling, and hint APIs:
  - `docs/specs/04-api-and-auth.md`

- AI chat session behavior, command flows, room creation, invitations, and start-request semantics:
  - `docs/specs/05-ai-chat-flow.md`

- Waiting-room behavior, realtime events, gameplay transitions, and editor synchronization:
  - `docs/specs/06-realtime-and-gameplay.md`

- Query state, Zustand state, timers, and client data ownership:
  - `docs/specs/07-state-and-client-data.md`

- Error mapping, loading policy, retry behavior, and navigation rules:
  - `docs/specs/08-error-loading-and-navigation.md`

- Test expectations, milestones, and resolved backend contracts:
  - `docs/specs/09-testing-and-milestones.md`

### Conflict policy

When specs, code, comments, and user assumptions conflict, follow this order:

1. Explicit user instruction for the current task
2. `docs/specs/` documents
3. Other project docs
4. Existing implementation

Rules:

- Do not silently "split the difference" between code and spec.
- Do not rewrite behavior to match current code when the spec says otherwise unless the user asks for that change.
- If code and spec conflict in a way that materially affects correctness or user-visible behavior, call out the conflict in your response.
- If the task is documentation-only, update docs without inventing unverified code behavior.

## 7. Verification proportional to risk

Run the narrowest useful validation available.

Choose validation based on task type:

- trivial change: run only a lightweight relevant check if available
- bug fix: prefer a regression test that reproduces the bug, then make it pass
- feature change: test the new behavior and important edge cases
- refactor: verify behavior before and after when practical
- risky change: run targeted tests plus typecheck, lint, build, migration check, or smoke test as relevant

For coding tasks, prefer these checks when applicable:

- targeted unit tests for changed behavior
- integration tests for affected flows
- type checks
- lint checks
- build checks for affected packages
- minimal smoke tests when full validation is too expensive

If full validation is expensive, unavailable, or unnecessary, run the smallest check that gives useful confidence.

If validation cannot be run, state exactly:

- what was not run
- why it was not run
- the next best check the user should run

Never claim validation passed if it was not actually run.

Do not delete, disable, skip, weaken, or rewrite failing tests merely to make the test suite pass unless the user explicitly approves that change. If a test is obsolete or incorrect, explain why and ask before removing or weakening it.

## 8. Stop rules

Stop and respond when the requested goal is met and the narrowest useful validation has passed.

Do not continue modifying code for optional polish, unrelated cleanup, broader refactors, extra abstractions, or speculative future requirements.

Stop and ask only when missing information materially affects correctness, data safety, security, public API behavior, user-visible behavior, or irreversible work.

If blocked by missing dependencies, failing environment setup, unavailable credentials, unclear requirements, or external service access, report the blocker and the next best path.

If tests fail for reasons unrelated to your change, do not fix unrelated failures unless asked. Report the failure and explain why it appears unrelated.

## 9. Final response format

For completed coding tasks, respond concisely with:

- What changed
- How it was verified
- Any assumptions, skipped checks, blockers, or follow-up risks

Do not include large code dumps unless requested.

Do not over-explain implementation details that are obvious from the diff.

If no files were changed, clearly state that.

## 10. Project commands

Current repository state: documentation-first frontend planning repository. Application source code and package scripts are not present yet.

- Install: not available yet
- Dev: not available yet
- Test: not available yet
- Targeted test: not available yet
- Typecheck: not available yet
- Lint: not available yet
- Build: not available yet

When the app workspace is added later, update this section to the actual package manager and script names. Until then, validate documentation changes with targeted file inspection.

## 11. Project-specific notes

Current repository conventions based on the existing files:

- Package manager: not defined yet
- Runtime: browser frontend planned; runtime not committed yet
- Framework: planned React + TypeScript + Vite frontend, as documented in `docs/specs/`
- Test framework: planned Vitest, React Testing Library, MSW, and Playwright
- Formatting: follow existing Markdown style for docs; no formatter config committed yet
- Linting: not configured yet
- Main source directory: not committed yet; planned `src/`
- Main test directory: not committed yet
- Environment variables: planned `VITE_API_BASE_URL` and `VITE_SOCKET_URL`
- Deployment/build target: frontend web app, target not committed yet

This repository currently contains planning and specification documents. Prefer documentation changes unless the user explicitly asks to scaffold or implement application code.

Follow existing local conventions over generic preferences.
