# Roadmap

Sprint progress and plans. Specs and task briefs for each sprint live next to this file (`SPRINT<n>.md`, `SPRINT<n>-TASKS.md`). The project's README describes what the app does today; this file describes how it got there and what's next.

## Sprints

| Sprint | Focus | Status |
|--------|-------|--------|
| **1** | Foundation: Next.js app, repo structure, Octokit integration | Done |
| **2** | Diff parser, file categorization, change statistics, detection rules R001–R016, severity labels, summary/table/risk UI | Done |
| **3** | Cleanup: changed-file pagination, Zod validation, R015 narrowed to unsafe `window.location` navigation, R005 regression tests, Affected Areas section | Done |
| **4** | Blast-radius metrics (file count, directory spread, test-to-code ratio); R017 exported signature rule; R018 script permission change; line numbers and IDs on findings | Planned (`SPRINT4.md`) |
| **5** | Optional AI assessment of flagged JS/TS findings, bring your own key (Claude first), no database | Planned (`SPRINT5.md`) |
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

## Planned

**Sprint 4** (`SPRINT4.md`)
- Blast-radius metrics: file count (excluding lockfiles, snapshots and assets), directory spread across top-level modules, and test-to-code ratio, from the changed-file list with no extra GitHub requests
- R017: flags changed or removed exported function signatures in JS/TS
- R018: flags a script whose only change is likely a permission change (e.g. `chmod +x`)
- Line numbers and stable IDs on findings
- Optional: missing rule tests and a CI workflow

**Sprint 5** (`SPRINT5.md`)
- Optional AI assessment, bring your own key: Claude only, with the user's own Anthropic API key. Flagged JS/TS lines for findings that need judgment (auth checks, crypto, password hashing, unsafe sinks) are sent for a verdict, public repositories only, capped at 10,000 characters. Only JS/TS source code is ever sent; secrets, schema, production config, CI and infrastructure files never are, for security reasons. No database: nothing is cached

## Later

- Verdict cache (Supabase), reconsidered only once Sprints 4 and 5 are done
- Download the assessment JSON when it's over the 10,000-character send limit (up to 30,000 characters)
- Review workflow that runs stages in order and retries from the failed stage (`LATER-REVIEW-WORKFLOW.md`, outdated draft)
- Fix camelCase secret names (R007; see README Known Limitations)
- Complexity increase detection and change metrics
- UI backlog candidates for a lighter sprint: `PENDING_NEW_FEATURES.md`

## Planned decisions (not built yet)

These are also in AGENTS.md "Key Decisions" (14 and 16). They move to the README once they ship.

- **LLM keys:** AI assessment uses Claude only, with the user's own Anthropic API key (bring your own key). No other AI platforms are planned. The app has no AI key of its own. The key is sent per request and never stored, on the server, in a database, in the browser or in logs.
- **AI assessment is optional and selective:** deterministic results stand on their own. Only findings where a rule can locate a change but not judge it (R002, R012, R013, R015, R016) are sent, as flagged JS/TS lines with context. Secrets, database schema, production configuration, CI workflows and infrastructure files (R007, R003, R004, R009, R006, R011) are never sent, for security reasons. The AI adds a verdict next to a finding; it never changes the rule's severity.

## Development process

Work is split into tasks for coder, tester and reviewer agents, each with acceptance criteria (see AGENTS.md).

- **Backend:** the coder builds the analysis with deterministic rule-based detection; the tester covers every detection rule and the severity aggregation with unit tests; the reviewer checks against CODER.md and GUIDE.md.
- **Frontend:** the coder builds React + Tailwind components; the tester covers rendering logic with unit and integration tests.
