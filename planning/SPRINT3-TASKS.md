# Sprint 3 — Task Briefs

Spec: `SPRINT3.md`. Every coder task follows `CODER.md` and `GUIDE.md`. Coders don't edit test files; tests belong to the tester agent.

Status: T1–T5 are all ready and can run in parallel (no shared files). Impact analysis (code search) moved to Sprint 4; draft briefs are in `SPRINT4-TASKS.md`.

---

## Wave 1: Cleanup (tasks are independent and can run in parallel)

### T1. Paginate changed files (spec 1.4)
**Role:** Coder
**Files:** `lib/github/client.ts`, `lib/github/constants.ts`, `README.md`, `TODO.md`

**Scope**
- In `fetchChangedFiles`, replace the single `pulls.listFiles` call with `githubClient.paginate(githubClient.pulls.listFiles, …)` using `per_page: 100`.
- Put the page size in `lib/github/constants.ts` (e.g. `CHANGED_FILES_PER_PAGE`).
- Keep the `ChangedFile` mapping and return type the same.
- GitHub returns at most 3,000 files per PR. Replace the README "Changed files capped at 30 per PR" limitation with a short note about the 3,000 cap.
- Remove the pagination item from `TODO.md`.

**Out of scope:** streaming, progress UI, caching.

**Acceptance**
- A PR with more than 30 changed files returns every file, up to GitHub's 3,000 cap.
- Output is the same as before for PRs with 30 or fewer files.
- Existing tests in `lib/__tests__/github.client.test.ts` still pass, or fail only because they mock `listFiles` directly. In that case, list the failing tests in your handoff so the tester can update the mocks.

**Tester follow-up:** mock `paginate` and cover the multi-page result and the empty-PR case.

---

### T2. Replace hand-written guards with Zod (spec 2.4)
**Role:** Coder
**Files:** new `lib/schemas/` (e.g. `pr-metadata.ts`, `pr-analysis.ts`), `lib/api.ts`, `types/ui/api.ts`, `app/api/_lib/request.ts`. Delete `lib/api-guards.ts` once nothing uses it.

**Scope**
- Write Zod schemas (zod **v4** is installed; check the v4 API) for `PRMetadata` and `PRAnalysisResponse`. Cover every rule `lib/api-guards.ts` checks today, e.g. `prChangeSummary` counts must be whole numbers ≥ 0, valid PR states, and `UnscannedReason` values.
- Keep the existing TypeScript types where they are. Tie each schema to its type with `satisfies z.ZodType<…>`, so the compiler reports any mismatch between them. Don't move types to `z.infer` in this sprint.
- `lib/api.ts`: `fetchPrData` takes a schema instead of a `ResponseGuard`. Use `safeParse`. On failure, `console.error` the issues and return `API_ERROR_MESSAGES.INVALID_SHAPE`, as it does today.
- Move `readErrorMessage` to a small Zod schema for the error body, or keep it as a helper. The behaviour must not change.
- `app/api/_lib/request.ts`: validate the `url` query param with a Zod schema (trimmed, non-empty) before `parsePRUrl`. Keep the same error messages and status codes.
- The schemas must be the single place where the response shape is defined. Wave 2 will add impact fields there.

**Out of scope:** changing the API response shape, validating responses on the server, validating GitHub/Octokit payloads.

**Acceptance**
- `lib/api-guards.ts` is deleted and nothing imports it.
- A response missing `fileTypes`, or with a negative or fractional count, produces the "unexpected format" error, not a render crash.
- Request errors (missing URL, invalid URL) are unchanged.
- `lib/__tests__/api.test.ts` and `app/__tests__/api-pr.test.ts` pass without edits, or the failing tests are listed in your handoff with the reason.

**Tester follow-up:** add schema-level tests for each rule that used to live in the guards.

---

### T3. R005 regression test (spec 1.5)
**Role:** Tester only. The fix is already in `lib/diff/dependency.ts` (`isDependencyManifest`).
**File:** `lib/__tests__/rules.R005.test.ts`

**Acceptance**
- `"apiVersion": "2.1"` added to a non-manifest JSON file (e.g. `k8s/config.json`, `tsconfig.json`) produces no R005 finding.
- A dependency-looking line (`"lodash": "^4.17.21"`) in a non-manifest JSON file produces no R005 finding.
- The same dependency line in `package.json` does produce R005.

---

### T4. Narrow R015 to unsafe `window.location` assignment (spec 1.5)
**Role:** Coder
**Files:** `lib/diff/change-detection.ts`, `lib/diff/code.ts`, `lib/diff/util/risk-scoring.ts`, README rules list (if any)

**Why:** R015 flags every `fetch`/`axios`/HTTP call. Whether a call is safe depends on validation and abort handling that a diff can't show, so those patterns are being removed. What's left is one risk that's easy to spot: assigning untrusted input to `window.location`. An attacker can supply a `javascript:` URL (e.g. `javascript:alert(document.cookie)`) and run code in the user's browser.

**Scope**
- Remove these from `RISKY_API_PATTERNS`: `fetch(`, `window.fetch(`, `axios`, `http(s)`, `got(`, `request(` and `document.createElement`.
- R015 matches **writes** to location only:
  - `window.location = …`, `window.location.href = …`, plus `document.`/`self.`/`top.` prefixes (not `==`/`===`)
  - `location.assign(…)` and `location.replace(…)`, with or without a `window.` prefix
- Reads such as `window.location.pathname` and `const { search } = window.location` are not flagged.
- Skip a plain string-literal target that's a relative path or an `http(s)://` URL (`= "/login"`, `.assign("https://example.com")`). A `javascript:` literal, a template literal with `${…}`, or any variable/expression is still flagged.
- Rename the constant to fit the new scope (e.g. `UNSAFE_NAVIGATION_PATTERNS`).
- Update the R015 condition to e.g. "Unsafe navigation: window.location assigned from a dynamic value", and raise its severity from medium to **high** (decided 2026-11-23; same as R016, since both are script-execution sinks).
- `eval()` is **not** added to R015. It's already covered by R016 (high).

**Out of scope:** tracing where the assigned value comes from (taint analysis), and `<a href>` or router navigation.

**Acceptance**
- `window.location.href = params.get("next")` → R015.
- `location.assign(url)` → R015.
- `window.location = "javascript:alert(1)"` → R015.
- ``window.location.href = `/users/${id}` `` → R015.
- `window.location.href = "/login"` → no R015.
- `if (window.location.pathname === "/")` → no R015.
- `fetch(url)`, `axios.get(url)` and `document.createElement("div")` → no R015.
- `eval(x)` → R016 only, not R015.
- R015 findings have severity `high`.

**Tester follow-up:** rewrite `lib/__tests__/rules.R015.test.ts` around the cases above. Its current tests assume `fetch`/`axios` are flagged.

---

## Wave 2: Frontend

### T5. Affected Areas section, changed files only (spec 2.1)
**Role:** Coder (frontend)
**Files:** new `app/components/AffectedAreas.tsx`, area mapping in `app/components/_lib/` (e.g. `areas.ts`), UI types in `types/ui/report.ts`, wired into `PRResults.tsx` or `PRDashboard.tsx`.

**Scope**
- Frontend only. No backend or response changes, because the data is already there.
- Map rule IDs from `analysis.category` (and `analysis.code` where relevant) to areas, keeping the mapping in one constant:
  - R001 → Auth
  - R003, R004 → Database
  - R006 → CI/CD
  - R009 → Configuration
  - R010 → Tests
  - R011 → Infrastructure
  - R014 → Security
- Show each area with its file count and the list of changed files (path, status, highest severity badge). A file can appear in more than one area.
- Files with no area finding aren't shown in this section. The changed-files table already lists everything.
- The section is hidden when no files map to an area.
- Follow `STYLEGUIDE.md` and the existing severity components (`SeverityBadge`), including critical as its own bright-red level.

**Out of scope:** potentially affected files (Sprint 4), new categories, backend changes.

**Acceptance**
- The areas and counts shown match the category findings in the API response.
- A file in both `auth/` and `security/` appears under both areas.
- The section doesn't render for a PR with no area findings.

**Tester follow-up:** component tests for the mapping, a file in more than one area, and the empty state.
