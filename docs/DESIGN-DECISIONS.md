# Design Decisions

Why PR Intelligence works the way it does. These are the shipped decisions, summarized for readers; the full, authoritative list (including planned ones) is in [AGENTS.md "Key Decisions"](../AGENTS.md#key-decisions-made). Known gaps are in [KNOWN-LIMITATIONS.md](KNOWN-LIMITATIONS.md).

- **Diffs come from the Git patch** GitHub returns for each changed file. Repository source is never downloaded.
- **Binary files aren't scanned.** They're listed as "Not scanned", never as clean. Path-based rules (e.g. R004 on a deleted migration) still run on them.
- **Severity display:** critical is its own level in bright red; high is orange, medium yellow, low sky, none grey. "None" means scanned with no findings.
- **PR state:** `open`, `closed` or `merged`. GitHub reports merged PRs as `closed` plus a `merged` flag; the app shows them as merged.
- **R003 and R004:** R003 flags migrations that are added as well as modified; R004 covers deleted migrations.
- **R005** runs only on recognised dependency manifests (by filename) and inspects their patch for packages added, removed or upgraded. Lockfiles are excluded.
- **R015** flags only writes to `window.location` (assignment, `.href =`, `.assign()`, `.replace()`) whose value isn't a plain relative or `http(s)` string literal, because a `javascript:` URL can run script in the user's browser. Code-execution sinks such as `eval()` are R016.
- **Affected Areas:** a file can appear in more than one area. Its badge in an area shows the highest severity among that area's findings, not the file's overall severity.
- **Blast radius isn't risk:** a large refactor can be wide but harmless, so blast radius has its own card with neutral colors and doesn't affect severity. There is no numeric score.
- **No impact analysis:** the app doesn't try to find other files affected by a PR or suggest tests outside it. GitHub code search is rate-limited to about 10 searches per minute, and downloading or cloning the repository doesn't fit the app's serverless hosting.
- **API:** `GET /api/pr?url=<PR URL>` returns PR metadata and `GET /api/pr/analysis?url=<PR URL>` returns changed files, summary and findings. Errors return `{ error }` with an HTTP status. Responses are validated with Zod before the UI uses them.
