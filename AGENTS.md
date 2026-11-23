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

## Project Roadmap

| Day | Focus | Deliverables |
|-----|-------|------------|
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
2. **Binary Files**: Skipped - focus on text diffs only. Binary files and files without a patch are returned in `analysis.unscannedFiles` and shown as "Not scanned" in the UI, never as clean. Path-based rules (e.g. R004 on a deleted migration) still run on them, and their findings still show
3. **Severity, not scores**: Each rule (R001–R016) has a fixed severity (low/medium/high/critical). A file's severity and the overall PR label are the highest severity among their findings. The numeric risk score and confidence calculation were removed as arbitrary; whether scoring adds value will be revisited later.
4. **Frontend Display**: Color-coded severity groups (critical/high/medium/low), no raw scores shown to users
5. **Testing Strategy**: Full test coverage expected in Day 2+, integration tests for UI
6. **Language Scope**: JavaScript/TypeScript only for source-code analysis; language-agnostic config, infrastructure, migration, dependency and secret checks still apply to all files (see Language Scope)
7. **Rule changes**: R003 flags migrations that are added as well as modified; R004 covers deleted migrations. R005 runs only on recognised dependency manifests (package.json, go.mod, Cargo.toml, requirements*.txt, etc., by basename) and inspects their patch for packages added, removed or upgraded. R008 (>500 lines) is not implemented but stays in the rule table
8. **Severity display**: Critical is its own level in bright red; high is orange, medium yellow, low sky, none grey. In per-file counts, "None" means scanned with no findings; unscanned files without findings appear only in a separate "Not scanned" note
9. **PR state**: `open`, `closed` or `merged`. GitHub reports merged PRs as `closed` plus a `merged` flag; the client maps that to `merged`
10. **API contract**: The frontend uses only `GET /api/pr?url=<PR URL>` (metadata) and `GET /api/pr/analysis?url=<PR URL>` (changed files, summary, findings). There is no summary endpoint. Errors return `{ error }` with 400, 401, 403, 404, 405, 429 or 500
11. **Guarded client fetches**: All frontend requests go through `lib/api.ts`, which uses an endpoint allowlist, a 20s timeout, cancellation of superseded requests, a JSON content-type check, and Zod validation of the response shape (`lib/schemas/`) before the UI uses it

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
