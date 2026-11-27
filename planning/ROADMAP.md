# Roadmap

Sprint progress and plans. Specs and task briefs for each sprint live next to this file (`SPRINT<n>.md`, `SPRINT<n>-TASKS.md`). The project's README describes what the app does today; this file describes how it got there and what's next.

## Sprints

| Sprint | Focus | Status |
|--------|-------|--------|
| **1** | Foundation: Next.js app, repo structure, Octokit integration | Done |
| **2** | Diff parser, file categorization, change statistics, detection rules R001–R016, severity labels, summary/table/risk UI | Done |
| **3** | Cleanup: changed-file pagination, Zod validation, R015 narrowed to unsafe `window.location` navigation, R005 regression tests, Affected Areas section | Done |
| **4** | Blast-radius metrics (file count, directory spread, test-to-code ratio); R018 script permission change; line numbers and IDs on findings; R001/R014/R011 path matching | Done and released 2026-11-25 (`SPRINT4.md`) |
| **5** | Polish: R007 secret detection false alarms and slowdowns, app subtitle, screenshots, Pages site | In progress (`POLISH-TASKS.md`) |
| **6** | Optional AI assessment of flagged JS/TS findings, bring your own key (Claude only), CI workflow first, no database | Planned (`SPRINT6.md`) |
| **7** | Saved AI results (draft, not scoped) | Draft (`SPRINT7.md`) |
| **8** | Release readiness: LLM response validation, docs, demos of failure cases, v1.0.0 (draft, not scoped) | Draft (`SPRINT8.md`) |
| Later | See "Later" below | Unscheduled |

## Delivered

**Sprint 2: analysis engine**
- Diff parser for unified Git diffs
- File categorization using labels with fallback categories
- Change statistics (line counts, files added/removed/modified)
- Sensitive file detection via path patterns and rules
- Rule-based severity: each rule has a fixed severity, and the highest severity found is the overall PR label (no numeric score)

**Sprint 2: frontend**
- PR summary: file count, severity distribution
- Changed files table: type, status, color-coded severity
- Risk indicator: critical/high/medium/low groupings
- Severity file counts and aggregate statistics

**Sprint 3: cleanup and additions**
- Changed files fetched across all pages (up to GitHub's 3,000-file limit)
- Hand-written response guards replaced with Zod schemas (`lib/schemas/`)
- R015 narrowed to unsafe `window.location` navigation, raised to high
- R005 regression tests for non-manifest JSON files
- Affected Areas section: changed files grouped by area, with each file's severity in that area

**Sprint 4: blast radius and rules**
- Blast-radius card: file count (excluding lockfiles, snapshots, assets and content-free files), directory spread across top-level modules, and a separate test-to-code signal, from the changed-file list with no extra GitHub requests
- Line numbers and stable IDs on findings (the basis for Sprint 6's AI verdicts)
- R018: a script whose only change is likely a permission change (e.g. `chmod +x`)
- R001/R014 keyword matching extended to camelCase names and trailing digits, `cryptography` added; R011 covers `.tfvars`, `.tf.json` and Helm charts under `charts/<name>/`
- `npm run check` (Biome lint, formatting and import order) with the codebase formatted to pass it; rule tests for R001, R011, R012, R014 and R018
- Dropped: R017 (exported signature changed), since TypeScript's type check already catches broken callers

## Planned

**Sprint 5: polish** (`POLISH-TASKS.md`)
- R007 (secrets): only keyword names assigned a literal are flagged (P1, done); narrower `ssh` keyword (P2); only the first 300 characters of a line are scanned, plus a JWT value rule (P5); named rules check the value (P6); Go `name type =` form dropped (P8); camelCase names matched (P9); the secret patterns commented and split by topic (P7)
- App subtitle no longer claims AI or test suggestions (P3, done); new screenshots (P4)
- GitHub Pages site, served from main `/docs` (hotfixes #36, #37, #39)

**Sprint 6** (`SPRINT6.md`)
- First: CI workflow (carried from Sprint 4): check, type check and tests on every PR
- Optional AI assessment, bring your own key: Claude only, with the user's own Anthropic API key. Flagged JS/TS lines for findings that need judgment (auth checks, crypto, password hashing, unsafe sinks) are sent for a verdict, public repositories only, capped at 10,000 characters. Only JS/TS source code is ever sent; secrets, schema, production config, CI and infrastructure files never are, for security reasons. No database: nothing is cached

## Later

- Verdict cache (Supabase): see the Sprint 7 draft
- Download the assessment JSON when it's over the 10,000-character send limit (up to 30,000 characters)
- Review workflow that runs stages in order and retries from the failed stage (`LATER-REVIEW-WORKFLOW.md`, outdated draft)
- Fix camelCase secret names (R007; see `docs/KNOWN-LIMITATIONS.md`)
- R001/R014: match keywords inside names (`useAuth.ts`), all-caps acronyms (`SSOConfig.ts`) and `AccessControl`; R011: `*.tfvars.json` (see `docs/KNOWN-LIMITATIONS.md`)
- Complexity increase detection and change metrics
- UI backlog candidates for a lighter sprint: `PENDING_NEW_FEATURES.md`

## Planned decisions (not built yet)

These are also in AGENTS.md "Key Decisions" (14 and 16). They move to `docs/DESIGN-DECISIONS.md` once they ship.

- **LLM keys:** AI assessment uses Claude only, with the user's own Anthropic API key (bring your own key). No other AI platforms are planned. The app has no AI key of its own. The key is sent per request and never stored, on the server, in a database, in the browser or in logs.
- **AI assessment is optional and selective:** deterministic results stand on their own. Only findings where a rule can locate a change but not judge it (R002, R012, R013, R015, R016) are sent, as flagged JS/TS lines with context. Secrets, database schema, production configuration, CI workflows and infrastructure files (R007, R003, R004, R009, R006, R011) are never sent, for security reasons. The AI adds a verdict next to a finding; it never changes the rule's severity.

## Development process

Work is split into tasks for coder, tester and reviewer agents, each with acceptance criteria (see AGENTS.md).

- **Backend:** the coder builds the analysis with deterministic rule-based detection; the tester covers every detection rule and the severity aggregation with unit tests; the reviewer checks against CODER.md and GUIDE.md.
- **Frontend:** the coder builds React + Tailwind components; the tester covers rendering logic with unit and integration tests.
