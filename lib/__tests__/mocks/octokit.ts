/**
 * Mock of @octokit/rest for lib/github tests.
 *
 * Load it through vi.hoisted so vi.mock's factory and the test share the same instances:
 *
 *   const { mockOctokit } = await vi.hoisted(() => import("./mocks/octokit"));
 *   vi.mock("@octokit/rest", () => ({ Octokit: mockOctokit }));
 */
import { vi } from "vitest";

export const mockPullsGet = vi.fn();
export const mockListFiles = vi.fn();

/** Mirrors Octokit's paginate(): request pages until one comes back short. */
export const mockPaginate = vi.fn(
  async (method: (params: object) => Promise<{ data: unknown[] }>, params: object) => {
    const perPage = (params as { per_page?: number }).per_page ?? 30;
    const all: unknown[] = [];
    for (let page = 1; ; page++) {
      const { data } = await method({ ...params, per_page: perPage, page });
      all.push(...data);
      if (data.length < perPage) return all;
    }
  },
);

// Vitest 4+: a mock invoked with `new` must use `function` (or `class`), not an arrow fn.
export const mockOctokit = vi.fn(function () {
  return { pulls: { get: mockPullsGet, listFiles: mockListFiles }, paginate: mockPaginate };
});

export type RawFile = { filename: string; status: string; additions: number; deletions: number; patch?: string };

/** A small modified .ts file with no findings: src/file-<i>.ts. */
export const rawFile = (i: number): RawFile => ({
  filename: `src/file-${i}.ts`,
  status: "modified",
  additions: 1,
  deletions: 0,
  patch: "@@ -1 +1,2 @@\n+const x = 1;",
});

/** Makes listFiles behave like GitHub: honours page/per_page (default 30) over a fixed file list. */
export const serveFiles = (files: RawFile[]) =>
  mockListFiles.mockImplementation(async ({ page = 1, per_page = 30 }: { page?: number; per_page?: number }) => ({
    data: files.slice((page - 1) * per_page, page * per_page),
  }));
