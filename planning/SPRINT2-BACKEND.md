## Day 2 — Diff analysis engine

Backend:
1. Build independent diff parser. - Done
2. Categorize modified files. - Done
3. Calculate change statistics. - Done
4. Detect potentially sensitive changes. Goal: Identify what kind of code or configuration has changed.
  A. Initial Dectors - Done
    |Detector|	Method|
    |--|--|
    |Sensitive file modified|	Path patterns|
    |Authentication/authorization code removed|	Removed-line patterns|
    |Dangerous API introduced	| Added-line patterns|
    |Potential secret added	|Added-line patterns|
    |Dependency changed	|Filename + package metadata|
    |Destructive database operation introduced	|Added-line patterns|
  B. Use file paths to identify sensitive areas of the codebase. - Done.
    - For example, changing src/auth/session.ts is a sensitive change because it affects authentication. Whether that change is high risk depends on additional signals, such as whether authorization checks were removed or token expiration logic was modified.
    - Patterns to look out for:
      |Category | Path | patterns |
      |-|-|
      Authentication	**/auth/**, **/login/**, **/session/**
      Authorization	**/permission/**, **/access-control/**, **/rbac/**
      Database	**/migration/**, **/schema/**, **/database/**
      Security	**/security/**, **/crypto/**, **/encryption/**
      Configuration	.env*, **/*.config.*, Dockerfile
      Dependencies	package.json, package-lock.json
      CI/CD	.github/workflows/**, Dockerfile, docker-compose*
      Infrastructure	terraform/**, k8s/**, helm/**
  C. some files deserve attention regardless of their directory. - Done
    - Examples:
      - package.json
      - package-lock.json
      - .npmrc
      - .env
      - tsconfig.json
      - Dockerfile
      - docker-compose.yml
      - webpack.config.js
  D. Change-level detection - Done
    - removing auth check from a page is a simple but clear example.
    - A change-level detector could recognize:
      - Removal of an authentication check.
      - Removal of an authorization condition.
      - Changes to permission validation.
      - Changes to password hashing configuration.
      - Changes to cryptographic algorithms.
  - E: Secret detection: passwords or API key, SSH private key detection - Done
    - Important considerations:
      - Scan added lines, not deleted lines.
      - Exclude obvious placeholders and test fixtures where possible.
      - Never print the detected secret into logs or reports.
      - Report the file and line number, not the credential itself.
      - Treat findings as potential secrets, not confirmed credentials.
  
1. Implement deterministic risk indicators. -Done
  - Goal: Evaluate why those changes might introduce risk, using explicit rules.
  - Initial data:
    Rule	Condition	Severity
    R001	Authentication files modified	Medium
    R002	Authentication check potentially removed	High
    R003	Database migration modified	Medium
    R004	Database migration deleted	High
    R005	Dependencies added or upgraded	Low
    R006	CI/CD workflow modified	Medium
    R007	Private key/api key pattern detected	Critical
    R008	Production configuration modified	High
    R009	Test files removed	Medium
    R010  Security changes Medium
    R011  Infrastructure changes Medium
    R012
    R013
  - calculate an overall PR risk assessment.
  - distinguish between:
    - Individual finding severity.
    - Overall PR risk.
    - Confidence in the detection.
  - For example, a PR could have:
    - Two medium-risk database changes.
    - One high-risk authentication change.
    - Three low-risk dependency changes.
  - Your report should preserve all six findings rather than collapsing them into one number.
  - Also, consider avoiding double-counting. If one authentication file triggers five related rules, that doesn't necessarily mean the PR is five times riskier.
  - For the first version, I'd present the highest severity as the overall PR risk label

