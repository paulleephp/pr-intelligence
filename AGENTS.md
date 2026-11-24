# PR Intelligence

## The problem:

Reviewing a pull request requires understanding of what changed, which parts of the codebase are affected, what tests are relevant, and whether there are potential risks. This is especially challenging if the codebase has long history and/or a lot of inner dependencies.

This tool automates the initial investigation by fetching PR metadata, analyzing the diff with deterministic rule-based detection, identifying potentially affected modules, determining which tests might be relevant, and generating a structured review report with findings and recommendations.

## Language Scope

Source-code analysis covers **JavaScript and TypeScript only** (`.js`, `.jsx`, `.mjs`, `.cjs`, `.ts`, `.tsx`). Covering every programming language isn't realistic, so language-specific rules are written for JS/TS syntax and aren't expected to work for other languages. These include code-pattern detectors (removed auth checks, unsafe navigation, dangerous code execution, crypto and password hashing) and the test-to-code ratio in the planned blast-radius metrics (Sprint 4).

Files that aren't tied to one language are still analyzed:

- **Configuration and infrastructure:** `.env*`, `Dockerfile`, `docker-compose*`, Terraform, Kubernetes, Helm
- **CI/CD:** `.github/workflows/**`
- **Database:** migrations and schema files
- **Dependency manifests:** `package.json` (R005 also checks other ecosystems' manifests, but those checks aren't maintained)
- **Secrets:** keys, tokens and passwords added to any text file

Files in other languages still count toward file and line statistics and path-based checks, such as a sensitive `auth/` folder.

## Architecture

PR URL → GitHub client (Octokit) → diff parser and deterministic rules engine → Next.js route handlers → React frontend (responses validated with Zod)

```
PR Intelligence System Flow:
┌─────────────────────────────────────────┐
│            PR Input                      │
└──────────────┬──────────────────────────┘
                │
        ┌───────▼──────────┐
        │  Fetch Metadata   │
        │ (Octokit/GitHub)  │
        └───────┬───────────┘
                │
        ┌───────▼──────────┐
        │ Diff Parser       │
        │ (Unified Git Diffs│
        │ TypeScript/Node.js)│
        └───────┬───────────┘
                │
        ┌───────▼──────────┐
        │ File Categorizer  │
        │ (Labels + Fallback)│
        └───────┬───────────┘
                │
        ┌───────▼──────────┐
        │ Statistics Calc   │
        │ (Line/File Counts)│
        └───────┬───────────┘
                │
        ┌───────▼──────────┐
        │  Sensitive Detection  │
        │ (Path Patterns + Rules)│
        └───────┬───────────┘
                │
        ┌───────▼──────────┐
        │ Severity Rules     │
        │ (R001–R016, no LLM)│
        │ Highest = PR label │
        └───────┬───────────┘
                │
        ┌───────▼──────────┐
        │ API Service       │
        │ (GET /api/pr,     │
        │ /api/pr/analysis)  │
        └───────┬───────────┘
                │
        ┌───────▼──────────┐
        │ React Frontend    │
        │ (Summary + Tables)│
        │ (Risk Indicators)  │
        │ (Affected Areas)  │
        └───────────────────┘

Deterministic vs LLM: The deterministic engine handles everything except tasks requiring human reasoning. Rules-based detection and severity assignment are fully automated, not dependent on LLM interpretation.

```

### Tech Stack

| Component | Technology |
|-----------|------------|
| Frontend Framework | Next.js App Router |
| UI Library | React + TypeScript |
| Styling | Tailwind CSS |
| Backend Runtime | Node.js |
| API Layer | Next.js Route Handlers |
| Analysis Engine | TypeScript |
| GitHub Integration | Octokit |
| Severity Rules | Deterministic rule table (`lib/diff/util/risk-scoring.ts`) |
| Validation | Zod v4 schemas (`lib/schemas/`) for API responses and the `url` query param |
| Database | None yet. A Supabase verdict cache is deferred until after Sprint 5 |
| DB client / ORM | To be decided if the cache is picked up (recommended: Supabase JS client) |
| Testing | Vitest (Playwright planned) |
| CI/CD | GitHub Actions (planned, no workflows yet) |

### Core Principles

1. **Deterministic First**: All detection, parsing, and severity assignment use explicit rules. LLM is reserved only for higher-level reasoning tasks later in the pipeline.
2. **Label-Based Categorization**: Files categorized by labels with fallback categories (frontend, backend, tests, docs) when no label exists
3. **Progressive Enhancement**: Start simple - line/file counts, then add complexity incrementally
4. **Agent-Driven Development**: Tasks assigned to coder, tester, and reviewer roles with clear acceptance criteria

## Project Roadmap

Sprint status, delivered work and plans: `planning/ROADMAP.md`. Specs and task briefs: `planning/SPRINT<n>.md` and `planning/SPRINT<n>-TASKS.md`. Keep sprint and planning detail out of README.md; README is a reader-facing summary of what the app does today.

## Agent Workflow

Several agents work on this repo at the same time. Agents message each other by session name (= agent ID). The local `agents.yaml` (gitignored) holds the GitHub App settings and each agent's worktree.

| Agent | Role | Worktree |
|-------|------|----------|
| `mochi` | Orchestrator: scopes sprints, writes briefs, owns all `.md` docs, routes PRs to review | `~/repos/pr-intelligence` (main checkout, detached at `origin/sprint-<n>`) |
| `boba` | Backend coder | `~/repos/pr-intelligence-backend` |
| `takoyaki` | Frontend coder | `~/repos/pr-intelligence-frontend` |
| `kimchi` | Tester: owns all test files | `~/repos/pr-intelligence-test` |
| `banh-mi` | Reviewer: reviews PRs, comments only | its own worktree (see `agents.yaml`) |

### Workspaces
- Work only in your own worktree. Never check out a branch, stage or commit in another agent's folder, including the main checkout.
- Each worktree has its own `npm install` and its own copy of `.env.local`. If two agents run the dev server at once, use different ports.

### Branches
Git checks out a branch in only one worktree at a time, so:
- **No worktree keeps the sprint branch `sprint-<n>` checked out.** Work that only reads it, or adds commits on top of it, uses a detached HEAD at `origin/sprint-<n>`. `mochi` works this way in the main checkout and pushes doc commits with `git push origin HEAD:sprint-<n>`.
- **Each task branch is checked out only in its owner's worktree.** Two agents never share a branch; the tester's branch is separate from the coder's.
- **Start a task from the remote sprint branch:** `git fetch`, then `git switch -c sprint-<n>-t<task> origin/sprint-<n>` (e.g. `sprint-4-t8`). Never base a task on a local `sprint-<n>`; it may be stale.
- **Between tasks, park on a detached HEAD:** `git switch --detach origin/sprint-<n>`.
- **The reviewer** checks out PRs detached (`gh pr checkout <n> --detach`) or reviews from the PR diff.
- PRs target `sprint-<n>`. Before opening a PR, rebase onto the latest `sprint-<n>`.
- `sprint-<n>` → `staging` → `main` is merged by the user only. Agents never push to `staging` or `main`, and never merge PRs.
- `mochi` commits its own doc changes directly to `sprint-<n>`, without a PR.

### Identity
All agents push through one shared GitHub App, so GitHub shows the same bot for everyone. Identify yourself:
- **Commits:** author name = your agent ID (set per worktree: `git config extensions.worktreeConfig true`, then `git config --worktree user.name <id>`), and end the message with an `Agent: <id>` trailer.
- **PR titles:** `[<id>] S<n>-T<task>: <summary>`, e.g. `[boba] S4-T8: R018 script permission change`.
- **Reviews and PR comments:** start with `[<id>]`.

### Parallel or sequential
- **Parallel** only when tasks edit different files and neither needs the other's types.
- **Sequential** when a task uses another task's types or schema: start it after the first task's PR is merged into `sprint-<n>`, not from the unmerged branch.
- **Conflict-prone files:** `lib/diff/core.ts`, `lib/diff/util/risk-scoring.ts`, `lib/types/pr/metadata.ts`, `lib/schemas/pr-analysis.ts`. Parallel edits are allowed, but whichever PR merges second rebases and re-runs checks before review.
- Each brief states its dependencies; follow them.

### Hand-offs
1. The coder opens a PR and messages `mochi` with the link and any decision that goes beyond the spec.
2. `mochi` records spec decisions in the docs and sends the PR to `banh-mi`.
3. `banh-mi` reviews against the brief and spec, and works out fixes with the coder directly.
4. The user merges.
5. `kimchi` cuts a test branch from the updated `sprint-<n>` and writes the tests.

Only `mochi` edits `.md` files (README, AGENTS.md, planning, STYLEGUIDE). Other agents send doc changes to `mochi`. Only `kimchi` edits test files.

## Acceptance Criteria

### Backend
- Coder: Successfully build diff analysis service with deterministic rule-based detection
- Tester: Comprehensive unit tests covering all detection rules and severity aggregation logic
- Reviewer: Code review against CODER.md coding standards and Guide.md best practices

### Frontend
- Coder: Implement React + Tailwind components for PR summary, tables, and indicators
- Tester: Unit tests verifying component rendering logic with integration tests for UI accuracy

## Key Decisions Made

This list is the authoritative one, including planned decisions. README.md "Design Decisions" is a reader-facing summary of the shipped ones; update it when a shipped decision changes, and move a planned decision there once it ships.

1. **Diff Source**: parse git patch
2. **Binary Files**: Skipped - focus on text diffs only. Binary files and files without a patch are returned in `analysis.unscannedFiles` and shown as "Not scanned" in the UI, never as clean. Path-based rules (e.g. R004 on a deleted migration) still run on them, and their findings still show
3. **Severity, not scores**: Each rule (R001–R016) has a fixed severity (low/medium/high/critical). A file's severity and the overall PR label are the highest severity among their findings. The numeric risk score and confidence calculation were removed as arbitrary; whether scoring adds value will be revisited later.
4. **Frontend Display**: Color-coded severity groups (critical/high/medium/low), no raw scores shown to users
5. **Testing Strategy**: Full test coverage expected from Sprint 2 on, integration tests for UI
6. **Language Scope**: JavaScript/TypeScript only for source-code analysis; language-agnostic config, infrastructure, migration, dependency and secret checks still apply to all files (see Language Scope)
7. **Rule changes**: R003 flags migrations that are added as well as modified; R004 covers deleted migrations. R005 runs only on recognised dependency manifests (package.json, go.mod, Cargo.toml, requirements*.txt, etc., by basename) and inspects their patch for packages added, removed or upgraded. R008 (>500 lines) is not implemented but stays in the rule table
8. **Severity display**: Critical is its own level in bright red; high is orange, medium yellow, low sky, none grey. In per-file counts, "None" means scanned with no findings; unscanned files without findings appear only in a separate "Not scanned" note
9. **PR state**: `open`, `closed` or `merged`. GitHub reports merged PRs as `closed` plus a `merged` flag; the client maps that to `merged`
10. **API contract**: The frontend uses only `GET /api/pr?url=<PR URL>` (metadata) and `GET /api/pr/analysis?url=<PR URL>` (changed files, summary, findings). There is no summary endpoint. Errors return `{ error }` with 400, 401, 403, 404, 405, 429 or 500
11. **Guarded client fetches**: All frontend requests go through `lib/api.ts`, which uses an endpoint allowlist, a 20s timeout, cancellation of superseded requests, a JSON content-type check, and Zod validation of the response shape (`lib/schemas/`) before the UI uses it
12. **R015 scope**: R015 flags only writes to `window.location` (assignment, `.href =`, `.assign()`, `.replace()`) whose value isn't a plain relative or `http(s)` string literal, because a `javascript:` URL can run script in the user's browser. Severity is high. `fetch`/`axios`/HTTP calls are no longer flagged: whether a call is guarded (validation, timeout) can't be told from a diff. `eval()` and other code-execution sinks are R016
13. **Affected Areas**: Changed files are grouped by area (Auth, Database, CI/CD, Configuration, Tests, Infrastructure, Security) from their path-rule findings. A file can appear in more than one area. Its badge in an area shows the highest severity among that area's findings, not the file's overall severity, which the changed-files table already shows
14. **LLM keys (planned)**: AI assessment is bring your own key: the user chooses the provider (Claude by default; Gemini and ChatGPT later) and enters their own API key. The app has no AI key of its own. The key is sent per request and never stored, on the server, in the database, in the browser or in logs
15. **No impact analysis (affected files, suggested tests)**: GitHub code search was rejected for its rate limit (about 10 searches per minute), and downloading or cloning the repository doesn't fit Vercel functions (no `git`, memory and time limits). Sprint 4 measures blast radius from the changed-file list instead, with no extra GitHub requests
16. **AI assessment (planned) is optional and selective**: deterministic results stand on their own. Only findings where a rule can locate a change but not judge it (R002, R012, R013, R015, R016) are sent, as flagged JS/TS lines with context, public repositories only, capped at 10,000 characters per request. Only JS/TS source code is ever sent: for security reasons, secrets, database schema, production configuration, CI workflows and infrastructure files (R007, R003, R004, R009, R006, R011) are never sent, and neither is any hunk the secret detectors match. Deterministic findings (R001, R005, R010, R014) are deliberately not sent. The UI states both reasons. The AI adds a verdict next to a finding; it never changes the rule's severity

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
