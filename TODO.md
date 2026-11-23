# TODO

- Reject PRs with more than 3,000 changed files instead of analyzing them (decided 2026-11-23).
  - Read the total from `changed_files` in `pulls.get` (add it to `fetchPRMetadata`). Don't use the length of the paginated `listFiles` result: GitHub stops at 3,000 files, so that length can never be over 3,000.
  - Check the count before calling `fetchChangedFiles`, so oversized PRs skip the file requests.
  - Choose the status code. The API contract (AGENTS.md, Key Decision 10) only allows 400, 401, 403, 404, 405, 429 and 500. Either use 400 with a clear `{ error }` message, or add 422/413 and update the contract, the frontend error handling (`lib/api.ts`) and the response validation.
  - Update README → Known Limitations: "Changed files capped at 3,000 per PR" becomes "PRs over 3,000 files are rejected".
