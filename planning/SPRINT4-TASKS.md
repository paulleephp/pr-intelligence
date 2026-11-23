# Sprint 4 — Draft Task Briefs: impact analysis (carried over from Sprint 3)

DRAFT. Not ready to assign. Written during Sprint 3 planning, then deferred because the code search rate limit (about 10 searches per minute) caps analysis at roughly 10 changed files per PR. Before assigning, settle the open items in SPRINT4.md ("Carried over from Sprint 3"): the rate-limit design, and whether to search deleted files and skip added ones.

Sprint 3 T2 (Zod schemas) is a prerequisite for S4-T4.

## Wave 2: Impact analysis (backend)
**Decision:** affected files come from GitHub code search (`search.code`). No repo source downloads and no repo file list. Search covers the default branch only; open PRs aren't searched.

**GitHub limits that shape these tasks** (coder: confirm against current GitHub docs before building):
- The code search endpoint has its own low rate limit, about 10 requests per minute for an authenticated user at time of writing. That's why searches are capped per PR.
- Only the default branch is indexed. Files added in this PR have no importers there yet. Very large files and some forks aren't indexed.
- Requesting the `application/vnd.github.text-match+json` media type returns the matching snippets. That lets us confirm a hit is an import line without downloading the file.

### S4-T1. Code search client (spec 1.1)
**Role:** Coder
**Files:** `lib/github/client.ts`, `lib/github/constants.ts`, types in `types/` or `lib/types/github/`

**Scope**
- Add `searchCode(owner, repo, term)`, which calls `search.code` with `q = "<term> repo:<owner>/<repo>"`, `per_page: 100`, and the text-match media type.
- Return the path and snippet fragments for each hit, plus `totalCount`, so the caller can tell when results were cut off.
- A rate-limit response (403/429) or a search failure must not fail the whole analysis. Return a typed "search unavailable / rate limited" result. The errors go through `lib/github/errors.ts` and are logged with `console.error`.
- Constants: page size, media type, and the per-PR search cap (`MAX_IMPACT_SEARCHES`, e.g. 10).

**Out of scope:** retries/backoff, caching, fetching more than one page.

**Acceptance:** a typed success result with paths and fragments, or a typed limited/failed result. It never throws to the route.

### S4-T2. Affected files from search results (spec 1.1, 1.2)
**Role:** Coder
**Files:** new `lib/impact/` (pure logic, no Octokit imports), types in `lib/types/impact/`

**Scope**
- **Which changed files to search:** JS/TS source files with status modified, renamed or removed. Removed files matter because their importers are now broken. Skip added files (they aren't on the default branch yet), test files and non-JS/TS files.
- If there are more candidates than `MAX_IMPACT_SEARCHES`, search the ones with the most changed lines first. Record the rest as `skipped: "search-cap"`.
- **Search term:** the file's basename without extension (`token-service`). For an `index.*` file, use its folder name (`src/auth/index.ts` → `auth`).
- **Confirm each hit** using its snippets. It counts only if a fragment contains an `import … from`, `export … from`, `require(` or `import(` whose specifier ends in `/<term>` or `/<term>/index` (with or without extension). That covers relative paths and aliases like `@/lib/...` without resolving them. Drop hits that aren't JS/TS files, and drop the changed file itself.
- **Output per affected file:** its path, which changed file it depends on, the matching import line as the reason, and `alsoChanged: true` if it's also in the PR.
- **Direct dependents only.** A second level would multiply searches into the rate limit. The spec's "avoid circular loops" item doesn't apply at one level.
- When `totalCount` exceeds what we got back, mark the result as `truncated` so the UI can say "showing first 100".

**Known limitations (add to README Known Limitations):**
- Results come from the default branch.
- A basename shared by many files (`utils`, `index` in `src/`) can produce a lot of hits. Snippet checking filters most of them, but a match is not a guarantee.
- Imports written without the basename (e.g. a barrel `from "@/lib"`) aren't found.

**Acceptance (pure functions, fixture search results):**
- An import of `./token-service` in a snippet is confirmed as a dependent.
- A comment that merely mentions `token-service` is not confirmed.
- `@/auth/token-service` and `../auth/token-service.js` are both confirmed.
- An `index.ts` change searches by folder name.
- The cap, the skip reasons and `truncated` are reported correctly.

### S4-T3. Suggested tests (spec 1.3)
**Role:** Coder
**Files:** `lib/impact/`

**Scope:** take tests from S4-T2's confirmed dependents. A dependent whose path matches test conventions (`*.test.*`, `*.spec.*`, `__tests__/`, `test/`, `tests/`) is a suggested test. Each one keeps its reason ("imports token-service"). Also include test files changed in the PR itself.

**Why no file list:** this needs no extra request and works on repos with 30k+ files. Tests that never import the changed file aren't suggested. That's an accepted gap, since the spec says these are only suggestions.

**Acceptance:** test files come out separately from affected source files, with no duplicates, and each has a reason.

### S4-T4. API integration
**Role:** Coder
**Files:** `lib/github/pr-metadata/get.ts`, `lib/types/pr/metadata.ts`, `lib/schemas/` (after Sprint 3 T2)

**Scope:**
- Add `impact: { affectedFiles, suggestedTests, skipped, status }` to the analysis response.
- `status` is one of `"complete" | "partial" | "rate-limited" | "unavailable"`.
- Run the searches one after another (sequentially) to stay within the rate limit.
- If impact analysis fails, the rest of the analysis is still returned unchanged.
- Extend the Zod schema.

**Acceptance:** the response validates, existing fields are unchanged, and a rate-limited run returns `status: "rate-limited"` along with any results gathered before the limit hit.

**Tester follow-up for wave 2:** unit tests for S4-T2 and S4-T3 with fixture search results, plus an integration test for S4-T4 with `search.code` mocked (success, rate limited, truncated).

## Wave 3: Frontend (after S4-T4)
### S4-T5. Affected Areas section (spec 2.1)
- Group by the categories we already detect (Auth, Database, CI/CD…), with changed files and affected files listed separately.
- Each affected file shows its reason (the import line) and an "also changed in this PR" marker.
- Show notices for `partial`, `rate-limited`, skipped files ("not searched: limit reached") and `truncated`.

### S4-T6. Suggested Tests section (spec 2.2)
- A list of links to the test files on GitHub at the base branch, each with its reason. File contents aren't shown.
