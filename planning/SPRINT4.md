Sprint 4 — Blast-radius metrics, R017 and finding line numbers

Status: scoped and briefed 2026-11-24. Deterministic work only. The AI assessment moved to Sprint 5 (`SPRINT5.md`) on 2026-11-24 to keep this sprint close to Sprint 3's size.

## Dropped: impact analysis via code search or source download

Decided 2026-11-24. Finding affected files and suggested tests is out of scope. Options considered and why each was rejected:

- **GitHub code search:** its rate limit (about 10 searches per minute) caps analysis at roughly 10 changed files per PR. It doesn't scale.
- **Downloading the repository (tarball):** the app stays on Vercel. A download plus parsing has to fit a function's memory and time limits, and most of the download is images and assets that get thrown away.
- **Partial, blobless or treeless clone:** all need `git` on the server, which Vercel functions don't have.
- **Per-file fetches (directory-download tools, Contents API):** one request per file, so the same rate-limit problem as code search.

The old Sprint 3 spec text (1.1 relationship detection, 1.2 affected files, 1.3 test mapping, 2.2 suggested tests) and the draft code-search briefs are in git history (commit `44160c8`, `planning/SPRINT4.md` and `planning/SPRINT4-TASKS.md`). Don't revive them without a new decision.

## Blast-radius metrics

Goal: show how widely a PR spreads, from the changed-file list the analysis already fetches. **No new GitHub requests.** Blast radius is not risk (a 40-file rename is wide but harmless), so it is shown separately from severity.

### 1. File count
- Count changed files, **excluding**:
  - lockfiles: `package-lock.json`, `yarn.lock`, `pnpm-lock.yaml`, `npm-shrinkwrap.json`, `bun.lockb`
  - test snapshots: `*.snap`, anything under `__snapshots__/`
  - images and other assets by extension: images (`png`, `jpg`, `jpeg`, `gif`, `webp`, `avif`, `svg`, `ico`, `bmp`), fonts (`woff`, `woff2`, `ttf`, `otf`, `eot`), media (`mp4`, `webm`, `mov`, `mp3`, `wav`), `pdf`, archives (`zip`, `gz`, `tar`)
  - binary files (the diff says "Binary files … differ", same check as `lib/diff/util/is-binary.ts`)
- A text file that has no patch because its diff is too large **does** count; it isn't an asset.
- Levels: **1–10** contained · **11–30** moderate · **31+** wide. Zero counted files is contained.

### 2. Directory spread
- **Module** of a file = its first folder, unless that folder is a container folder, in which case the first two folders:
  - container folders: `src`, `lib`, `app`, `packages`, `apps`, `libs`, `services`, `modules`
  - `src/auth/login.ts` → `src/auth`; `packages/ui/Button.tsx` → `packages/ui`; `.github/workflows/ci.yml` → `.github`
  - a file directly inside a container folder (`src/index.ts`) → `src`
  - a file at the repo root (`package.json`) → `(root)`
- Counted over the same files as the file count, **also excluding test files and docs** (`*.md`, `*.mdx`, anything under `docs/`). Adding tests or docs must not make a PR look wider.
- Matching is case-insensitive for the container list; module names are shown as they appear in the path.
- Levels: **1** contained · **2–3** moderate · **4+** wide. Zero modules (e.g. only tests or docs changed) is contained.
- Known limitation: a renamed file counts only under its new path. The changed-file data doesn't include the previous path, so a move between modules counts once.

### 3. Test-to-code ratio (separate signal)
- **Source files:** JS/TS files (`JS_TS_FILE_PATTERN`) that aren't test files. Language scope: JS/TS only.
- **Test files:** JS/TS files matching `*.test.*` or `*.spec.*`, or inside `__tests__/`, `test/`, `tests/` or `e2e/`. Fixture files (`fixtures/`) count as neither.
- Only **added, modified, renamed or copied** files count. Deleted tests are already flagged by R010; deleted source files aren't counted either.
- States:
  - `no-source-changes`: no source files changed (e.g. config-only PR). Shown as "No source changes".
  - `no-tests`: source files changed, no test files changed. Shown as a warning: "No tests changed for N source files".
  - `tests-changed`: shown as "T test files changed for N source files".
- No graded thresholds on the ratio itself (no "good/bad" cut-off). The counts are the signal.
- **Does not raise the overall level** (decided 2026-11-24).

### 4. Overall level
- **Overall = the higher of the file-count level and the spread level.** Same "highest wins" logic as severity. No numeric score (see Key Decision 3).
- Each metric always shows its value and the reason for its level, e.g. "Wide: touches 5 modules (src/auth, src/db, …)".

### 5. Response shape (guide for the coder; exact names may change in review)
```ts
type BlastRadiusLevel = "contained" | "moderate" | "wide";

interface BlastRadius {
  level: BlastRadiusLevel;                 // max(fileCount.level, spread.level)
  fileCount: { counted: number; excluded: number; level: BlastRadiusLevel };
  spread: { modules: string[]; level: BlastRadiusLevel };   // sorted, unique
  tests: {
    state: "no-source-changes" | "no-tests" | "tests-changed";
    sourceFiles: number;
    testFiles: number;
  };
}
```
- Added to the `/api/pr/analysis` response as `analysis.blastRadius`, with a matching Zod schema in `lib/schemas/`.
- All thresholds, the container list, the lockfile list and the asset extensions live in one constants file.

### 6. Frontend
- A "Blast radius" card in the summary area, next to the severity distribution.
- Shows the overall level, then one row per metric with its value and reason; the module list is visible (collapsed after about 6 with "+N more").
- **Not severity colors.** Use neutral outline badges (the `none` badge style in STYLEGUIDE.md "Colors and brand"), with the level as text. The "No tests changed" warning may use the medium-severity text color with a warning icon and text, never color alone.

### Definition of done
- Metrics computed from the existing changed-file list, no new GitHub requests.
- Excluded files, modules and test states match the rules above, covered by unit tests.
- Response validates against the Zod schema; existing response fields unchanged.
- Card renders all three states of the test signal and all three levels.
- AGENTS.md Key Decisions, README "Features", "Design Decisions" and "Known Limitations" updated (renames counted once).

## R017: exported signature changed (decided 2026-11-24)

- **R017 "Exported function signature changed"**, JS/TS only, severity low (proposed). Flags a patch that removes an `export function name(…)` / `export const name = (…) =>` line and adds one with the same name but different parameters, or removes the export entirely.
- Message: "Public API changed: code outside this PR that uses `name` may break." We can't see the callers (Key Decision 15), so the finding tells the reviewer to check.
- Deterministic, so not sent to AI (Sprint 5).

## Line numbers and stable IDs on findings (decided 2026-11-24)

- Findings that come from a specific added line (at minimum R002, R012, R013, R015, R016, R017) record that line's number in the new version of the file.
- Every finding gets a stable ID: `<ruleId>:<filename>:<line>`, or `<ruleId>:<filename>` when there's no line.
- Useful now (R017 needs the line; findings can link to the exact line on GitHub) and a prerequisite for Sprint 5, which sends the flagged line with context and matches AI verdicts back to findings by ID.

## Optional if there's room: tests and CI (carried over)

| Item | Detail | Plan |
|------|--------|------|
| Rule coverage incomplete | R001, R012 and R014 have only a few cases (in `aggregate.test.ts` / `rules.js-ts-scope.test.ts`); R011 has none | Add a `rules.<RULE_ID>.test.ts` file for each |
| Dockerfile edge cases (untested, low priority) | `Dockerfile.md` and `Dockerfile.json` count as Dockerfiles. The old `ENV KEY value` form and `*.Dockerfile` names aren't detected | Not decided |
| camelCase secret names (deferred) | Some real camelCase names are missed and camelCase placeholders are flagged. See README → Known Limitations | Add tests with the fix |

- Add a GitHub Actions job that runs the pre-commit commands (lint, type check, tests) on every PR.

Task briefs: `SPRINT4-TASKS.md`.
