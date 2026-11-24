# Known Limitations

What PR Intelligence doesn't detect, or may flag wrongly. The analysis is deterministic and works from the PR diff only, so most limits come from what a diff can show. Rules and severities are summarized in the [README](../README.md#rules).

### Languages: JavaScript and TypeScript only

The rules target JavaScript and TypeScript projects. Supporting other languages (Python, PHP, Go, Ruby, Rust, Java/Kotlin, etc.) is out of scope.

- **Still in scope:** the non-code files a JS/TS project normally contains, such as `package.json`, `.env*`, YAML, shell scripts, `.envrc`, Dockerfiles, Terraform and CI workflows.
- **Existing checks for other languages aren't maintained.** Some are already in place, for example Python, Go, Rust, Ruby and Gradle dependency manifests (R005), Alembic migrations (R003/R004) and `os.environ` in secret detection (R007). They still run for now, but gaps in them won't be fixed. If one of them ever needs its tests changed, for any reason, the check and its tests are removed instead of updated.
- **Behaviour is designed around JS/TS rules.** Where languages disagree (for example, whether `"$name"` inside double quotes reads a variable), the JS/TS meaning wins.

### Changed files capped at 3,000 per PR

`fetchChangedFiles` in `lib/github/client.ts` pages through `pulls.listFiles` 100 files at a time, but GitHub returns at most 3,000 files per PR. Files beyond that aren't analyzed, and the report doesn't warn that the list was cut short.

### Unsafe navigation (R015)

R015 matches text on changed lines only, so:

1. **It can't tell whether a value was validated.** Any dynamic value assigned to `window.location` is flagged, even if it was checked against an allowlist elsewhere.
2. **A bare `location = url` isn't flagged.** Only `window.`/`document.`/`self.`/`top.`/`parent.`/`globalThis.` prefixed locations, `location.href =`, and `location.assign()`/`location.replace()` are matched.

### Dependency detection (R005)

R005 only checks files whose basename is a recognised dependency manifest (`package.json`, `go.mod`, `Cargo.toml`, `Gemfile`, `build.gradle(.kts)`, `pyproject.toml`, `Pipfile`, `requirements*.txt` / `requirements*.in`). Known gaps:

1. **Requirements files kept in a folder aren't detected.** Files such as `requirements/base.txt` or `requirements/dev.txt` aren't recognised, because only the filename is checked, not the folder.
2. **Some ecosystems aren't supported.** `setup.py`, `setup.cfg`, `composer.json` (PHP) and `pom.xml` (Maven) aren't in the manifest list. The detector also has no line patterns for their dependency formats, so supporting them needs both a filename entry and new patterns.

Both gaps are in non-JS ecosystems, so they're out of scope (see "Languages: JavaScript and TypeScript only" above) and won't be fixed.

Lockfiles (`package-lock.json`, etc.) are excluded on purpose.

### Secret names written in camelCase (R007)

Secret detection was built around `snake_case`, `SCREAMING_SNAKE` and `dot.case` names. camelCase names are handled inconsistently, in both directions:

1. **Some real camelCase secrets are missed.** The named rules and the catch-all `*_secret` rule need a `_` or `.` between words, so `githubToken`, `clientSecret`, `jwtSecret`, `stripeSecretKey` and `slackBotToken` aren't flagged. `github_token`, `client_secret` and the rest are. (`apiKey` and `dbPassword` *are* flagged, because those scans match a substring.)
2. **camelCase placeholders aren't recognised.** The test/mock/demo/example/todo/fixme filter needs the word to stand alone, so `mock_api_key = "…"` and `test_password = "…"` are skipped, but `mockApiKey = "…"` and `testPassword = "…"` are flagged.

Token values with a known format (`ghp_…`, `AKIA…`, `xoxb-…`, `sk_live_…`, private key headers) are detected whatever the variable is called.

Not fixed yet. The fix (splitting names on camelCase boundaries as well as `_` and `.`) touches every name rule and the placeholder filter.
### Path keywords (R001, R014) and infrastructure files (R011)

- **R001 and R014 match keywords at the start of a path segment.** A keyword counts when it's followed by a separator (`/`, `.`, `-`, `_`), a digit (`oauth2/`), or a camelCase capital (`AuthProvider.tsx`). A lowercase letter doesn't count, so `author.ts` and `authority/` aren't flagged.
- **Missed:**
  - a keyword in the middle of a name (`useAuth.ts`)
  - an all-caps acronym followed by a word (`SSOConfig.ts`, `AUTHProvider.ts`)
  - `AccessControl.ts`, because the keyword is `access-control`
- **Flagged, though not always sensitive:** camelCase names that start with a keyword, such as `sessionStorage.ts` or `loginIcon.svg`. This matches how `session-storage.ts` was already treated.
- **R011** covers Terraform (`.tf`, `.tfvars`, `.tf.json`) and Helm charts, including charts under `charts/<name>/` (`Chart.yaml`, `values*.yaml`/`.yml`, and `yaml`, `yml`, `tpl` and `txt` files under `templates/`). Terraform's `*.tfvars.json` isn't matched.

### Script permission changes (R018)

- GitHub's changed-file data doesn't include file modes, so R018 is a heuristic: it flags a modified file with no diff and 0 lines changed that looks runnable. That means a shell-script extension (`sh`, `bash`, `zsh`, `ksh`, `fish`, `command`) or any file under `bin/`, `scripts/`, `.husky/` or `.githooks/`. The message always says "likely".
- **Missed:** permission changes on other files, such as an extensionless script outside those folders, or a `.js` or `.py` file made executable. A permission change made together with a content change is also missed.
- **Possible false positive:** a file under those folders that GitHub reports without a diff for another reason, such as an updated binary under `bin/`.

### Blast radius

- **Files that don't count:** lockfiles, test snapshots, images and other assets, and files GitHub sends without a diff and with 0 lines changed: binaries, empty files, renames with no content change, and permission-only changes. A text file whose diff is too large to show still counts.
- **Renamed files** that also change content count only under their new path, because GitHub doesn't send the old path. A move between modules counts once.
- **Modules** are detected by folder convention (`src/auth`, `packages/ui`, …). Repos with an unusual layout may show more or fewer modules than a person would.
