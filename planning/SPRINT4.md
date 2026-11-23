Sprint 4 — Potential LLM integration

## Carried over from Sprint 3: impact analysis via GitHub code search

Decided so far:
- Find affected files with GitHub code search (default branch only; returns paths and snippets, no file downloads). Open PRs are not searched.
- Direct dependents only, no second level.
- Suggested tests come from code-search results (importers that are test files). No repo file list.
- Open: code search's rate limit (about 10 searches per minute) caps analysis at roughly 10 changed files per PR. Needs a design before building (e.g. batching several names into one query, caching, or queuing).
- Open: whether to search deleted files and skip files added in the PR.
- Draft task briefs: `SPRINT4-TASKS.md`.

Original Sprint 3 spec text:

  1.1 Source file relationship detection
  Identify relationships between changed files and other files in the repository.

  For the MVP, use:
  - Import statements.
  - Export statements.
  - Relative file paths.
  - Package dependencies.
  - Test file naming conventions.
  
Example:
```Typescript
// src/auth/auth-service.ts
import { validateToken } from "./token-service";
import { User } from "../models/user";
```

  - If src/auth/token-service.ts changes, identify auth-service.ts as a potentially affected file.
  - Function-level output (calls, events, shared state, security) moved to SPRINT4 §2. This sprint stays file-level.

  1.2 Affected file identification
  - Use the dependency map generated above to identify potentially affected files.

  - Example:
  Changed:
    src/auth/token-service.ts

  Potentially affected:
    src/auth/auth-service.ts
    src/middleware/auth-middleware.ts
    src/controllers/user-controller.ts

  - For the MVP, support direct dependencies and optionally one additional level of dependency traversal.
  - Avoid circular dependency loops.
  - Record why each file was identified.

  1.3 Map source files to relevant tests.
  scan project paths for potentially matching tests. There is no need to read the test contents. This will be a mere suggestion.


Frontend:
  2.2 Suggested tests section.
  - display potential tests related to the changes. There is no need to display the changes. link to the test file should be sufficient
  - Decided: suggestions come from file paths only (see 1.3). Test file contents are not read.

  - Affected files half of the Affected Areas section: list potentially affected files with the reason each was flagged.

### Core analysis
1. Secuirty invariant analysis
  - Question we are asking: Did this change weaken any existing security guarantees?
  - It can identify:
     - Password hashing cost reductions.
     - Cryptographic algorithm substitutions.
     - Disabled certificate validation.
     - Weakened JWT verification.
     - Removed authorization checks.
     - Changes to cookie security attributes.
     - Reduced rate-limiting protections.
   - Example data:
```json
{
  "security_controls": [
    {
      "category": "password_hashing",
      "location": "src/auth/password.ts",
      "algorithm": "bcrypt",
      "cost_factor": 10
    },
    {
      "category": "session_security",
      "location": "src/auth/session.ts",
      "http_only": true,
      "secure": true,
      "same_site": "strict"
    },
    {
      "category": "token_validation",
      "location": "src/auth/jwt.ts",
      "allowed_algorithms": ["RS256"],
      "issuer_validation": true,
      "audience_validation": true
    }
  ]
}
```

2. Change-impact analysis: What other parts of the system could be affected by this change?
   - Provide AI the dependancy graph made in Sprint 3 then it can ask itself:
     - Does the change invalidate assumptions made by callers?
     - Does it break downstream consumers?
     - Does it create an inconsistent state?
     - Does it bypass an existing security control?
     - Does it introduce a new attack surface?
   - Target output (moved from Sprint 3 §1.1):
```
PR changes:
  updateUser()

Relationships:
  updateUser()
    ├── called by: userController()
    ├── calls: validateUser()
    ├── modifies: users.email
    └── emits: UserUpdated event

Downstream:
  UserUpdated
    ├── consumed by: emailWorker()
    ├── consumed by: auditWorker()
    └── consumed by: searchIndexer()

Shared state:
  users.email
    ├── read by: authenticationService()

Security:
  updateUser()
    ├── authentication: required
    ├── authorization: required
    └── input validation: present
```
  
3. Backend deliverables
  1.1 Implement LLM provider abstraction.
  1.2 Design structured response schemas with Zod.
  1.4 Implement token budgeting. For this iteration we'll display how many tokens were used so that user is aware of the cost
  1.5 Validate and retry invalid responses.
  1.6 AI will have to return structure data with severity levels, structured file-level details
  1.7 we'll have to save the AI response in the database so that we don't call the AI endpoint repeatedly. I think it's good time to introduce Supbase to the project
  1.8 generate schema with proper migration

2. Frontend:
   - Display AI review findings in a separate section. We'll have to implement following on the frontend:
     - way for user to provide token to self-serve. We can stick to Chat GPT for the first iteration but in future iteration, we'll support more platform.
     - Loading and error states. Since AI requests will take a lot longer than typical API requests and can also fail due to token limit.
     - Display warning if the request is big.
   - Display Severity labels and file-level details, returned by the AI
   - If the AI API call was made, we should retrieve it and display it and hide the option to call AI endpoint if the result was non-empty


3. Testing:
| Rule coverage incomplete | R001, R012 and R014 have only a few cases (in `aggregate.test.ts` / `rules.js-ts-scope.test.ts`); R011 has none | Add a `rules.<RULE_ID>.test.ts` file for each |
| Dockerfile edge cases (untested, low priority) | `Dockerfile.md` and `Dockerfile.json` count as Dockerfiles. The old `ENV KEY value` form and `*.Dockerfile` names aren't detected | Not decided |
| camelCase secret names (deferred) | Some real camelCase names are missed and camelCase placeholders are flagged. See README → Known Limitations | Add tests with the fix |
Add a GitHub Actions job that runs the Pre-Commit commands