# Sprint 4: Task Briefs

Spec: `SPRINT4.md`. The rules there are the source of truth; these briefs say who does what. Deterministic work only; the AI assessment is Sprint 5 (`SPRINT5-TASKS.md`).

- **Part 1: Blast-radius metrics** (S4-T1 to S4-T3)
- **Part 2: Line numbers and R017** (S4-T4 to S4-T6)
- **Optional:** rule tests and CI (S4-T7)
- **Part 3: R018** script permission change (S4-T8)

Parts 1, 2 and 3 are independent and can run in parallel.

# Part 1: Blast-radius metrics (S4-T1 to S4-T3)

The earlier code-search briefs were dropped on 2026-11-24 (see SPRINT4.md "Dropped"). They remain in git history at commit `44160c8`.

Order: S4-T1 → S4-T2 and S4-T3 can run in parallel once S4-T1's response shape is merged → reviewer.

## S4-T1. Blast-radius calculation and API (backend)
**Role:** Coder (backend)
**Files:**
- new `lib/diff/blast-radius.ts` (pure function, no Octokit imports)
- new constants file, e.g. `lib/diff/constants/blast-radius.ts`: thresholds, container folders, lockfiles, asset extensions, docs patterns
- types in `lib/types/diff/blast-radius.ts` (mirror the lib path, per the two-types-roots convention)
- `lib/diff/core.ts` (call it), `lib/types/pr/metadata.ts` (`PRAnalysis.blastRadius`), `lib/schemas/pr-analysis.ts`

**Scope**
- `getBlastRadius(files: ChangedFile[]): BlastRadius`, following SPRINT4.md §1–§5 exactly.
- Uses only `filename`, `status` and `patch` (for the binary check). Reuse `isBinaryFile` (`lib/diff/util/is-binary.ts`) and `JS_TS_FILE_PATTERN`.
- **Test-file detection:** SPRINT4.md §3 defines it (`*.test.*`, `*.spec.*`, `__tests__/`, `test/`, `tests/`, `e2e/`; fixtures are neither). The existing `isTestPath` also matches `fixtures/`, so add a separate helper rather than changing `isTestPath`, which secret scanning and file typing depend on.
- `spread.modules` is sorted and unique.
- Add `blastRadius` to the analysis response and the Zod schema in the same PR. The frontend validates responses, so the schema and the response must ship together.

**Out of scope:** UI, renamed-file previous paths, any new GitHub request, a numeric score.

**Acceptance**
- Response validates; existing fields unchanged.
- Spot checks (the tester writes the real tests):
  - `package-lock.json` + `src/a.ts` → counted 1, excluded 1.
  - `src/auth/a.ts`, `src/db/b.ts`, `packages/ui/c.tsx`, `.github/workflows/ci.yml` → 4 modules, wide.
  - `src/index.ts` → module `src`; `README.md` at root → excluded from spread.
  - `src/a.ts` only → tests state `no-tests`; `src/a.ts` + `src/a.test.ts` → `tests-changed` (1 for 1).
  - Only `tsconfig.json` changed → `no-source-changes`.
  - Deleted `src/a.test.ts` doesn't count as a test file.
- `npm run lint`, `npx tsc --noEmit` and existing tests pass. Don't edit test files.

## S4-T2. Blast radius card (frontend)
**Role:** Coder (frontend)
**Depends on:** S4-T1's types and schema merged.
**Files:** new `app/components/BlastRadius.tsx`; place it in `app/components/PRSummary.tsx` (or its parent) next to the severity distribution.

**Scope** (SPRINT4.md §6)
- Overall level, then three rows: files ("12 files · 3 excluded"), modules (count, level, module list with "+N more" after about 6), tests (the state text).
- Each level shown as text in a neutral outline badge (the `none` badge style in STYLEGUIDE.md "Colors and brand"). **No severity colors** for levels.
- "No tests changed" warning: icon + text; may use medium-severity text color. Never color alone.
- Readable at mobile width.

**Out of scope:** U1 (severity bar layout) and the palette migration (U7), unless they're scheduled in the same sprint.

**Acceptance:** all three levels and all three test states render correctly against fixture data; no layout break with a long module list.

## S4-T3. Tests
**Role:** Tester
**Depends on:** S4-T1 merged (unit tests); S4-T2 merged (component tests).

**Scope**
- `lib/__tests__/blast-radius*.test.ts`, one file per metric (split because biome skips files over 10,000 bytes), plus `blast-radius.test.ts` for the overall level and `analyzeDiff` wiring:
  - exclusions: each lockfile, `*.snap` and `__snapshots__/`, each asset group, a binary patch, a too-large text file with an empty patch (counted)
  - level boundaries: files 10/11/30/31, modules 1/2/3/4, zero files and zero modules
  - module rule: each container folder, a file directly in a container, root files, uppercase container names, `SRC/Auth` + `src/auth` counted as one module (first spelling shown), case-insensitive sort
  - spread exclusions: test files by path whatever their type (a `.json` under `tests/`), fixtures, `*.md`/`*.mdx` anywhere, top-level `docs/` excluded but `app/docs/page.tsx` counted
  - no patch and 0/0 lines → excluded (binary with an unlisted extension, empty file, content-free rename); no patch with non-zero lines (too-large text file) → counted; status `unchanged` → excluded
  - tests signal: all three states; only added, modified and renamed count (`copied`, `changed` and deleted don't); fixtures counted as neither; non-JS/TS files ignored; no patch and 0/0 (pure rename, empty file) counted as neither
  - overall level = max of the two
- Schema test: a response with `blastRadius` validates, and a malformed one is rejected.
- Component tests for the card: levels, test states, "+N more".

# Part 2: Line numbers and R017 (S4-T4 to S4-T6)

Order: S4-T4 and S4-T5 in parallel (S4-T5 needs S4-T4's `line` field before merging) → S4-T6 → reviewer.

## S4-T4. Line numbers and stable IDs on findings (backend, S)
**Role:** Coder (backend)
**Why:** R017 (S4-T5) needs the line, findings can link to the exact line on GitHub, and Sprint 5 sends the flagged line with context and matches AI verdicts back by ID. Today a finding has only `evidence` (the line's text).
**Files:** `lib/types/diff/pattern.ts`, `lib/diff/code.ts`, `lib/diff/util/regex-finding.ts`, `lib/diff/util/parse-patch.ts` if needed, `lib/schemas/pr-analysis.ts`

**Scope**
- Add `line?: number` to `Pattern`: the line number in the new version of the file, for findings that come from a specific added line (at minimum R002, R012, R013, R015, R016, and R017 once S4-T5 lands). Path-only findings have no line.
- Add `id: string` to every finding, stable for the same input: `<ruleId>:<filename>:<line>` (or `<ruleId>:<filename>` when there's no line).
- Extend the Zod schema; both fields optional in the schema for backward compatibility within the sprint.

**Acceptance:** for a fixture patch, R015's finding reports the exact new-file line of the matching `window.location` line; IDs are identical across two runs; existing response fields unchanged. Don't edit test files.

## S4-T5. R017: exported signature changed (DROPPED)
**Repurposed (2026-11-24):** PR #23 is reused for the refactor only: the finders in `lib/diff/code.ts` take `hunks` directly, bringing the file back under ~150 lines. All R017 code is removed from the PR; the PR is renamed and squash-merged. No behaviour change, so existing tests must pass unchanged.
**Dropped 2026-11-24, before merge (PR #23 closed unmerged).** User decision: it only adds value for plain JavaScript. In TypeScript, a changed signature already fails the type check (`tsc`) for every caller in the repo. The rule ID R017 is retired and won't be reused. The text below is kept for the record.
**Role:** Coder (backend)
**Files:** `lib/diff/util/risk-scoring.ts`, `lib/diff/code.ts` or a new detector file, `lib/diff/change-detection.ts`, `lib/schemas/` if the rule ID is enumerated; README "Rules" table and Known Limitations, AGENTS.md Key Decisions

**Scope** (SPRINT4.md "R017: exported signature changed")
- JS/TS files only. Flags a patch that removes an exported function line (`export function name(…)`, `export async function name(…)`, `export const name = (…) =>`, `export default function name(…)`) and either adds one with the same name but a different parameter list, or doesn't add it back at all.
- Severity low. Message: "Public API changed: code outside this PR that uses `name` may break." Include the line (S4-T4) and evidence.
- **Depends on:** S4-T4 for the line number. The detector itself can be written in parallel.
- **Optional, from the S4-T4 review:** have the finders in `lib/diff/code.ts` take `hunks` directly, which brings the file back under ~150 lines before R017 adds to it.
- Not mapped to an Affected Area. Deterministic; Sprint 5 lists it as "not sent to AI".
- **Known limitations (README):** multi-line parameter lists, re-exports (`export { a as b }`), class methods and type-only changes aren't detected.

**Acceptance:** a renamed parameter list is flagged; a function body change with the same signature isn't; a removed export is flagged; a non-JS/TS file is ignored.

## S4-T6. Tests for Part 2
**Role:** Tester
- S4-T4: line numbers and stable IDs across several patch shapes (multiple hunks, removed lines before the flagged line, a file with no patch). Line numbers come from `parsePatch`; ids from `buildFindingId` / `withFindingId` in `lib/diff/util/finding-id.ts`. Cover: R002 from a removed line has no line and id `R002:<file>`; R002 from an added line has both; several R007 findings in one file get distinct ids; ids appear on `aggregate.findings` only; hunks without `addedLineNumbers` give findings without a line.
- ~~S4-T5~~ (dropped with R017; skip): `rules.R017.test.ts` with the acceptance cases above, plus `export async function`, `export default function`, and a multi-line parameter list (documented as not detected). The detector is `detectExportedSignatureChange(hunks, filename)` in `lib/diff/exported-signature.ts`, wired as `CodeAnalysis.exportedSignatureChanges`; the fixture `code()` helper exposes it, but `codeRuleIds` doesn't include it yet. Also cover the S4-T5 decisions in SPRINT4.md: parameter rename flagged, whitespace and trailing comma ignored, `export` dropped counts as removed, unreadable parameters not flagged, one finding per file, the extra forms (generator, generics, typed-return and no-paren arrows), and line/id for added vs removed. Also the export-list cases: `export { foo }`, `export { x as foo }`, `export { foo } from "…"` and `export default foo` keep `foo` exported (no finding); `export { foo as bar }` is flagged.
- Schema test: findings with and without `line` and `id` validate.

## S4-T7. Optional if there's room: rule tests and CI
**Roles:** Tester (rule tests), Coder (CI)
- Tester: add `rules.R001.test.ts`, `rules.R011.test.ts`, `rules.R012.test.ts`, `rules.R014.test.ts` (SPRINT4.md "Optional if there's room").
- Coder: a GitHub Actions workflow that runs lint, type check and tests on every PR. Note: our own R006 will flag this PR as "CI/CD workflow modified"; that's expected.

# Part 3: R018 (S4-T8)

## S4-T8. R018: script permission change (backend, S)
**Role:** Coder (backend)
**Files:** `lib/diff/util/risk-scoring.ts` (rule entry), a new detector (e.g. `lib/diff/mode-change.ts`) with its patterns in `lib/diff/constants/`, `lib/diff/core.ts` (call it), `lib/schemas/` if rule IDs are enumerated

**Scope** (SPRINT4.md "R018: script permission change")
- Flag a file when status is `modified`, the patch is missing or empty, additions and deletions are both 0, and the path looks runnable (the extensions and folders listed in the spec). Folder matching ignores case and works at any depth (`packages/cli/bin/run`).
- Severity medium; message exactly as in the spec.
- Runs for every file, including files that end up in `unscannedFiles` (they have no patch by definition). Its finding must show in the UI like other path-rule findings on unscanned files.
- Not mapped to an Affected Area. Not JS/TS-gated.
- Constants for the extensions and folders live in one place.

**Out of scope:** any new GitHub request; detecting mode changes that come with content changes or renames.

**Acceptance**
- `scripts/deploy.sh`, modified, no patch, 0/0 → flagged.
- `.husky/pre-commit` (no extension), modified, no patch, 0/0 → flagged.
- `bin/cli.js`, modified, no patch, 0/0 → flagged.
- `scripts/deploy.sh` with a patch → not flagged.
- `scripts/deploy.sh`, status `added` or `renamed`, 0/0 → not flagged.
- `LICENSE` or `assets/logo.png`, modified, no patch, 0/0 → not flagged.
- `package-lock.json` with no patch but non-zero line counts → not flagged.
- Lint, type check and existing tests pass. Don't edit test files.

**Tester follow-up:** `rules.R018.test.ts` with the cases above, plus case variations (`Scripts/`, `.SH`) and nested folders.
