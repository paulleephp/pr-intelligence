# PR Intelligence

## The problem:

Reviewing a pull request requires understanding of what changed, which parts of the codebase are affected, what tests are relevant, and whether there are potential risks. This is especially challenging if the codebase has long history and/or a lot of inner dependencies.

This tool automates the initial investigation by fetching PR metadata, analyzing the diff with deterministic rule-based detection, identifying potentially affected modules, determining which tests might be relevant, and generating a structured review report with findings and recommendations.

## Language Scope

Source-code analysis covers **JavaScript and TypeScript only** (`.js`, `.jsx`, `.mjs`, `.cjs`, `.ts`, `.tsx`). Covering every programming language isn't realistic, so language-specific rules are written for JS/TS syntax and aren't expected to work for other languages. These include code-pattern detectors (removed auth checks, dangerous APIs, crypto and password hashing) and the planned import-based dependency mapping.

Files that aren't tied to one language are still analyzed:

- **Configuration and infrastructure:** `.env*`, `Dockerfile`, `docker-compose*`, Terraform, Kubernetes, Helm
- **CI/CD:** `.github/workflows/**`
- **Database:** migrations and schema files
- **Dependency manifests:** `package.json` (R005 also checks other ecosystems' manifests, but those checks aren't maintained)
- **Secrets:** keys, tokens and passwords added to any text file

Files in other languages still count toward file and line statistics and path-based checks, such as a sensitive `auth/` folder.

## Architecture

Review Orchestrator → Deterministic Rules Engine → Result Validator → Next.js Frontend → Node.js Analysis Service → GitHub API Client (Octokit)

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
        └───────────────────┘

Deterministic vs LLM: The deterministic engine handles everything except tasks requiring human reasoning. Rules-based detection and severity assignment are fully automated, not dependent on LLM interpretation.

```

## Scope Breakdown

### Day 2 Deliverables

**Backend Analysis Engine:**
- Diff parser for unified Git diffs (TypeScript/Node.js)
- File categorization using labels with fallback categories
- Change statistics calculation (line count, file additions/deletions)
- Sensitive file detection via path patterns and rules
- Rule-based severity: each rule has a fixed severity, and the highest severity found is the overall PR label (no numeric score)

**Frontend Display Layer:**
- PR Summary Component: File count, severity distribution, issue mentions
- Changed Files Table: File count/type/status, severity indicators (color-coded)
- Risk Indicator Component: Critical/high/medium/low severity groupings
- Dashboard: Severity file counts + aggregate statistics

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
| Database | PostgreSQL (planned, not set up yet) |
| ORM | Prisma (planned, not set up yet) |
| Testing | Vitest (Playwright planned) |
| CI/CD | GitHub Actions (planned, no workflows yet) |

### Core Principles

1. **Deterministic First**: All detection, parsing, and severity assignment use explicit rules. LLM is reserved only for higher-level reasoning tasks later in the pipeline.
2. **Label-Based Categorization**: Files categorized by labels with fallback categories (frontend, backend, tests, docs) when no label exists
3. **Progressive Enhancement**: Start simple - line/file counts, then add complexity incrementally
4. **Agent-Driven Development**: Tasks assigned to coder, tester, and reviewer roles with clear acceptance criteria

### Future Phases

**Phase 3+ (LLM Integration):**
- Use LLM for module impact analysis on affected codebases
- Determine which tests might be relevant based on changed code
- Generate comprehensive review reports with recommendations

**Later Stages:**
- Complexity increase detection and change metrics
- Advanced pattern matching beyond rule-based detection
- Semantic understanding of code changes through LLM reasoning

## Known Limitations

### Languages: JavaScript and TypeScript only

Decided 2026-11-22: the rules target JavaScript and TypeScript projects. Supporting other languages (Python, PHP, Go, Ruby, Rust, Java/Kotlin, etc.) is out of scope.

- **Still in scope:** the non-code files a JS/TS project normally contains, such as `package.json`, `.env*`, YAML, shell scripts, `.envrc`, Dockerfiles, Terraform and CI workflows.
- **Existing checks for other languages aren't maintained.** Some are already in place, for example Python, Go, Rust, Ruby and Gradle dependency manifests (R005), Alembic migrations (R003/R004) and `os.environ` in secret detection (R007). They still run for now, but gaps in them won't be fixed. If one of them ever needs its tests changed, for any reason, the check and its tests are removed instead of updated.
- **Behaviour is designed around JS/TS rules.** Where languages disagree (for example, whether `"$name"` inside double quotes reads a variable), the JS/TS meaning wins.

### Changed files capped at 3,000 per PR

`fetchChangedFiles` in `lib/github/client.ts` pages through `pulls.listFiles` 100 files at a time, but GitHub returns at most 3,000 files per PR. Files beyond that aren't analyzed, and the report doesn't warn that the list was cut short.

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

| Day | Focus | Deliverables |
|-----|-------|--------------|
| **Day 1** | Foundation setup, architecture design, GitHub integration scaffolding | Repo structure, Next.js + Node.js services, Octokit integration |
| **Day 2** | Diff analysis engine, deterministic rules, basic frontend display | Diff parser, file categorization, severity rules, summary tables |
| **Day 3+** | LLM integration, impact analysis, comprehensive testing | Module effect mapping, test relevance detection, review generation |

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
2. **Binary Files**: Skipped - focus on text diffs only
3. **Severity, not scores**: Each rule (R001–R016) has a fixed severity (low/medium/high/critical). A file's severity and the overall PR label are the highest severity among their findings. The numeric risk score and confidence calculation were removed as arbitrary; whether scoring adds value will be revisited later.
4. **Frontend Display**: Color-coded severity groups (critical/high/medium/low), no raw scores shown to users
5. **Testing Strategy**: Full test coverage expected in Day 2+, integration tests for UI
6. **Languages**: JavaScript and TypeScript only. Other languages are out of scope (see Language Scope and Known Limitations).
