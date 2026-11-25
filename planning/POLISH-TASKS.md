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
- Open, for the user: bare `ssh` is too broad (`sshHost: "example.com"` is still critical). Proposal: narrow to `ssh_key`, `ssh_private_key`, `ssh_passphrase` (keep `private_key`), drop `ssh-rsa` and `ssh-ed25519`.

**Docs (mochi):** update `docs/KNOWN-LIMITATIONS.md` (R007) once merged.

**Tester follow-up:** kimchi adds the acceptance cases to the R007 tests.
