# Testing Standards

**Vitest** for unit and integration testing. **49 tests** covering all backend modules.

## Quick Start

```bash
npm test              # Watch mode
npm test -- --run     # Run once
npm run test:ui       # Browser UI
npm run test:coverage # Coverage report
```

## Test File Organization

```
lib/__tests__/
  ├── url.test.ts
  ├── response.test.ts
  ├── github.test.ts (with mocks)
  ├── integration.test.ts
  └── fixtures.ts (mock data)

app/__tests__/
  ├── api-pr.test.ts
  └── fixtures.ts
```

## Test Structure (AAA Pattern)

```typescript
describe("Feature", () => {
  describe("behavior", () => {
    it("should do X", () => {
      // Arrange - setup
      const input = "test";

      // Act - execute
      const result = func(input);

      // Assert - verify
      expect(result).toBe("expected");
    });
  });
});
```

## Best Practices

1. **Descriptive names** - `it("should return null for invalid URL")`
2. **Nested describes** - Organize related tests
3. **Isolated tests** - Mock external dependencies
4. **Edge cases** - Empty, null, large values
5. **Error handling** - Test both success and failure paths

## Mock Data Organization

Extract large mocks to `fixtures.ts` for reusability:

```typescript
// lib/__tests__/fixtures.ts
export const octokit = {
  pullsGetSuccess: { data: {/* ... */} },
  pullsGetWithLabels: { data: {/* ... */} },
};
export const errors = {
  notFound: { response: { status: 404 } },
};

// lib/__tests__/github.test.ts
import { octokit, errors } from "./fixtures";

it("should fetch PR", async () => {
  mockPullsGet.mockResolvedValueOnce(octokit.pullsGetSuccess);
  // ...
});
```

**Benefits**: DRY, reusable, acts as API documentation.

## Type-Safe Mock Requests

```typescript
// types/request.ts - Define minimal interface
export interface RequestLike {
  json(): Promise<unknown>;
}

// app/__tests__/test-utils.ts - Create mocks
export function createMockRequest(body: unknown): RequestLike {
  return { json: async () => body };
}

// app/__tests__/api-pr.test.ts - Use in tests
import { createMockRequest } from "./test-utils";
const request = createMockRequest({ url: "..." });
const response = await POST(request); // No casting!
```

## Mocking with vi.hoisted()

Use `vi.hoisted()` to declare mocks before `vi.mock()` - no manual imports or casting needed:

```typescript
const { mockPullsGet, mockListFiles } = vi.hoisted(() => {
  return {
    mockPullsGet: vi.fn(),
    mockListFiles: vi.fn(),
  };
});

vi.mock("@octokit/rest", () => {
  return {
    Octokit: vi.fn(() => ({
      pulls: {
        get: mockPullsGet,
        listFiles: mockListFiles,
      },
    })),
    mockPullsGet,
    mockListFiles,
  };
});

// In tests - direct, typed access
mockPullsGet.mockResolvedValueOnce(data);
```

**Why hoisted?** Executes before `vi.mock()`, avoids closure issues, fully typed, no casting needed.

## Common Patterns

**Testing async functions:**

```typescript
it("should fetch successfully", async () => {
  mockFetch.mockResolvedValueOnce({ json: () => data });
  const result = await fetchData();
  expect(result).toEqual(data);
});
```

**Testing errors:**

```typescript
it("should handle errors", async () => {
  mockFetch.mockRejectedValueOnce(new Error("Network"));
  const result = await fetchData();
  expect("error" in result).toBe(true);
});
```

**Testing URL parsing:**

```typescript
it("should parse valid URLs", () => {
  const result = parsePRUrl("https://github.com/owner/repo/pull/123");
  expect(result?.owner).toBe("owner");
});
```

## Mock Lifecycle

```typescript
beforeEach(() => {
  vi.clearAllMocks(); // Clear call count and return values
});

afterEach(() => {
  vi.resetAllMocks(); // Reset to default mock function
});
```

## Type Safety in Tests

**Do NOT exclude tests from tsconfig.json** — they should pass TypeScript checks.

Proper `tsconfig.json`:

```json
{
  "exclude": ["node_modules"]
}
```

**If casting is needed** (e.g., `vi.mock` limitations), centralize in ONE helper with a comment:

```typescript
// getMocks() helper contains the casting
const { mockPullsGet } = await getMocks();  // No casting here
mockPullsGet.mockResolvedValueOnce(...);    // Typed access
```

## Coverage

Target: >80% statements, >75% branches, >80% functions/lines.

```bash
npm run test:coverage  # Generate HTML report in coverage/
```

## Pre-Commit

```bash
npm test -- --run && npm run build && git commit
```

Or with husky:

```bash
npx husky add .husky/pre-commit "npm test -- --run && npm run build"
```

## Config

`vitest.config.ts`:

- Environment: `happy-dom` (lightweight DOM)
- Globals: `describe`, `it`, `expect` available without imports
- Path aliases: `@/` resolves to project root
- Coverage: V8 provider, HTML reports

## Resources

- [Vitest Docs](https://vitest.dev)
- [Vitest API](https://vitest.dev/api/)
