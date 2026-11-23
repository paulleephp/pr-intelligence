# Project Structure

Shared types are located in `types/` (UI and frontend-facing) and `lib/types/` (analysis engine and GitHub).

## Request flow

```
app/page.tsx (Server Component)
  └─ PRAnalyzer (client boundary: URL state + usePRReport)
       ├─ PRForm
       └─ PRResults
            ├─ PRSummary
            ├─ PRDashboard
            ├─ AffectedAreas
            ├─ RiskIndicator
            └─ ChangedFilesTable

usePRReport → lib/api.ts (guarded fetch) → GET /api/pr, GET /api/pr/analysis
  → lib/github (Octokit) → lib/diff (analysis engine) → JSON response
  → lib/schemas (Zod shape validation) → components
```

## app/

| Path | Purpose |
|------|---------|
| `page.tsx` | Home page. Server Component that renders the hero and `PRAnalyzer` |
| `dashboard/page.tsx` | Placeholder; the dashboard currently renders on the home page |
| `api/pr/route.ts` | `GET /api/pr?url=` returns PR metadata |
| `api/pr/analysis/route.ts` | `GET /api/pr/analysis?url=` returns changed files, change summary and analysis |
| `api/_lib/request.ts` | Reads and validates the `url` query param |
| `api/_lib/github/response.ts` | Maps service results to HTTP responses (200/401/403/404/429/500) |

## app/components/

| Path | Purpose |
|------|---------|
| `PRAnalyzer.tsx` | The only `"use client"` boundary. Holds the URL state and calls `usePRReport` |
| `PRForm.tsx` | URL input and submit button |
| `PRResults.tsx` | Loading skeleton, then the four report sections |
| `PRSummary.tsx` | Title, author, state, overall risk, stat tiles, severity distribution |
| `PRDashboard.tsx` | Files by severity, line-change stats, "Not scanned" note |
| `AffectedAreas.tsx` | Files grouped by area (Auth, Database, CI/CD, …) from area rule findings; hidden when none |
| `RiskIndicator.tsx` | Findings grouped by severity, then by rule, expandable to files and messages |
| `ChangedFilesTable.tsx` | Per-file type, status, lines and severity, sorted by severity |
| `severity/` | `SeverityBadge`, `SeverityBar`, `FileSeverityCell` |
| `report/StatTile.tsx` | Label and value tile |
| `icons/` | `SpinnerIcon` |
| `_lib/severity.ts` | Severity order, ranks and colour styles |
| `_lib/file-display.ts` | Status, file-type, PR-state and "Not scanned" display constants |
| `_lib/areas.ts` | Rule-to-area mapping (`AREA_BY_RULE`) and `buildAffectedAreas` |
| `_lib/change-summary.ts` | `countChangedFiles` and unchanged-file helpers |
| `_lib/use-pr-report.ts` | Fetches both endpoints in parallel and cancels superseded requests |
| `__tests__/` | Component tests (owned by the tester) |

## lib/

| Path | Purpose |
|------|---------|
| `api.ts` | Guarded client fetch: endpoint allowlist, timeout, cancellation, JSON check |
| `schemas/` | Zod schemas for API responses, error body and the `url` query param; each tied to its TS type with `satisfies` |
| `api-constants.ts` | Endpoints, timeout and client error messages |
| `constants.ts`, `response.ts`, `url.ts` | HTTP statuses, response helpers, PR URL parsing |
| `github/` | Octokit client, error mapping, metadata and changed-file fetching |
| `diff/core.ts` | Entry point: change summary and `analyzeDiff` (skips binary files into `unscannedFiles`) |
| `diff/secret.ts` | R007 secret detection |
| `diff/categorize.ts` | Path-based rules (R001, R003, R004, R006, R009, R010, R011, R014) |
| `diff/code.ts` | Added-line code rules (R002, R009, R012, R013, R015, R016) |
| `diff/dependency.ts` | R005 patch-based dependency change detection |
| `diff/file-type.ts` | Classifies files as frontend, backend, tests, docs or config |
| `diff/aggregator.ts` | Flattens findings into severity counts, rule counts and per-file severity |
| `diff/util/risk-scoring.ts` | Rule table (R001–R016) with condition and severity |
| `diff/util/parse-patch.ts`, `is-binary.ts` | Unified diff parsing and binary detection |
| `diff/constants/` | Path, pattern, dependency, secret and file-type constants |
| `types/` | Engine and GitHub types |

## types/

| Path | Purpose |
|------|---------|
| `pr/metdata.ts` | Frontend-facing PR metadata, `ChangedFile`, `PRStatus` |
| `ui/report.ts` | Report state, severity display types, table row type |
| `ui/components.ts` | Component prop types |
| `ui/api.ts` | Client API result, endpoint and guard types |
