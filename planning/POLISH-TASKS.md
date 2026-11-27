# Polish day: Task Briefs

Small fixes found by the user before Sprint 5's AI work. Branch from `origin/sprint-5`; PRs target `sprint-5`. PR titles: `[<id>] P<n>: <summary>`.

## P1. R007 flags identifiers that only contain "password" (backend, S)
**Role:** Coder (backend)
**Found on:** https://github.com/paulleephp/pr-intelligence/pull/26. The PR is reported as critical R007 ("password") for this added line in a type definition, which holds no secret:

```ts
  | "passwordHashingPatterns"
```

**Cause (for orientation; confirm it):** in `lib/diff/secret.ts`, the `password`, `apiKey` and `ssh` scans (`findNameMatch`) flag any added line whose lowercase text *contains* a keyword from `PASSWORD_PATTERNS`, `API_KEY_PATTERNS` or `SSH_PATTERNS` (`lib/diff/constants/patterns.ts`). There is no check that a value is assigned. So any identifier, string or type name containing `password`, `ssh`, `api_key`, … is reported as a critical secret.

**Scope**
- Flag a keyword line only when it looks like a secret being set: the keyword names a key or variable that is assigned a literal value (`=`, `:`, `:=`; quoted value in code, quoted or unquoted in `.env`/config/shell files, as the `secret` scan already distinguishes with `fileKind`).
- Don't flag: identifiers, type names, string literals, imports, property reads or function calls that merely contain a keyword, and assignments from a non-literal (a variable, `process.env.X`, a function call).
- Keep the existing `secret` (name and value) rules, `LOW_RISK_LINE` and test-path skipping as they are. Severity stays critical.
- If the keyword lists themselves are too broad (e.g. `ssh` as a bare substring), say so in the PR and propose a narrower form; don't change them silently.

**Acceptance**
- Not flagged:
  - `  | "passwordHashingPatterns"`
  - `type Keys = "password" | "apiKey";`
  - `const passwordHash = await bcrypt.hash(input, 10);`
  - `const password = process.env.DB_PASSWORD;`
  - `import { sshConfig } from "./ssh";`
  - `if (!user.password) return;`
  - `<input type="password" />`
- Flagged (R007, critical):
  - `const password = "hunter2xyz";`
  - `DB_PASSWORD=supersecret` in `.env`
  - `password: "s3cr3t-value"` in a config object
  - `apiKey = "abcd1234efgh5678"`
- `npm run check`, `npx tsc --noEmit` and existing tests pass. If existing tests pinned the old over-matching, list them in the PR for kimchi; don't edit test files.

**Decided in PR #34:**
- A name right after `type ` is skipped, so type aliases such as `type PasswordMode = "plain" | "hashed"` aren't flagged.
- Go's `:=` counts as an assignment.
- No longer flagged (for KNOWN-LIMITATIONS): a bare public-key line (`ssh-rsa AAAA…`; private key blocks are still caught), unquoted numbers in code (`password = 12345678`), and values under 4 characters.
- Bare `ssh` is too broad (`sshHost: "example.com"` is still critical): approved as P2.

**Review (banh-mi, changes requested, approved by the user):**
- Must fix: typed declarations (`const password: string = "…"`) are no longer flagged; a regex backtracking slowdown (one crafted 8 KB line: 8.2 s vs 0.2 s before; one-token fix verified by banh-mi).
- Optional: interface members (`passwordMode: "plain" | "hashed"`) are still flagged; `["password"]: "…"` keys and `??=` / `||=` are no longer flagged.
- Confirmed unchanged: quoted keys in JSON and JS, YAML `password: value`, unquoted values in `.env`, shell and config files are still flagged.

**Docs (mochi):** update `docs/KNOWN-LIMITATIONS.md` (R007) once merged. Besides the decided list above, add these no-longer-flagged forms (lowest priority for the user, since the focus is JS/TS):
- Dockerfile's legacy `ENV DB_PASSWORD value` (space, no `=`)
- a hyphen after the keyword, e.g. YAML `password-prod: value` (plain `password: value` is still flagged)
- an unquoted shell flag followed by more arguments, e.g. `mysql --password=hunter2xyz db` (an unquoted value must end the line so `x=foo bar` isn't read as a secret; a quoted value is still flagged)
- if optional item 2 isn't done: `["password"]: "…"` keys and `??=` / `||=`
- if the typed-declaration must-fix is somehow left out: typed declarations

**Tester follow-up:** kimchi adds the acceptance cases to the R007 tests.

## P2. Narrow the `ssh` keyword in R007 (backend, S) — approved for polish day
**Order:** after PR #34 merges (same files). boba may bundle it with P5 or do it right after; separate PRs are preferred.
**Scope:** in `SSH_PATTERNS` (`lib/diff/constants/patterns.ts`), drop bare `ssh`, `ssh-rsa` and `ssh-ed25519` (public key prefixes); add `ssh_key`, `ssh_private_key`, `ssh_passphrase` and their joined camelCase forms `sshkey`, `sshprivatekey`, `sshpassphrase` (matched lowercased, as `apikey` already is, so `sshKey`, `sshPrivateKey`, `sshPassphrase` are flagged); keep `private_key`, `private.key`. Check whether `openssh` is still useful as a name keyword and say so in the PR. Private key blocks stay caught by the `PRIVATE_KEY` value rule.
**Acceptance:**
- Not flagged: `sshHost: "example.com"`, `sshPort: "2222"`, `sshUser = "deploy"`, `deployKey: "ssh-ed25519 AAAA…"`.
- Flagged (critical): `ssh_private_key = "…"`, `sshKey: "…"`, `sshPrivateKey = "…"`, `SSH_PASSPHRASE=hunter2xyz` in `.env`, any `-----BEGIN OPENSSH PRIVATE KEY-----` line.
- `npm run check`, `npx tsc --noEmit` and tests pass.
**Accepted risk (user):** an SSH secret under a name with none of the specific keywords (e.g. `sshSecret`) may be missed; rare, judged very low risk. Note it in KNOWN-LIMITATIONS.
**Tester follow-up:** kimchi adds the acceptance cases.

## P3. App subtitle still says "AI-powered analysis" (frontend, XS) — approved
Found in the Pages site PR #36. Two places: the landing subtitle in `app/page.tsx` and the page `description` metadata in `app/layout.tsx`. The landing subtitle reads "…surface relevant tests with AI-powered analysis". The app doesn't use AI and doesn't suggest tests (Key Decision 15). Suggested: "Automate PR review investigation. Understand what changed, where it spreads, and which changes deserve a closer look." Wording approved by the user. Change both places to exactly that sentence. Branch `polish-p3` from `origin/sprint-5`; title `[takoyaki] P3: subtitle no longer claims AI or test suggestions`.

## P4. Retake the README and site screenshots (frontend, XS)
After P1 and P3 merge. The current screenshots show the old "AI-powered" subtitle and PR #26's false R007 "password" finding, which P1 fixes. Replace them in the README and the Pages site.

## P5. Scan only the first 300 characters of very long lines, and say so (backend + frontend, S) — approved for polish day
**Order:** after PR #34 merges (same files; #34 itself only takes banh-mi's one-token anchor fix). Separate PR from P2; whichever merges second rebases.
**Why:** found by banh-mi while reviewing #34, and it predates that PR. The generic `*_secret` name rules in `SECRET_NAME_RULES` (`lib/diff/constants/secret.ts`) backtrack quadratically on long dotted lines: about 0.9 s per 8 KB line. A PR with many such lines could stall the analysis request.
**Decision (user):** don't change the regex engine. RE2 was considered and rejected as too much complexity for this project. Instead, the secret scan (R007) checks only the first 300 characters of each added line, and the UI tells the user which lines were cut. A secret near the start of a long line is still caught, e.g. a Google Cloud service-account key (`"private_key": "-----BEGIN PRIVATE KEY-----\nMIIE…`, about 1,700 characters on one line).
**Scope**
- Backend (boba): in `lib/diff/secret.ts`, run all secret checks on only the first **300 characters** of each added line (user decision: past 300 characters a line is beyond human readability on screen, which is a problem of its own). A quoted value cut off at 300 has no closing quote: it must still count as a literal, so `token = "eyJhbGciOi…` (a long JWT) is still flagged. Return the cut lines per file (file and line numbers) in the analysis response, through the Zod schema. Other rules are unchanged.
- Frontend (takoyaki, after the backend PR merges): a neutral note, in the same style as "Not scanned", e.g. "2 lines in `dist/app.min.js` are over 300 characters; only their first 300 characters were checked for secrets." Not a finding, and it doesn't change severity.
**Acceptance**
- An 8 KB and a 100 KB single added line of `a.a.a.…`, and of `password.password.…`, are scanned quickly (under 50 ms in total) and listed as cut.
- Still flagged on a line over 300 characters: a private key header in the first 300 characters (service-account JSON), and a keyword assigned a long quoted value (`token = "<500-character JWT>"`). Not flagged: a secret that starts after character 300.
- A secret on a normal-length line is still flagged; all existing R007 tests pass.
- `npm run check`, `npx tsc --noEmit` and tests pass.
**Docs (mochi):** add the limit to `docs/KNOWN-LIMITATIONS.md` (R007): on lines over 300 characters, only the first 300 are checked, so a secret further along (e.g. in a minified file) isn't detected.
**Tester follow-up:** kimchi adds the long-line cases as a regression test.

## Site: GitHub Pages (urgent, done outside the sprint flow)
`docs/index.html`, `docs/site.css`, `docs/.nojekyll`, served from main `/docs` at https://paulleephp.github.io/pr-intelligence/ (PR #36 into main, takoyaki). Decisions: a light mode was designed for the site (the style guide is dark-only): the header band stays dark in both modes, and light-mode severity badges use the mark color for border and dot with neutral dark text. Add these values to STYLEGUIDE.md if the app gets a light mode.
