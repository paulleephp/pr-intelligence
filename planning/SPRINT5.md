Sprint 5 — Review workflow and error recovery

> **TENTATIVE DRAFT (2026-11-24).** Adapted from the original Day 5 handout. Not committed as a direction. Expect heavy trimming once Sprint 4 (LLM integration, database) settles. Everything about the LLM stage depends on Sprint 4's outcome.

Objective: run the existing steps (fetch, analyze, classify, AI review) as one workflow that survives failures partway through. Each stage saves its result. A retry resumes from the failed stage instead of starting over.

Prerequisites from Sprint 4: database (Supabase), LLM provider abstraction, Zod response schemas, code search impact analysis.

---

## 0. Decide first (blocks everything below)

### 0.1 What runs the workflow?
A Next.js route handler lives for one request, while the LLM and code search stages can be slow or rate-limited. Options:

| Option | How it works | Trade-off |
|---|---|---|
| A. Client-driven | The browser calls one endpoint per stage (`POST /api/review/:id/advance`). Each call runs the next pending stage and saves its result. | No job infrastructure. Simple. Stops if the user closes the tab, but resumes when they return. |
| B. Background job + polling | Start the run, return an ID, and the frontend polls `GET /api/review/:id`. | Survives tab close, but needs a job runner. Vercel functions have execution time limits. |
| C. Queue (e.g. a Supabase-backed queue, Inngest) | Each stage is a queued job. | Most robust. Most new infrastructure. |

Leaning: **A** for the first version. It fits "progressive enhancement", and stages already being independent makes it a small step to B later.

### 0.2 Is a full workflow worth it here?
Fetching and deterministic analysis are fast and cheap. Only two stages fail in practice:
- **CLASSIFYING:** code search rate limit
- **REVIEWING:** LLM timeouts, token limits, invalid output

If Sprint 4 shows that caching the AI response (SPRINT4 1.7) covers most of the pain, this sprint may shrink to "persist and retry the LLM and code search stages only".

---

## 1. Stages

Four stages. `VALIDATING` and `COMPLETED` from the original handout are dropped:
- Validating the AI output is part of REVIEWING. Re-validating the same invalid response can't fix it; only a new LLM call can (SPRINT4 1.5 "validate and retry").
- "Completed" is an end state, not a stage. Each stage already saves its own output.

| Stage | Receives | Produces | Existing code |
|---|---|---|---|
| FETCHING | PR URL (owner, repo, number) | PR metadata (incl. `head.sha`) and changed files | `lib/github/client.ts` |
| ANALYZING | Changed files | Findings, aggregate, change summary, file types | `lib/diff/core.ts` (`analyzeDiff`, `summarizePr`) |
| CLASSIFYING | Changed files + PR metadata | Affected files (with reasons), suggested tests, search status | Sprint 4 impact analysis |
| REVIEWING | `ReviewContext` (see §4) | Validated AI findings, token usage | Sprint 4 LLM layer |

Each stage is a plain async function with typed input and output. It takes no hidden shared state and never calls another stage.

---

## 2. Workflow state

One record per run, plus one record per stage. The progress UI is drawn straight from the stage list.

```ts
type StageName = "FETCHING" | "ANALYZING" | "CLASSIFYING" | "REVIEWING";
type StageStatus = "PENDING" | "RUNNING" | "COMPLETED" | "FAILED" | "SKIPPED";
type RunStatus = "PENDING" | "RUNNING" | "COMPLETED" | "FAILED";

interface StageRecord {
  name: StageName;
  status: StageStatus;
  attempts: number;
  startedAt: Date | null;
  finishedAt: Date | null;
  error: StageError | null;
}

interface StageError {
  kind: ErrorKind;        // see §3
  message: string;
  retryable: boolean;
}

interface ReviewRun {
  id: string;
  owner: string;
  repo: string;
  prNumber: number;
  headSha: string;        // results are only valid for this commit (see §3.3)
  status: RunStatus;
  stages: StageRecord[];  // fixed order
  createdAt: Date;
  updatedAt: Date;
}
```

- The current stage is the first stage that isn't `COMPLETED`. It isn't stored separately.
- `SKIPPED` covers stages that can't run in the current setup (e.g. no LLM token provided), so the run can still complete with deterministic results only.

Stage outputs are stored separately from the run record (one row or JSON column per stage), keyed by run ID and stage name.

---

## 3. Error recovery

### 3.1 Error kinds

| Kind | Examples | Auto-retry? | User retry? |
|---|---|---|---|
| `transient` | Network error, timeout, 5xx | Yes, up to 3 attempts with backoff | Yes |
| `rate-limited` | GitHub code search limit, LLM 429 | No auto-retry. Wait for the reset time. | Yes, after reset (show when) |
| `invalid-output` | LLM response fails the Zod schema | Limited by SPRINT4 1.5's retry count, then stop | Yes |
| `auth` | Bad GitHub or LLM token | No | Only after fixing the token |
| `not-found` | PR deleted or private | No | No |
| `budget` | Context over the token budget after trimming | No | No (a code change is needed) |

Automatic retries (inside one attempt) and user-triggered retries (the Retry button) are separate. Each has its own limit.

### 3.2 Resume
On Retry:
1. Find the first stage that isn't `COMPLETED`.
2. If its error isn't retryable, refuse with a clear message.
3. Load saved outputs of earlier stages.
4. Run the stage. On success, continue to the next one.

Completed stages are never re-run on resume.

### 3.3 Stale results
Before resuming, check the PR's current `head.sha`. If it changed (new commits pushed), the saved results describe old code. Start a new run, and keep the old one for history.

### 3.4 Concurrent runs
Only one active run per (owner, repo, PR, head SHA). A second Start or Retry while a stage is `RUNNING` returns the existing run instead of starting another. A `RUNNING` stage older than a timeout is treated as failed (`transient`), so a crashed run doesn't block forever.

---

## 4. LLM context

REVIEWING receives a `ReviewContext` built from earlier stage outputs. It doesn't fetch anything itself.

```ts
interface ReviewContext {
  pullRequest: { title: string; body: string };   // body: PRMetadata doesn't fetch it yet
  findings: Pattern[];                            // existing type, not a new RiskFinding
  affectedFiles: AffectedFile[];                  // keep the reason, not just paths
  suggestedTests: SuggestedTest[];
  diffContext: string;                            // selected hunks, trimmed to budget
}
```

- Build it in one function (`buildReviewContext`) that enforces the Sprint 4 token budget. Lower-priority items are trimmed first; the priority order is to be decided after Sprint 4.
- The final context size and what got trimmed are saved with the REVIEWING output, so the UI can show it.

---

## 5. API (assuming option A)

| Endpoint | Purpose |
|---|---|
| `POST /api/review` | Start a run for a PR URL, or return the active run for the same PR and head SHA |
| `POST /api/review/:id/advance` | Run the next pending stage |
| `POST /api/review/:id/retry` | Retry the failed stage (§3.2) |
| `GET /api/review/:id` | Run status, stage records and available outputs |

The existing `GET /api/pr` and `GET /api/pr/analysis` stay as they are. The workflow reuses their logic and doesn't replace them.

---

## 6. Frontend

- A progress list with one row per stage: status, duration and attempt count.
- On failure, show the error message, whether it's retryable, and a Retry button (disabled for non-retryable errors, with a countdown for `rate-limited`).
- Results appear as each stage completes. Deterministic results show without waiting for the AI review.
- A notice when the PR has new commits since the run started (§3.3).

---

## Open questions
- Option A, B or C for running the workflow (§0.1)?
- Is the full workflow needed, or only persistence and retry for CLASSIFYING and REVIEWING (§0.2)?
- How long are runs kept, and are old runs shown as history?
- Should the "mark as safe" overrides in PENDING_NEW_FEATURES.md live on the run, or across runs for the repo?
