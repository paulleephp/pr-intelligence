# Testing Standards

**Vitest** handles unit and integration tests, for both backend and frontend. **React Testing Library** is used for components. **Playwright** is planned for end-to-end browser tests but isn't installed yet.

Don't hard-code test counts in this file because they go stale. To get the current number, run `npm test -- --run`.

## Quick Start

```bash
npm test                       # All tests, watch mode
npm test -- --run              # All tests, run once (CI / before commit)
npm run test:frontend          # Frontend project only (components, hook, lib/api client)
npm run test:backend           # Backend project only (diff engine, GitHub client, API routes)
npm run test:backend -- --run  # Any script + `-- --run` = single run; add a path to narrow further
npx tsc --noEmit      # Type-check src AND tests (Vitest does not type-check)
npm run test:ui       # Browser UI
npm run test:coverage # Coverage report (see Known Issues: % is inflated)
```

Use the project scripts while working on one side, so the frontend and backend coders don't break each other's loop. **Run the full `npm test -- --run` before committing:** the frontend fixtures use the real diff engine, so backend changes can break frontend tests.

> Watch mode only starts in an interactive terminal. In CI or agent shells (no TTY) every script runs once and exits.

> **Vitest strips types without checking them.** A green `npm test` does **not** mean the tests compile.
> Always run `npx tsc --noEmit` as well.

## Test File Organization

Tests live in `__tests__/` beside the code they cover.

```
lib/__tests__/
  ├── analysis.test.ts     # summarizePr, parsePatch, analyzeDiff smoke tests
  ├── aggregate.test.ts    # aggregateData, category rule IDs, isBinaryFile
  ├── rules.<RULE_ID>.test.ts # one file per rule: rules.R002 … rules.R016 (positive/negative cases)
  ├── rules.js-ts-scope.test.ts # code-pattern rules only run on JS/TS files (cross-rule)
  ├── strip-comment.test.ts # lib/diff/util/strip-comment.ts (comment removal before the R007 low-risk filter)
  ├── github.test.ts       # lib/github/{client,errors,pr-metadata/get} (Octokit mocked)
  ├── integration.test.ts  # URL parsing + constants working together
  ├── api.test.ts          # lib/api.ts fetch client + lib/api-guards.ts (fetch stubbed)
  ├── response.test.ts     # lib/response.ts helpers
  ├── url.test.ts          # parsePRUrl
  ├── fixtures/
  │   ├── github.ts        # Octokit response data, expected mapped PRMetadata, Octokit-shaped errors
  │   └── rules.ts         # rule-test builders (file, ruleIds, codeRuleIds, secretFindings…), FAKE tokens
  └── mocks/
      └── octokit.ts       # vi.fn() mock of @octokit/rest (pulls.get, listFiles, paginate, serveFiles)

app/__tests__/
  ├── api-pr.test.ts       # GET /api/pr and GET /api/pr/analysis route handlers
  ├── fixtures.ts          # Route-level mocks (PR metadata, errors, PR URLs)
  └── test-utils.ts        # createMockRequest() → real NextRequest

app/components/__tests__/
  ├── fixtures.ts               # buildReport()/buildAnalysis() via the REAL engine; FILES per severity
  ├── severity.test.tsx         # SeverityBadge, SeverityBar, severity ordering helpers
  ├── PRForm.test.tsx           # input, enable/disable, trim, Enter, loading, error alert
  ├── PRSummary.test.tsx        # header, stats, overall risk = highest severity
  ├── PRDashboard.test.tsx      # files by severity, line stats, empty PR (no NaN)
  ├── RiskIndicator.test.tsx    # severity groups, rule rows, expandable findings
  ├── ChangedFilesTable.test.tsx# sort order, cells, fallbacks, empty state
  ├── PRResults.test.tsx        # loading/empty/loaded states, NO raw scores
  ├── use-pr-report.test.ts     # hook state machine, errors, abort/stale-response handling
  └── PRAnalyzer.test.tsx       # integration: type URL → click → report (only fetch stubbed)

test/setup.ts              # jest-dom matchers + RTL cleanup (vitest setupFiles)
```

Rule tests go in `lib/__tests__/rules.<RULE_ID>.test.ts`, one file per rule (e.g. `rules.R007.test.ts`). Put a test in the file of the rule it asserts on; tests that cover several rules at once go in a named file such as `rules.js-ts-scope.test.ts`. Shared builders and test data live in `fixtures/rules.ts`: import them instead of redefining them. A rule with no file yet (R001, R008, R011, R012, R014) gets one when its first tests are written.

**Fake secrets in tests:** assemble token-shaped strings at runtime (`"sk_" + "live_" + "…"`, see `FAKE` in `lib/__tests__/fixtures/rules.ts`). A literal `sk_live_…`, `xoxb-…` or `AKIA…` in the source can trip GitHub push protection and block the push. AWS access keys are `AKIA`/`ASIA` + 16 characters (20 total); shorter strings are correctly *not* matched by the value rule.

**R007 decisions (2026-11-22):** secret scans are skipped in test paths (`TEST_PATHS`: `__tests__/`, `test(s)/`, `e2e/`, `fixture(s)/`, `*.test.*`, `*.spec.*`); other rules still run there. Outside test paths, a low-risk word (test, mock, TODO…) only suppresses a secret when it's in the code, not in a trailing comment. Unquoted secret values are only flagged in config and shell files (config: `CONFIG_FILE_PATTERNS` in `lib/diff/constants/secret.ts`, i.e. `.env*`, `Dockerfile*`, YAML, `.ini`, `.toml`, `.conf`, `.cfg`, `.tfvars`; shell: `.sh`, `.bash`, `.zsh`, `.envrc`); in code files an unquoted value is a variable. Quoted values are flagged everywhere. What counts as a reference to another value depends on the file kind: code files only `${…}`, so `"$abc…"` is a literal; config files `$NAME` and `${…}`; shell files also `$(…)` and backticks. Env lookups (`process.env`) are never secrets.

**Scope: JavaScript/TypeScript only (2026-11-22).** Use `.ts`/`.tsx`/`.js` filenames for code-file test cases. Don't write tests for other languages, and don't add tests for gaps in the existing non-JS checks (R005 Python/Go/Rust/Ruby/Gradle manifests). Alembic and Rails migration paths, `os.environ` and `.properties` were removed on 2026-11-22 under this rule. Shell scripts and `.envrc` are not "other languages": they're config/deploy files of a JS/TS repo and stay in scope (confirmed 2026-11-22). Leave the existing non-JS tests alone, but if one ever needs changing (a failure, a new expected value, a refactor), don't update it: remove that language's support instead, meaning delete the test and ask the backend coder to delete the matching check. Where languages disagree, assert the JS/TS meaning (e.g. `"$name"` in code is a literal string). The code-pattern rules (R002, R012, R013, R015, R016) only run on JS/TS files (`JS_TS_FILE_PATTERN`). The gate is in `analyzeDiff`; `getCodeReport` scans by default, so tests that call it directly (the `code()` helper) don't exercise the gate. Gate tests live in `rules.js-ts-scope.test.ts`.

### Documenting known bugs with `it.fails`

When a test shows a real bug that belongs to the coder to fix, write the assertion for the **correct** behavior and mark it `it.fails`, with a `KNOWN BUG` comment. The suite stays green. Once the bug is fixed, the test starts failing, which tells you to change `it.fails` back to `it`. Don't loosen the assertion to match the buggy output.

Use `KNOWN GAP` instead of `KNOWN BUG` for agreed behavior that isn't built yet.

**Check that each `it.fails` fails for the right reason.** Temporarily change it to `it`, run it, and read the assertion error (e.g. `expected [] to have a length of 1`). A test that fails because of a typo or a crash would otherwise sit in the suite looking like a documented bug. Change it back afterwards.

**When a coder says a fix is in:** run the suite. The fixed `it.fails` tests now show as failures. Change them to `it`, and turn the `KNOWN BUG` comment into a short `Regression:` note.

**When asked to delete tests:** check whether they encode a decision the user made (look for a `Decision (date)` comment, README or this file). If they do, ask the user before deleting. A coder removing a feature isn't the same as the user dropping it. Tests for other languages are the exception: they're removed under the JS/TS-only rule.

## What Must Be Tested (from AGENTS.md acceptance criteria)

Tests for the deterministic engine are the core deliverable. Each rule needs:

1. **A positive case.** An input that triggers the rule, with assertions on `ruleId`, `severity`, and `filename`.
2. **A negative case.** Similar-looking input that must *not* trigger, such as a variable called `password_hint` or a word inside a string literal.
3. **Only added lines count.** The same content on a removed (`-`) or context line must not be flagged, unless the rule is meant to flag removals.
4. **Removed files.** Check the behavior when `status === "removed"`.

Risk scoring and aggregation:

- `overallSeverity` equals the **highest** severity found. This is the "highest severity as overall PR label" decision.
- `overallSeverity` is `null` when there are no findings.
- `severityCounts`, `ruleCounts`, `fileSeverity`, and `fileSeverityCounts` add up correctly across several files.
- `getRiskLevel` and `getSeverityScore` are correct at their threshold boundaries.

Parser edge cases: binary files are skipped (`isBinaryFile`), an empty or missing `patch` doesn't crash, `\ No newline at end of file` is handled, and lines starting with `+++` or `---` inside hunks are classified correctly.

Frontend: components show severity *groups* and must **never show raw scores**. `PRResults.test.tsx` enforces this. Keep it passing when you add new sections.

## Frontend Testing

Tools: `@testing-library/react`, `@testing-library/user-event` and `@testing-library/jest-dom`, on the `happy-dom` environment. `test/setup.ts` registers the jest-dom matchers (`toBeInTheDocument`, `toBeDisabled`, ...) and runs `cleanup()` after each test.

Conventions:

1. **Query the way a user would.** Prefer `getByRole` (with `name`), then `getByText` and `getByTitle`. Don't query by Tailwind class. Classes are styling, not behavior.
2. **Use `userEvent`, not `fireEvent`.** Call `const user = userEvent.setup()`, then `await user.type(...)` and `await user.click(...)`.
3. **Controlled components:** wrap them in a small harness with real `useState` (see `PRForm.test.tsx`), so typing behaves like the app.
4. **Build fixtures with the real engine.** Use `buildReport([...FILES])` or `buildAnalysis([...])` from `app/components/__tests__/fixtures.ts`. Don't hand-write `PRAnalysisResponse` objects: they drift from the backend.
5. **Mock at the right layer:**
   - Presentational components: no mocks, pass fixtures as props.
   - Hooks (`usePRReport`): `vi.mock("@/lib/api")` and use `renderHook`.
   - Integration (`PRAnalyzer`) and `lib/api.ts`: stub only the network with `vi.stubGlobal("fetch", mockFetch)`, and return real `Response` objects with a JSON `content-type`.
6. **Silence expected `console.error` calls** with `vi.spyOn(console, "error").mockImplementation(() => {})` in `beforeEach`, and restore them in `afterEach`.
7. **Async state:** use `findBy*` or `waitFor` for things that appear after a fetch. To observe in-flight state, return a hand-resolved `deferred()` promise (see `use-pr-report.test.ts`).



**Intentionally unimplemented rules:** R008 ("More than 500 lines changed") is defined in `RISK_RULES` but deliberately has no detector. Don't write tests for it.

## Test Structure (AAA Pattern)

```typescript
describe("Feature", () => {
  describe("behavior", () => {
    it("should do X", () => {
      // Arrange
      const input = "test";
      // Act
      const result = func(input);
      // Assert
      expect(result).toBe("expected");
    });
  });
});
```

## Best Practices

1. **Descriptive names**, for example `it("should return null for invalid URL")`.
2. **Nested describes** to group related tests.
3. **Isolated tests**: mock external dependencies such as Octokit and network calls, but **not** the deterministic engine. Run that for real.
4. **Edge cases**: empty, null, and large values.
5. **Error paths**: test both success and failure.
6. **Assert behavior, not shape.** `expect(Array.isArray(analysis.secret)).toBe(true)` proves very little. Assert the actual findings.
7. **Import Vitest APIs explicitly** (`import { describe, it, expect, vi } from "vitest"`). `globals: true` is on, but `tsconfig.json` doesn't include `vitest/globals` types.

## Mock Data Organization

Keep test files readable: move large mock data out of them.

- **Static data** (API responses, expected results, error shapes) goes in a `fixtures/` file, e.g. `lib/__tests__/fixtures/github.ts`.
- **Mock functions** (`vi.fn()` stand-ins for a library) go in a `mocks/` file, e.g. `lib/__tests__/mocks/octokit.ts`.
- **Builders** that make inputs and run the engine go in a `fixtures/` file too, e.g. `lib/__tests__/fixtures/rules.ts`.
- Keep short inputs and the expected values a test is about inline, so a reader can see what's being checked.

Fixture objects must be **typed with the real production types**. If a fixture no longer matches a type, `tsc` should fail.

```typescript
// lib/__tests__/fixtures/github.ts
export const octokit = { pullsGetSuccess: { data: { /* ... */ } } };
export const errors = { notFound: { response: { status: 404 } } };
```

For diff-engine tests, build `ChangedFile` objects (from `@/lib/types/pr/metadata`) with a small helper so every fixture includes the required `patch` field:

```typescript
const file = (overrides: Partial<ChangedFile> = {}): ChangedFile => ({
  filename: "src/index.ts",
  status: "modified",
  additions: 0,
  deletions: 0,
  patch: "",
  ...overrides,
});
```

To test null or missing input on purpose, cast **once** with a comment saying why. Don't loosen the fixture type.

## Testing Route Handlers

The route handlers are `GET` handlers that read the PR URL from the `?url=` query param via `request.nextUrl`, so tests need a real `NextRequest`:

```typescript
// app/__tests__/test-utils.ts
export function createMockRequest(path: string, prUrl?: string): NextRequest

// app/__tests__/api-pr.test.ts
const response = await GET(createMockRequest("/api/pr", "https://github.com/owner/repo/pull/123"));
```

Mock the data layer (`@/lib/github/pr-metadata/get`), not Octokit, so the tests cover parsing, validation, and error-to-status mapping in the route.

Each route should have tests for:

- a valid URL (200)
- a missing URL (400)
- an empty URL (400)
- an invalid URL (400)
- 404, 429, and 500 errors from GitHub, mapped to the matching status
- `POST` returning 405

## Mocking with vi.hoisted()

Use `vi.hoisted()` to declare mocks before `vi.mock()` runs:

```typescript
const { mockGetPRMetadata, mockGetFullPRAnalysis } = vi.hoisted(() => ({
  mockGetPRMetadata: vi.fn(),
  mockGetFullPRAnalysis: vi.fn(),
}));

vi.mock("@/lib/github/pr-metadata/get", () => ({
  getPRMetadata: mockGetPRMetadata,
  getFullPRAnalysis: mockGetFullPRAnalysis,
}));
```

**Mocking constructors (Vitest 4+):** if code under test calls `new X()` on a mock (e.g. `new Octokit()`), the mock implementation must be a `function` or `class`, **not an arrow function**. Otherwise you get `... is not a constructor`:

```typescript
const mockOctokit = vi.fn(function () {
  return { pulls: { get: mockPullsGet, listFiles: mockListFiles }, paginate: mockPaginate };
});
```

`lib/github/client.ts` creates its Octokit at module load, so the constructor call happens before any test runs. To assert on it, `mockOctokit.mockClear(); vi.resetModules(); await import("@/lib/github/client")`. `mocks/octokit.ts` also mocks `paginate` and a page-aware `listFiles` (`serveFiles`), so pagination tests pass whether the client uses `paginate()` or loops over pages itself.

**Why hoisted?** `vi.mock` is hoisted above imports, so normal top-level variables don't exist yet when the factory runs.

**Mocks kept in a separate file:** load the module inside `vi.hoisted`, so the `vi.mock` factory and the test share the same `vi.fn()` instances:

```typescript
const { mockOctokit, mockPullsGet } = await vi.hoisted(() => import("./mocks/octokit"));
vi.mock("@octokit/rest", () => ({ Octokit: mockOctokit }));
```

Don't use a plain `import` plus a factory that imports the mock file again: after `vi.resetModules()` the factory can load a fresh copy, and the constructor assertion would check the wrong `vi.fn()`.

## Mock Lifecycle

```typescript
beforeEach(() => {
  vi.clearAllMocks(); // clear calls + queued return values
});
afterEach(() => {
  vi.resetAllMocks(); // also drops implementations
});
```

## Path Alias Pitfalls

`tsconfig.json` and `vitest.config.ts` resolve `@/` **differently**:

| | `@/foo` resolves to |
|---|---|
| `tsconfig.json` | `./foo`, then `./app/foo`, `./lib/foo`, `./types/foo` (first match) |
| `vitest.config.ts` | `./foo` only |

So `@/types/github/errors` type-checks because tsc finds `lib/types/github/errors.ts`. At runtime in Vitest it would fail, because `./types/github/errors` doesn't exist. Type-only imports get erased, which hides the problem.

**In tests, always use full paths**: `@/lib/types/...`, `@/lib/github/...`.

The GitHub layer has no barrel file: import from `@/lib/github/client`, `@/lib/github/errors` or `@/lib/github/pr-metadata/get`.

## Type Safety in Tests

**Do NOT exclude tests from tsconfig.json.** They must pass `npx tsc --noEmit`.

If a cast is unavoidable (because of `vi.mock` limitations or deliberately invalid input), put it in ONE helper with a comment.

## Coverage

Target: >80% statements, >75% branches, >80% functions/lines.

```bash
npm run test:coverage  # HTML report in coverage/
```

The report covers every source file in `lib/` and `app/`, including files no test imports (`coverage.include`). Test helpers in `__tests__/` and type files are left out. As of 2026-11-23: 96.4% statements, 95.1% branches, 92.1% functions, 96.2% lines. The files no test reaches are `app/layout.tsx`, `app/page.tsx`, `app/dashboard/page.tsx`, `Header.tsx` and `Footer.tsx`.

## Pre-Commit

```bash
npm test -- --run && npx tsc --noEmit && npm run lint && npm run build
```

- **`tsc` may report one error in `.next/types/validator.ts`** pointing to a route that no longer exists. That file is generated by `next dev` and goes stale; run `next dev` again or delete `.next/types`. It's not a real error in the source.
- **`npm run lint` runs Biome** (`biome.json`). It skips what `.gitignore` ignores (`.next/`, `coverage/`, `node_modules/`) and the static assets in `public/`. It fails on errors only; warnings and infos don't fail it.
- **Biome skips files over 10 KB** (`files.maxSize` in `biome.json`), so the biggest test files aren't linted. Don't run `lint:fix` / `format:fix` without reading the diff: the fixes it offers include turning the Octokit mock's `function` into an arrow function, which breaks `new Octokit()`. Intentional patterns carry a `biome-ignore` comment with the reason.

## Tips

- **Probe before writing tests.** To see what the engine does with many inputs, write a throwaway `lib/__tests__/zz-probe.test.ts` that runs `analyzeDiff` on each case and prints or saves the findings, then delete it. This finds the real behavior faster than guessing at assertions.
- **Count tests with the JSON reporter, not `vitest list`.** `vitest list` doesn't expand `it.each` rows. Use `npx vitest run --reporter=json --outputFile=<file>` and read `numTotalTests` and each `assertionResults[].title`.
- **When moving or splitting test files,** save the JSON report before and after and compare the (title, status) pairs. Every old test should still exist with the same result.

## Config

`vitest.config.ts`:

- Two **projects** (`--project <name>`):

  | Project | Environment | Includes |
  |---|---|---|
  | `frontend` | `happy-dom` + `test/setup.ts` (jest-dom matchers, RTL cleanup) | `app/components/**/*.test.{ts,tsx}`, `lib/__tests__/api.test.ts` |
  | `backend` | `node` (no DOM) | `lib/**/*.test.ts`, `app/**/*.test.ts`, minus the frontend files |

  **When adding a test file**, put it somewhere a project already includes. If it belongs to the frontend but lives outside `app/components/` (like `lib/api.ts`), add it to `FRONTEND_TESTS` in `vitest.config.ts`. Otherwise it silently runs in the wrong environment. Check that the frontend and backend counts add up to the `npm test` total.
- Globals: enabled (but import explicitly, see Best Practices)
- Path alias: `@/` maps to the project root **only**, see Path Alias Pitfalls
- Coverage: V8 provider; text, json, and html reporters; `include` lists all of `lib/` and `app/`, and `exclude` drops `__tests__/`, test files and `types/`

## Known Issues (as of 2026-11-23)

| Issue | Impact | Fix |
|---|---|---|
| Rule coverage incomplete | R002–R007, R009, R013, R015 and R016 have per-rule tests. R001, R010, R011, R012 and R014 have only a few cases | Add a `rules.<RULE_ID>.test.ts` file for each |
| No browser E2E tests | Playwright isn't installed. Component and integration tests run in happy-dom, so they can't catch real layout, CSS or `next/image` behavior | Add Playwright for a smoke flow once the UI settles |
| Changed files capped at 30 per PR (deferred) | Out of scope for now; documented in README → Known Limitations. Two `it.fails` tests in `github.test.ts` will start failing once pagination lands | Flip them to `it` when fixed |
| Biome skips large test files | `files.maxSize` is 10 KB, so `rules.R007.test.ts`, `analysis.test.ts` and `github.test.ts` aren't linted | Raise `files.maxSize`, or split the files further |
| `.vue` / `.svelte` / `.astro` not scanned for HTML injection (KNOWN GAP) | Decided 2026-11-23: they aren't JS/TS files, so the other code-pattern rules stay off, but they should be scanned for the innerHTML part of R016. Today the JS/TS-only gate skips them entirely. 6 `it.fails` in `rules.R016.test.ts`: 3 DOM sinks in `<script>` (`innerHTML`, `outerHTML`, `document.write`) and 3 framework raw-HTML directives (`v-html`, `{@html}`, `set:html`) | Run the HTML-injection patterns of R016 on these files; add patterns for the three directives |
| Dockerfile edge cases (untested, low priority) | `Dockerfile.md` and `Dockerfile.json` count as Dockerfiles (unquoted values flagged). The old `ENV KEY value` form and `*.Dockerfile` names (`api.Dockerfile`) aren't detected | Not decided; reported to the user |
| camelCase secret names (deferred) | Some real camelCase names are missed and camelCase placeholders are flagged. See README → Known Limitations | No tests yet; add them with the fix |
| No CI | There's no `.github/workflows`, so nothing runs tests automatically | Add a GitHub Actions job that runs the Pre-Commit commands |

## Resources

- [Vitest Docs](https://vitest.dev)
- [Vitest API](https://vitest.dev/api/)
