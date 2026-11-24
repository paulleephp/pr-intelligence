# PR Intelligence

## The problem

Reviewing a pull request requires understanding of what changed, which parts of the codebase are affected, what tests are relevant, and whether there are potential risks. This is especially challenging if the codebase has long history and/or a lot of inner dependencies.

This tool automates the initial investigation. Paste a GitHub PR URL and it fetches the PR, analyzes the diff with deterministic rules (no AI), and shows what changed, which areas it touches, and which changes deserve a closer look, with a severity for each finding.

## Features

- **PR overview:** title, author, number and state (open, merged, closed), linked to GitHub, plus change statistics: files changed, lines added and removed, files added, modified and removed.
- **Overall severity:** the PR gets the highest severity among its findings (critical, high, medium, low or none), with a distribution of findings and files by severity.
- **Changed files table:** every changed file with its type, status and severity. Binary files and files without a diff are marked "Not scanned", never shown as clean.
- **Affected Areas:** changed files grouped by area (Auth, Database, CI/CD, Configuration, Tests, Infrastructure, Security), with each file's severity within that area.
- **Findings by severity:** findings grouped into critical, high, medium and low, each showing the file and what was detected.

## Rules

Each rule has a fixed severity. A file's severity, and the PR's, is the highest severity among its findings. There is no numeric score.

| Rule | Flags | Severity | Applies to |
|------|-------|----------|------------|
| R001 | Authentication files modified | medium | Any file (path) |
| R002 | Authentication check potentially removed | high | JS/TS |
| R003 | Database migration added or modified | medium | Any file (path) |
| R004 | Database migration deleted | high | Any file (path) |
| R005 | Dependencies added, removed or upgraded | low | Dependency manifests |
| R006 | CI/CD workflow modified | medium | Any file (path) |
| R007 | Private key, API key or password pattern | critical | Any text file |
| R008 | More than 500 lines changed | medium | Not implemented |
| R009 | Production configuration modified | high | Any file |
| R010 | Test files removed | medium | Any file (path) |
| R011 | Infrastructure changes | medium | Any file (path) |
| R012 | Crypto algorithm changed | high | JS/TS |
| R013 | Password hashing changed | high | JS/TS |
| R014 | Security-sensitive path modified | high | Any file (path) |
| R015 | Unsafe navigation: `window.location` assigned from a dynamic value | high | JS/TS |
| R016 | Dangerous code execution or DOM sink introduced | high | JS/TS |

Rules and severities are defined in `lib/diff/util/risk-scoring.ts`.

## Language Scope

Source-code analysis covers **JavaScript and TypeScript only** (`.js`, `.jsx`, `.mjs`, `.cjs`, `.ts`, `.tsx`, `.mts`, `.cts`). Covering every programming language isn't realistic, so language-specific rules are written for JS/TS syntax and aren't expected to work for other languages. These include code-pattern detectors (removed auth checks, unsafe navigation, dangerous code execution, crypto and password hashing).

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

## Tech Stack

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
| Testing | Vitest |


## Core Principles

1. **Deterministic first:** all detection, parsing and severity assignment use explicit rules. Results are reproducible and don't depend on an AI's interpretation.
2. **Label-based categorization:** files are categorized by labels, with fallback categories (frontend, backend, tests, docs) when no label exists.
3. **Severity, not scores:** each rule has a fixed severity, and findings are shown as labelled severity groups. A numeric risk score was tried and removed as arbitrary.

## Known Limitations

### Languages: JavaScript and TypeScript only

The rules target JavaScript and TypeScript projects. Supporting other languages (Python, PHP, Go, Ruby, Rust, Java/Kotlin, etc.) is out of scope.

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

Not fixed yet. The fix (splitting names on camelCase boundaries as well as `_` and `.`) touches every name rule and the placeholder filter.

## Design Decisions

- **Diffs come from the Git patch** GitHub returns for each changed file. Repository source is never downloaded.
- **Binary files aren't scanned.** They're listed as "Not scanned", never as clean. Path-based rules (e.g. R004 on a deleted migration) still run on them.
- **Severity display:** critical is its own level in bright red; high is orange, medium yellow, low sky, none grey. "None" means scanned with no findings.
- **PR state:** `open`, `closed` or `merged`. GitHub reports merged PRs as `closed` plus a `merged` flag; the app shows them as merged.
- **R003 and R004:** R003 flags migrations that are added as well as modified; R004 covers deleted migrations.
- **R005** runs only on recognised dependency manifests (by filename) and inspects their patch for packages added, removed or upgraded. Lockfiles are excluded.
- **R015** flags only writes to `window.location` (assignment, `.href =`, `.assign()`, `.replace()`) whose value isn't a plain relative or `http(s)` string literal, because a `javascript:` URL can run script in the user's browser. Code-execution sinks such as `eval()` are R016.
- **Affected Areas:** a file can appear in more than one area. Its badge in an area shows the highest severity among that area's findings, not the file's overall severity.
- **No impact analysis:** the app doesn't try to find other files affected by a PR or suggest tests outside it. GitHub code search is rate-limited to about 10 searches per minute, and downloading or cloning the repository doesn't fit the app's serverless hosting.
- **API:** `GET /api/pr?url=<PR URL>` returns PR metadata and `GET /api/pr/analysis?url=<PR URL>` returns changed files, summary and findings. Errors return `{ error }` with an HTTP status. Responses are validated with Zod before the UI uses them.

## Contributing

Coding standards: `CODER.md` and `STYLEGUIDE.md`. Testing: `TESTING.md`. Work is planned in sprints; plans and progress are in `planning/ROADMAP.md`.
