We'll continue using deterministic analysis without LLMs or AST parsing.

Constraint: do not download repository source files. Repos can have 30k+ files.

Decision (2026-11-23): impact analysis via GitHub code search moved to Sprint 4. The code search rate limit (about 10 searches per minute) would cap analysis at roughly 10 files per PR, which needs more design. Sprint 3 is cleanup only.

1. Backend deliverables
  1.1–1.3 Impact analysis and test mapping: moved to Sprint 4 (see SPRINT4.md, "Carried over from Sprint 3").

  1.4 Add pagination for Github PR files request. Now it's currently using 30 which is default value

  1.5 Tech debt items:
  - R005 can misfire: with no file-name check, a line like "apiVersion": "2.1" in any JSON file counts as a dependency.
    - Already fixed in code: `isDependencyManifest` gate in lib/diff/dependency.ts. Remaining: regression test.
  - R015 matches on text, so it flags guarded fetch calls too.
    - Decided: guardrails (validation, abort) can't be detected reliably from a diff, so fetch/axios/HTTP/document.createElement patterns are removed. R015 keeps only unsafe window.location assignment (javascript: URL injection), with severity raised to high. eval() stays in R016, which already covers it.
  - Code-pattern rules only run on JS/TS files. Already done (lib/diff/core.ts, JS_TS_FILE_PATTERN).

2. Frontend deliverables:
  2.1 Affected areas section (merged with former 2.3).
  - Group changed files by the categories we already detect (e.g. Auth, Database, CI/CD).
  - Potentially affected files (from impact analysis) are added in Sprint 4.

  2.2 Suggested tests: moved to Sprint 4.

  2.4. Add Zod validation to the API request/response validation
  - Current guardrails checks at runtime with plain type-guard functions, for example prChangeSummary counts must be whole numbers of 0 or more. Every API response goes through a guard before the UI uses it. A response that fails, such as from a stale server missing fileTypes, becomes a clear "unexpected format" error instead of a component crashing mid-render. It does by hand what Zod would do, and could be swapped for Zod schemas.