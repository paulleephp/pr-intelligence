# PR Intelligence

## The problem:

Reviewing a pull request requires understanding of what changed, which parts of the codebase are affected, what tests are relevant, and whether there are potential risks. This is especially challenging if the codebase has long history and/or a lot of inner dependencies.

This tool automates the initial investigation by fetching PR metadata, analyzing the diff with deterministic rule-based detection, identifying potentially affected modules, determining which tests might be relevant, and generating a structured review report with findings and recommendations.

## Language Scope

Source-code analysis covers **JavaScript and TypeScript only** (`.js`, `.jsx`, `.mjs`, `.cjs`, `.ts`, `.tsx`). Covering every programming language isn't realistic, so language-specific rules are written for JS/TS syntax and aren't expected to work for other languages. These include code-pattern detectors (removed auth checks, unsafe navigation, dangerous code execution, crypto and password hashing) and the planned impact analysis (Sprint 4).

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

## Scope Breakdown

### Delivered

**Analysis engine (Sprint 2):**
- Diff parser for unified Git diffs (TypeScript/Node.js)
- File categorization using labels with fallback categories
- Change statistics calculation (line count, file additions/deletions)
- Sensitive file detection via path patterns and rules
- Rule-based severity: each rule has a fixed severity, and the highest severity found is the overall PR label (no numeric score)

**Frontend (Sprint 2):**
- PR Summary Component: File count, severity distribution, issue mentions
- Changed Files Table: File count/type/status, severity indicators (color-coded)
- Risk Indicator Component: Critical/high/medium/low severity groupings
- Dashboard: Severity file counts + aggregate statistics

**Cleanup and additions (Sprint 3):**
- Changed files fetched across all pages (up to GitHub's 3,000-file limit)
- Hand-written response guards replaced with Zod schemas (`lib/schemas/`)
- R015 narrowed to unsafe `window.location` navigation, raised to high
- R005 regression tests for non-manifest JSON files
- Affected Areas section: changed files grouped by area, with each file's severity in that area

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
| Database | PostgreSQL via Supabase (planned for Sprint 4, not set up yet) |
| DB client / ORM | To be decided in Sprint 4 (Supabase client or Prisma) |
| Testing | Vitest (Playwright planned) |
| CI/CD | GitHub Actions (planned, no workflows yet) |

### Core Principles

1. **Deterministic First**: All detection, parsing, and severity assignment use explicit rules. LLM is reserved only for higher-level reasoning tasks later in the pipeline.
2. **Label-Based Categorization**: Files categorized by labels with fallback categories (frontend, backend, tests, docs) when no label exists
3. **Progressive Enhancement**: Start simple - line/file counts, then add complexity incrementally
4. **Agent-Driven Development**: Tasks assigned to coder, tester, and reviewer roles with clear acceptance criteria

### Future Phases

**Sprint 4 (planned):**
- Impact analysis with GitHub code search: files that import the changed files, and suggested tests among them. No repository source downloads.
- LLM review of the deterministic findings, with bring-your-own-key, token budgeting and validated structured output
- Database (Supabase) to cache AI results

**Sprint 5 (tentative):**
- Review workflow that runs stages in order, saves each stage's result, and retries from the failed stage

**Later:**
- Complexity increase detection and change metrics
- Semantic understanding of code changes through LLM reasoning

## Known Limitations

### Languages: JavaScript and TypeScript only

Decided 2026-11-22: the rules target JavaScript and TypeScript projects. Supporting other languages (Python, PHP, Go, Ruby, Rust, Java/Kotlin, etc.) is out of scope.

- **Still in scope:** the non-code files a JS/TS project normally contains, such as `package.json`, `.env*`, YAML, shell scripts, `.envrc`, Dockerfiles, Terraform and CI workflows.
- **Existing checks for other languages aren't maintained.** Some are already in place, for example Python, Go, Rust, Ruby and Gradle dependency manifests (R005), Alembic migrations (R003/R004) and `os.environ` in secret detection (R007). They still run for now, but gaps in them won't be fixed. If one of them ever needs its tests changed, for any reason, the check and its tests are removed instead of updated.
- **Behaviour is designed around JS/TS rules.** Where languages disagree (for example, whether `"$name"` inside double quotes reads a variable), the JS/TS meaning wins.

### Changed files capped at 3,000 per PR

`fetchChangedFiles` in `lib/github/client.ts` pages through `pulls.listFiles` 100 files at a time, but GitHub returns at most 3,000 files per PR. Files beyond that aren't analyzed, and the report doesn't warn that the list was cut short.

### Unsafe navigation (R015)

R015 matches text on changed lines only, so:

1. **It can't tell whether a value was validated.** Any dynamic value assigned to `window.location` is flagged, even if it was checked against an allowlist elsewhere.
2. **A bare `location = url` isn't flagged.** Only `window.`/`document.`/`self.`/`top.`/`parent.`/`globalThis.` prefixed locations, `location.href =`, and `location.assign()`/`location.replace()` are matched.

### Dependency detection (R005)

R005 only checks files whose basename is a recognised dependency manifest (`package.json`, `go.mod`, `Cargo.toml`, `Gemfile`, `build.gradle(.kts)`, `pyproject.toml`, `Pipfile`, `requirements*.txt` / `requirements*.in`). Known gaps:

1. **Requirements files kept in a folder aren't detected.** Files such as `requirements/base.txt` or `requirements/dev.txt` aren't recognised, because only the filename is checked, not the folder.
2. **Some ecosystems aren't supported.** `setup.py`, `setup.cfg`, `composer.json` (PHP) and `pom.xml` (Maven) aren't in the manifest list. The detector also has no line patterns for their dependency formats, so supporting them needs both a filename entry and new patterns.

Both gaps are in non-JS ecosystems, so they're out of scope (see "Languages: JavaScript and TypeScript only" above) and won't be fixed.

Lockfiles (`package-lock.json`, etc.) are excluded on purpose.

### Secret names written in camelCase (R007)

Secret detection was built around `snake_case`, `SCREAMING_SNAKE` and `dot.case` names. camelCase names are handled inconsistently, in both directions:

1. **Some real camelCase secrets are missed.** The named rules and the catch-all `*_secret` rule need a `_` or `.` between words, so `githubToken`, `clientSecret`, `jwtSecret`, `stripeSecretKey` and `slackBotToken` aren't flagged. `github_token`, `client_secret` and the rest are. (`apiKey` and `dbPassword` *are* flagged, because those scans match a substring.)
2. **camelCase placeholders aren't recognised.** The test/mock/demo/example/todo/fixme filter needs the word to stand alone, so `mock_api_key = "…"` and `test_password = "…"` are skipped, but `mockApiKey = "…"` and `testPassword = "…"` are flagged.

Token values with a known format (`ghp_…`, `AKIA…`, `xoxb-…`, `sk_live_…`, private key headers) are detected whatever the variable is called.

Planned fix: split names on camelCase boundaries as well as `_` and `.` before matching. This touches every name rule and the placeholder filter, so it's deferred to a later sprint.

## Project Roadmap

Sprint specs and task briefs live in `planning/`.

| Sprint | Focus | Status |
|--------|-------|--------|
| **1** | Foundation: Next.js app, repo structure, Octokit integration | Done |
| **2** | Diff parser, file categorization, change statistics, detection rules R001–R016, severity labels, summary/table/risk UI | Done |
| **3** | Cleanup: changed-file pagination, Zod validation, R015 narrowed to unsafe `window.location` navigation, R005 regression tests, Affected Areas section | Done |
| **4** | Impact analysis via GitHub code search (affected files, suggested tests); LLM review with bring-your-own-key; database (Supabase) | Planned (`planning/SPRINT4.md`) |
| **5** | Review workflow: staged execution, retry from the failed stage, execution history | Tentative draft (`planning/SPRINT5.md`) |

## Acceptance Criteria

### Backend
- Coder: Successfully build diff analysis service with deterministic rule-based detection
- Tester: Comprehensive unit tests covering all detection rules and severity aggregation logic
- Reviewer: Code review against CODER.md coding standards and Guide.md best practices

### Frontend
- Coder: Implement React + Tailwind components for PR summary, tables, and indicators
- Tester: Unit tests verifying component rendering logic with integration tests for UI accuracy

## Key Decisions Made

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
14. **LLM keys (planned)**: LLM access will be bring-your-own-key. The user's key is sent per request and never stored, on the server, in the database or in logs
