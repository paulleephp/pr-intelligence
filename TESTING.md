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
  ├── rules.test.ts        # per-rule positive/negative cases
  ├── github.test.ts       # GitHub client (Octokit mocked)
  ├── integration.test.ts  # URL parsing + constants working together
  ├── api.test.ts          # lib/api.ts fetch client + lib/api-guards.ts (fetch stubbed)
  ├── response.test.ts     # lib/response.ts helpers
  ├── url.test.ts          # parsePRUrl
  └── fixtures.ts          # Octokit response mocks

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

Add per-rule tests to `rules.test.ts`, with one `describe` per rule ID. If it grows too large, split it by detector (`secret.test.ts`, `code.test.ts`, `categorize.test.ts`).

### Documenting known bugs with `it.fails`

When a test shows a real bug that belongs to the coder to fix, write the assertion for the **correct** behavior and mark it `it.fails`, with a `KNOWN BUG` comment. The suite stays green. Once the bug is fixed, the test starts failing, which tells you to change `it.fails` back to `it`. Don't loosen the assertion to match the buggy output.

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

Move large mocks into `fixtures.ts` so they can be reused. Fixture objects must be **typed with the real production types**. If a fixture no longer matches a type, `tsc` should fail.

```typescript
// lib/__tests__/fixtures.ts
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
  return { pulls: { get: mockPullsGet, listFiles: mockListFiles } };
});
```

**Why hoisted?** `vi.mock` is hoisted above imports, so normal top-level variables don't exist yet when the factory runs.

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

So `@/types/github/octokit` type-checks because tsc finds `lib/types/github/octokit.ts`. At runtime in Vitest it would fail, because `./types/github/octokit` doesn't exist. Type-only imports get erased, which hides the problem.

**In tests, always use full paths**: `@/lib/types/...`, `@/lib/github/...`.

Also, `@/lib/github` resolves to the **file** `lib/github.ts`, which is a re-export barrel, not the `lib/github/` directory.

## Type Safety in Tests

**Do NOT exclude tests from tsconfig.json.** They must pass `npx tsc --noEmit`.

If a cast is unavoidable (because of `vi.mock` limitations or deliberately invalid input), put it in ONE helper with a comment.

## Coverage

Target: >80% statements, >75% branches, >80% functions/lines.

```bash
npm run test:coverage  # HTML report in coverage/
```

## Pre-Commit

```bash
npm test -- --run && npx tsc --noEmit && npm run lint && npm run build
```

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
- Coverage: V8 provider; text, json, and html reporters

## Known Issues (as of 2026-11-22)

| Issue | Impact | Fix |
|---|---|---|
| Coverage % is inflated | Since Vitest 4, files no test imports are left out of the report, so the whole frontend and any untested lib file don't count | Set `coverage.include: ["lib/**/*.ts", "app/**/*.{ts,tsx}"]` in `vitest.config.ts` (expect the number to drop) |
| Rule coverage incomplete | R002, R003, R004, R005, R013, R015 and R016 have per-rule tests. R001, R006, R007, R009, R010, R011, R012 and R014 have only one or two cases each in `aggregate.test.ts` | Add them to `rules.test.ts` |
| No browser E2E tests | Playwright isn't installed. Component and integration tests run in happy-dom, so they can't catch real layout, CSS or `next/image` behavior | Add Playwright for a smoke flow once the UI settles |
| No CI | There's no `.github/workflows`, so nothing runs tests automatically | Add a GitHub Actions job that runs the Pre-Commit commands |

## Resources

- [Vitest Docs](https://vitest.dev)
- [Vitest API](https://vitest.dev/api/)
