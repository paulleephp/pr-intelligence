# Testing Standards

**Vitest** handles unit and integration tests, for both backend and frontend. **React Testing Library** is used for components. **Playwright** is planned but not installed.

Don't hard-code test counts or coverage figures in this file, because they go stale. Run `npm test -- --run` or `npm run test:coverage` for current numbers.

## Quick Start

```bash
npm test                       # All tests, watch mode
npm test -- --run              # All tests, run once (CI / before commit)
npm run test:frontend          # Frontend project only (components, hook, lib/api client)
npm run test:backend           # Backend project only (diff engine, GitHub client, API routes)
npm run test:backend -- --run  # Any script + `-- --run` = single run; add a path to narrow further
npx tsc --noEmit               # Type-check src AND tests (Vitest does not type-check)
npm run test:ui                # Browser UI
npm run test:coverage          # Coverage report (HTML in coverage/)
```

Use the project scripts while working on one side, so the frontend and backend coders don't break each other's loop. **Run the full `npm test -- --run` before committing:** the frontend fixtures use the real diff engine, so backend changes can break frontend tests.

> Watch mode only starts in an interactive terminal. In CI or agent shells (no TTY) every script runs once and exits.

> **Vitest strips types without checking them.** A green `npm test` does **not** mean the tests compile. Always run `npx tsc --noEmit` as well.

## Test File Organization

Tests live in `__tests__/` beside the code they cover.

```
lib/__tests__/
  ├── summarize-pr.test.ts       # summarizePr: file and line counts
  ├── parse-patch.test.ts        # parsePatch: added / removed / context lines
  ├── analyze-diff.test.ts       # analyzeDiff smoke tests, unscannedFiles
  ├── aggregate.test.ts          # aggregateData, category rule IDs, isBinaryFile
  ├── rules.<RULE_ID>.test.ts    # one file per rule: rules.R002 … rules.R016
  ├── rules.R007.<topic>.test.ts # R007 is split: formats, generic-secret, unquoted-values, skips
  ├── rules.js-ts-scope.test.ts  # code-pattern rules only run on JS/TS files (cross-rule)
  ├── strip-comment.test.ts      # comment removal before the R007 low-risk filter
  ├── github.client.test.ts      # lib/github/client.ts: Octokit client, PRMetadata / ChangedFile mapping (Octokit mocked)
  ├── github.errors.test.ts      # lib/github/errors.ts: toGitHubErrorResponse (pure, nothing mocked)
  ├── github.pr-metadata.test.ts # lib/github/pr-metadata/get.ts: getPRMetadata, getFullPRAnalysis (Octokit mocked)
  ├── integration.test.ts        # URL parsing + constants working together
  ├── api.test.ts                # lib/api.ts fetch client (fetch stubbed): request, errors, failed schema parse
  ├── schemas.<endpoint>.test.ts # one file per endpoint's response schema: schemas.pr-metadata, schemas.pr-analysis
  ├── schemas.common.test.ts     # schemas every endpoint shares: { error } body, url query param
  ├── response.test.ts           # lib/response.ts helpers
  ├── url.test.ts                # parsePRUrl
  ├── fixtures/
  │   ├── diff.ts                # changedFile (empty patch by default), malformed, prFiles (patch inputs) for summarize-pr / analyze-diff
  │   ├── github.ts              # Octokit response data, expected mapped PRMetadata, Octokit-shaped errors
  │   └── rules.ts               # rule-test builders (file, ruleIds, codeRuleIds, secretFindings…), FAKE tokens
  └── mocks/
      └── octokit.ts             # vi.fn() mock of @octokit/rest (pulls.get, listFiles, paginate, serveFiles)

app/__tests__/
  ├── api-pr.test.ts             # GET /api/pr and GET /api/pr/analysis route handlers
  ├── fixtures.ts                # Route-level mocks (PR metadata, errors, PR URLs)
  └── test-utils.ts              # createMockRequest() → real NextRequest

app/components/__tests__/
  ├── fixtures.ts                # buildReport()/buildAnalysis() via the REAL engine; FILES per severity
  ├── severity.test.tsx          # SeverityBadge, SeverityBar, severity ordering helpers
  ├── change-summary.test.ts     # helpers that keep unchanged files out of the page's counts and lists
  ├── areas.test.ts              # buildAffectedAreas: rule → area mapping, file in several areas, order, empty
  ├── PRForm.test.tsx            # input, enable/disable, trim, Enter, loading, error alert
  ├── PRSummary.test.tsx         # header, stats, overall risk = highest severity
  ├── PRDashboard.test.tsx       # files by severity, line stats, empty PR (no NaN)
  ├── AffectedAreas.test.tsx     # hidden when no area findings; area cards, counts, file rows
  ├── RiskIndicator.test.tsx     # severity groups, rule rows, expandable findings
  ├── ChangedFilesTable.test.tsx # sort order, cells, fallbacks, empty state
  ├── PRResults.test.tsx         # loading/empty/loaded states, NO raw scores
  ├── use-pr-report.test.ts      # hook state machine, errors, abort/stale-response handling
  └── PRAnalyzer.test.tsx        # integration: type URL → click → report (only fetch stubbed)

test/setup.ts                    # jest-dom matchers + RTL cleanup (vitest setupFiles)
```

Rule tests go in `lib/__tests__/rules.<RULE_ID>.test.ts`, one file per rule. If a rule's file grows past Biome's 10 KB limit, split it by topic as `rules.<RULE_ID>.<topic>.test.ts` (as R007 is). Tests that cover several rules at once go in a named file such as `rules.js-ts-scope.test.ts`. Shared builders and test data live in `fixtures/rules.ts`: import them instead of redefining them.

Schema tests (`lib/schemas/`) follow the same idea: one `schemas.<endpoint>.test.ts` per endpoint's response schema, named after its file in `lib/schemas/`. A new endpoint gets its own file. Schemas that every endpoint uses go in `schemas.common.test.ts`. Test each rule with one changed field on a valid response, ideally real engine output (`buildAnalysis`), so a rejection can only come from that field. Each endpoint file also has one round-trip test: the route's real output (`getPRMetadata` / `getFullPRAnalysis` with only Octokit mocked) must parse to itself. `lib/api.ts` gives the UI the parsed data and Zod drops keys a schema doesn't define, so a field added to the response but not to the schema fails that test instead of silently never reaching the UI. Keep its input full, with no field left null and no array left empty, or a dropped field can hide there.

**Fake secrets in tests:** assemble token-shaped strings at runtime (`"sk_" + "live_" + "…"`, see `FAKE` in `fixtures/rules.ts`). A literal `sk_live_…`, `xoxb-…` or `AKIA…` in the source can trip GitHub push protection and block the push. AWS access keys are `AKIA`/`ASIA` + 16 characters (20 total); shorter strings are correctly *not* matched.

**R007 decisions (2026-11-22):**
- Secret scans are skipped in test paths (`TEST_PATHS`: `__tests__/`, `test(s)/`, `e2e/`, `fixture(s)/`, `*.test.*`, `*.spec.*`). Other rules still run there.
- A low-risk word (test, mock, TODO…) only suppresses a secret when it's in the code, not in a trailing comment.
- Quoted values are flagged in every file. Unquoted values are only flagged in config files (`CONFIG_FILE_PATTERNS`: `.env*`, `Dockerfile*`, YAML, `.ini`, `.toml`, `.conf`, `.cfg`, `.tfvars`) and shell files (`.sh`, `.bash`, `.zsh`, `.envrc`). In code files an unquoted value is a variable.
- What counts as a reference to another value depends on the file kind: code files only `${…}` (so `"$abc…"` is a literal); config files `$NAME` and `${…}`; shell files also `$(…)` and backticks. `process.env` lookups are never secrets.

**Scope: JavaScript/TypeScript only (2026-11-22).**
- Use `.ts`/`.tsx`/`.js` filenames for code-file test cases. Don't write tests for other languages, or for gaps in the existing non-JS checks (R005's Python/Go/Rust/Ruby/Gradle manifests). Where languages disagree, assert the JS/TS meaning.
- Shell scripts and `.envrc` stay in scope for secret scanning: they're config/deploy files of a JS/TS repo.
- Leave the existing non-JS tests alone. If one ever needs changing, don't update it: delete the test and ask the backend coder to delete the matching check.
- The code-pattern rules (R002, R012, R013, R015, R016) only run on JS/TS files (`JS_TS_FILE_PATTERN`). The gate is in `analyzeDiff`; the `code()` helper calls `getCodeReport` directly and skips it. Gate tests live in `rules.js-ts-scope.test.ts`.

### Documenting known bugs with `it.fails`

When a test shows a real bug that belongs to the coder to fix, write the assertion for the **correct** behavior and mark it `it.fails`, with a `KNOWN BUG` comment. The suite stays green. Once the bug is fixed, the test starts failing, which tells you to change `it.fails` back to `it`. Don't loosen the assertion to match the buggy output. Use `KNOWN GAP` instead for agreed behavior that isn't built yet.

**Check that each `it.fails` fails for the right reason.** Temporarily change it to `it`, run it, and read the assertion error (e.g. `expected [] to have a length of 1`). A test that fails because of a typo or a crash would otherwise sit in the suite looking like a documented bug.

**When a coder says a fix is in:** run the suite. The fixed `it.fails` tests now show as failures. Change them to `it`, and turn the `KNOWN BUG` comment into a short `Regression:` note.

**When asked to delete tests:** check whether they encode a decision the user made (look for a `Decision (date)` comment, README or this file). If they do, ask the user before deleting. A coder removing a feature isn't the same as the user dropping it. Tests for other languages are the exception: they're removed under the JS/TS-only rule.

## What Must Be Tested (from AGENTS.md acceptance criteria)

Tests for the deterministic engine are the core deliverable. Each rule needs:

1. **A positive case.** An input that triggers the rule, with assertions on `ruleId`, `severity`, and `filename`.
2. **A negative case.** Similar-looking input that must *not* trigger, such as a variable called `password_hint` or a word inside a string literal.
3. **Only added lines count.** The same content on a removed (`-`) or context line must not be flagged, unless the rule is meant to flag removals.
4. **Removed files.** Check the behavior when `status === "removed"`.

R008 ("More than 500 lines changed") is in `RISK_RULES` but deliberately has no detector. Don't write tests for it.

Aggregation:

- `overallSeverity` equals the **highest** severity found, and is `null` when there are no findings.
- `severityCounts`, `ruleCounts`, `fileSeverity`, and `fileSeverityCounts` add up correctly across several files.

Parser edge cases: binary files are skipped (`isBinaryFile`), an empty or missing `patch` doesn't crash, `\ No newline at end of file` is handled, and lines starting with `+++` or `---` inside hunks are classified correctly.

Frontend: components show severity *groups* and must **never show raw scores**. `PRResults.test.tsx` enforces this. Keep it passing when you add new sections.

## General Rules

- **Mock external dependencies** (Octokit, network calls), but **not** the deterministic engine. Run that for real.
- **Assert behavior, not shape.** `expect(Array.isArray(analysis.secret)).toBe(true)` proves very little. Assert the actual findings.
- **Import Vitest APIs explicitly** (`import { describe, it, expect, vi } from "vitest"`). `globals: true` is on, but `tsconfig.json` doesn't include `vitest/globals` types.
- **Don't exclude tests from `tsconfig.json`.** They must pass `npx tsc --noEmit`. If a cast is unavoidable (deliberately invalid input, `vi.mock` limitations), put it in one helper with a comment saying why.
- **Keep each test file under 10 KB.** Biome's `files.maxSize` silently skips larger files, so they aren't linted. Split by topic instead, as with `github.*.test.ts` and `rules.R007.*.test.ts`.

## Frontend Testing

Tools: `@testing-library/react`, `@testing-library/user-event` and `@testing-library/jest-dom`, on the `happy-dom` environment. `test/setup.ts` registers the jest-dom matchers and runs `cleanup()` after each test.

1. **Query the way a user would.** Prefer `getByRole` (with `name`), then `getByText` and `getByTitle`. Don't query by Tailwind class.
2. **Use `userEvent`, not `fireEvent`.** Call `const user = userEvent.setup()`, then `await user.type(...)` and `await user.click(...)`.
3. **Controlled components:** wrap them in a small harness with real `useState` (see `PRForm.test.tsx`), so typing behaves like the app.
4. **Build fixtures with the real engine.** Use `buildReport([...FILES])` or `buildAnalysis([...])` from `app/components/__tests__/fixtures.ts`. Don't hand-write `PRAnalysisResponse` objects: they drift from the backend.
5. **Mock at the right layer:**
   - Presentational components: no mocks, pass fixtures as props.
   - Hooks (`usePRReport`): `vi.mock("@/lib/api")` and use `renderHook`.
   - Integration (`PRAnalyzer`) and `lib/api.ts`: stub only the network with `vi.stubGlobal("fetch", mockFetch)`, and return real `Response` objects with a JSON `content-type`.
6. **Silence expected `console.error` calls** with `vi.spyOn(console, "error").mockImplementation(() => {})` in `beforeEach`, and restore them in `afterEach`.
7. **Async state:** use `findBy*` or `waitFor` for things that appear after a fetch. To observe in-flight state, return a hand-resolved `deferred()` promise (see `use-pr-report.test.ts`).

## Mock Data Organization

Keep test files readable: move large mock data out of them.

- **Static data** (API responses, expected results, error shapes) goes in a `fixtures/` file, e.g. `lib/__tests__/fixtures/github.ts`.
- **Mock functions** (`vi.fn()` stand-ins for a library) go in a `mocks/` file, e.g. `lib/__tests__/mocks/octokit.ts`.
- **Builders** that make inputs and run the engine go in a `fixtures/` file too, e.g. `file()` in `lib/__tests__/fixtures/rules.ts`, which returns a typed `ChangedFile` with defaults.
- Keep short inputs and the expected values a test is about inline, so a reader can see what's being checked.

## Testing Route Handlers

The route handlers are `GET` handlers that read the PR URL from the `?url=` query param, so tests need a real `NextRequest`: use `createMockRequest(path, prUrl)` from `app/__tests__/test-utils.ts`.

Mock the data layer (`@/lib/github/pr-metadata/get`), not Octokit, so the tests cover parsing, validation, and error-to-status mapping in the route. Each route should have tests for a valid URL (200); a missing, empty or invalid URL (400); 404, 429 and 500 errors from GitHub; and `POST` returning 405.

## Mocking

`vi.mock` is hoisted above imports, so mocks it uses must be declared with `vi.hoisted()`:

```typescript
const { mockGetPRMetadata } = vi.hoisted(() => ({ mockGetPRMetadata: vi.fn() }));
vi.mock("@/lib/github/pr-metadata/get", () => ({ getPRMetadata: mockGetPRMetadata }));
```

**Mocks kept in a separate file:** load the module inside `vi.hoisted`, so the `vi.mock` factory and the test share the same `vi.fn()` instances. Don't use a plain `import` plus a factory that imports the mock file again: after `vi.resetModules()` the factory can load a fresh copy.

```typescript
const { mockOctokit, mockPullsGet } = await vi.hoisted(() => import("./mocks/octokit"));
vi.mock("@octokit/rest", () => ({ Octokit: mockOctokit }));
```

**Mocking constructors (Vitest 4+):** if code under test calls `new X()` on a mock (e.g. `new Octokit()`), the mock implementation must be a `function` or `class`, **not an arrow function**. Otherwise you get `... is not a constructor`.

**Octokit specifics:** `lib/github/client.ts` creates its Octokit at module load, before any test runs. To assert on the constructor call: `mockOctokit.mockClear(); vi.resetModules(); await import("@/lib/github/client")`. `fetchChangedFiles` pages through `listFiles` with `paginate()`. `mocks/octokit.ts` mocks `paginate` to request pages until one comes back short, and `serveFiles(files)` makes `listFiles` serve a file list page by page. Clear `mockPaginate` with `mockClear()`, not `mockReset()`, or its implementation is dropped. Real Octokit follows GitHub's `Link` header instead, so don't assert the request count for a PR that is an exact multiple of the page size.

**Cleanup:** reset per-test mocks in `afterEach` with `mockReset()` (it also drops queued `mockResolvedValueOnce` values). `vi.restoreAllMocks()` only restores `vi.spyOn` spies; it doesn't reset `vi.fn()` mocks.

## Path Alias Pitfalls

`tsconfig.json` resolves `@/foo` to `./foo`, then `./app/foo`, `./lib/foo`, `./types/foo` (first match). `vitest.config.ts` resolves it to `./foo` only. So `@/types/github/errors` type-checks (tsc finds `lib/types/github/errors.ts`) but fails at runtime in Vitest. Type-only imports get erased, which hides the problem.

**In tests, always use full paths**: `@/lib/types/...`, `@/lib/github/...`. The GitHub layer has no barrel file: import from `@/lib/github/client`, `@/lib/github/errors` or `@/lib/github/pr-metadata/get`.

## Coverage

Target: >80% statements, >75% branches, >80% functions/lines. The report covers every source file in `lib/` and `app/`, including files no test imports (`coverage.include`). Test helpers in `__tests__/` and type files are left out.

## Pre-Commit

```bash
npm test -- --run && npx tsc --noEmit && npm run lint && npm run build
```

- **`tsc` may report one error in `.next/types/validator.ts`** pointing to a route that no longer exists. That file is generated by `next dev` and goes stale; run `next dev` again or delete `.next/types`. It's not a real error in the source.
- **`npm run lint` runs Biome** (`biome.json`). It skips what `.gitignore` ignores and `public/`. It fails on errors only.
- **Don't run `lint:fix` / `format:fix` without reading the diff:** one fix it offers turns the Octokit mock's `function` into an arrow function, which breaks `new Octokit()`. Intentional patterns carry a `biome-ignore` comment with the reason.

## Tips

- **Probe before writing tests.** To see what the engine does with many inputs, write a throwaway `lib/__tests__/zz-probe.test.ts` that runs `analyzeDiff` on each case and prints the findings, then delete it.
- **Count tests with the JSON reporter, not `vitest list`.** `vitest list` doesn't expand `it.each` rows. Use `npx vitest run --reporter=json --outputFile=<file>` and read `numTotalTests` and each `assertionResults[].title`.
- **When moving or splitting test files,** save the JSON report before and after and compare the (full name, status) pairs. Every old test should still exist with the same result.

## Config

`vitest.config.ts` has two **projects** (`--project <name>`):

| Project | Environment | Includes |
|---|---|---|
| `frontend` | `happy-dom` + `test/setup.ts` | `app/components/**/*.test.{ts,tsx}`, `lib/__tests__/api.test.ts` |
| `backend` | `node` (no DOM) | `lib/**/*.test.ts`, `app/**/*.test.ts`, minus the frontend files |

**When adding a test file**, put it somewhere a project already includes. If it belongs to the frontend but lives outside `app/components/` (like `lib/api.ts`), add it to `FRONTEND_TESTS` in `vitest.config.ts`. Otherwise it silently runs in the wrong environment.

## Known Issues (as of 2026-11-23)

| Issue | Impact | Fix |
|---|---|---|
| Rule coverage incomplete | R001, R012 and R014 have only a few cases (in `aggregate.test.ts` / `rules.js-ts-scope.test.ts`); R011 has none | Add a `rules.<RULE_ID>.test.ts` file for each |
| No browser E2E tests | Playwright isn't installed. Component and integration tests run in happy-dom, so they can't catch real layout, CSS or `next/image` behavior | Add Playwright for a smoke flow once the UI settles |
| `.vue` / `.svelte` / `.astro` not scanned for HTML injection (KNOWN GAP) | Decided 2026-11-23: the other code-pattern rules stay off for these files, but they should be scanned for the innerHTML part of R016. 6 `it.fails` in `rules.R016.test.ts`: 3 DOM sinks in `<script>` and 3 framework raw-HTML directives (`v-html`, `{@html}`, `set:html`) | Run R016's HTML-injection patterns on these files; add patterns for the three directives |
| Dockerfile edge cases (untested, low priority) | `Dockerfile.md` and `Dockerfile.json` count as Dockerfiles. The old `ENV KEY value` form and `*.Dockerfile` names aren't detected | Not decided |
| camelCase secret names (deferred) | Some real camelCase names are missed and camelCase placeholders are flagged. See README → Known Limitations | Add tests with the fix |
| No CI | There's no `.github/workflows`, so nothing runs tests automatically | Add a GitHub Actions job that runs the Pre-Commit commands |
