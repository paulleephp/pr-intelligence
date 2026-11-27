# Rules

The full rule table behind the checks listed in the [README](../README.md). Each finding in the app shows its rule ID.

Each rule has a fixed severity. A file's severity, and the PR's, is the highest severity among its findings. There is no numeric score.

| Rule | Flags | Severity | Applies to |
|------|-------|----------|------------|
| R001 | Authentication files modified | medium | Any file (path) |
| R002 | Authentication check potentially removed | high | JS/TS |
| R003 | Database migration added or modified | medium | Any file (path) |
| R004 | Database migration deleted | high | Any file (path) |
| R005 | Dependencies added, removed or upgraded | low | Dependency manifests |
| R006 | CI/CD workflow modified | medium | Any file (path) |
| R007 | Private key, API key or password pattern | critical | Any text file |
| R008 | More than 500 lines changed | medium | Not implemented |
| R009 | Production configuration modified | high | Any file |
| R010 | Test files removed | medium | Any file (path) |
| R011 | Infrastructure changes | medium | Any file (path) |
| R012 | Crypto algorithm changed | high | JS/TS |
| R013 | Password hashing changed | high | JS/TS |
| R014 | Security-sensitive path modified | high | Any file (path) |
| R015 | Unsafe navigation: `window.location` assigned from a dynamic value | high | JS/TS |
| R016 | Dangerous code execution or DOM sink introduced | high | JS/TS |
| R018 | Script changed with no content change: likely a permission change (e.g. `chmod +x`) | medium | Scripts (path) |

R017 was dropped before release and its ID is retired.

Rules and severities are defined in `lib/diff/util/risk-scoring.ts`.

What each rule misses or wrongly flags: [KNOWN-LIMITATIONS.md](KNOWN-LIMITATIONS.md).
