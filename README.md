# PR Intelligence

## The problem:

Reviewing a pull request requires understanding of what changed, which parts of the codebase are affected, what tests are relevant, and whether there are potential risks. This is especially challenging if the codebase has long history and/or a lot of inner dependencies.

This tool automates the initial investigation by fetching PR metadata, analyzing the diff with deterministic rule-based detection, identifying potentially affected modules, determining which tests might be relevant, and generating a structured review report with findings and recommendations.

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
        │ Deterministic Risk │
        │ Scoring System     │
        │ (Rule-based, no LLM)│
        └───────┬───────────┘
                │
        ┌───────▼──────────┐
        │ API Service       │
        │ (GET /diff + Route│
        │ Handlers)          │
        └───────┬───────────┘
                │
        ┌───────▼──────────┐
        │ React Frontend    │
        │ (Summary + Tables)│
        │ (Risk Indicators)  │
        └───────────────────┘

Deterministic vs LLM: The deterministic engine handles everything except tasks requiring human reasoning. Rules-based detection and risk scoring are fully automated, not dependent on LLM interpretation.

```

## Scope Breakdown

### Day 2 Deliverables

**Backend Analysis Engine:**
- Diff parser for unified Git diffs (TypeScript/Node.js)
- File categorization using labels with fallback categories
- Change statistics calculation (line count, file additions/deletions)
- Sensitive file detection via path patterns and rules
- Deterministic risk scoring (rule-based, highest severity as overall PR label)

**Frontend Display Layer:**
- PR Summary Component: File count, severity distribution, issue mentions
- Changed Files Table: File count/type/status, severity indicators (color-coded)
- Risk Indicator Component: High/medium/low severity groupings
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
| Risk Scoring | Deterministic Rules (TypeScript) |
| Validation | Zod |
| Database | PostgreSQL |
| ORM | Prisma |
| Testing | Vitest + Playwright |
| CI/CD | GitHub Actions |

### Core Principles

1. **Deterministic First**: All detection, parsing, and risk scoring use explicit rules. LLM is reserved only for higher-level reasoning tasks later in the pipeline.
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

## Project Roadmap

| Day | Focus | Deliverables |
|-----|-------|--------------|
| **Day 1** | Foundation setup, architecture design, GitHub integration scaffolding | Repo structure, Next.js + Node.js services, Octokit integration |
| **Day 2** | Diff analysis engine, deterministic rules, basic frontend display | Diff parser, file categorization, risk scoring, summary tables |
| **Day 3+** | LLM integration, impact analysis, comprehensive testing | Module effect mapping, test relevance detection, review generation |

## Acceptance Criteria

### Backend
- Coder: Successfully build diff analysis service with deterministic rule-based detection
- Tester: Comprehensive unit tests covering all detection rules and risk scoring logic
- Reviewer: Code review against CODER.md coding standards and Guide.md best practices

### Frontend
- Coder: Implement React + Tailwind components for PR summary, tables, and indicators
- Tester: Unit tests verifying component rendering logic with integration tests for UI accuracy

## Key Decisions Made

1. **Diff Source**: Unified Git diffs only (smaller parsing complexity)
2. **Binary Files**: Skipped - focus on text diffs only
3. **Risk Scoring**: Deterministic rules-based system, highest severity as overall PR label
4. **Frontend Display**: Color-coded severity groups (high/medium/low), no raw scores for users
5. **Testing Strategy**: Full test coverage expected in Day 2+, integration tests for UI
