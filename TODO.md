# TODO

- Reject PRs with more than 3,000 changed files instead of analyzing them (decided 2026-11-23).
  - Read the total from `changed_files` in `pulls.get` (add it to `fetchPRMetadata`). Don't use the length of the paginated `listFiles` result: GitHub stops at 3,000 files, so that length can never be over 3,000.
  - Check the count before calling `fetchChangedFiles`, so oversized PRs skip the file requests.
  - Choose the status code. The API contract (AGENTS.md, Key Decision 10) only allows 400, 401, 403, 404, 405, 429 and 500. Either use 400 with a clear `{ error }` message, or add 422/413 and update the contract, the frontend error handling (`lib/api.ts`) and the response validation.
  - Update README → Known Limitations: "Changed files capped at 3,000 per PR" becomes "PRs over 3,000 files are rejected".

- Overall risk reads as clean when nothing was scanned (found 2026-11-23).
  - When every file is unscanned (binary or no patch), the summary shows "Overall risk: No risks" (`app/components/PRSummary.tsx`) and Risk indicators says "No risky changes detected." (`app/components/RiskIndicator.tsx`). Each file is correctly marked "Not scanned", but the overall wording goes against Key Decision 2 (unscanned files are never shown as clean).
  - Files GitHub sends without a patch (binary, too large, pure rename, mode change, empty) stay unscanned: there is no other way to get their diff, so don't try (decided 2026-11-23).
  - Overall risk badge (decided 2026-11-23):
    - No file scanned and no findings: the badge shows "Unknown".
    - No file scanned, but a path rule fired on an unscanned file (e.g. R004 on a deleted migration, R001 on a renamed `auth/` file): the badge shows that finding's severity instead of "Unknown", since it's an obvious risk.
    - Some files scanned and some not: the badge shows a severity plus a caveat that not every file was scanned.
  - Open: the wording of that caveat, and which findings its severity comes from (only scanned files, or also path-rule findings on unscanned ones).
  - Open: what Risk indicators should say when no file was scanned or only some were, instead of "No risky changes detected."
  - Open: a PR with 0 changed files (e.g. the branch now matches base): "No risks" as today, or "Unknown"?
