Later (unscheduled) — Review workflow and error recovery

> **TENTATIVE DRAFT (2026-11-24).** Adapted from the original Day 5 handout. Not committed as a direction. Expect heavy trimming once Sprint 4 (LLM integration, database) settles. Everything about the LLM stage depends on Sprint 4's outcome.

Objective: run the existing steps (fetch, analyze, classify, AI review) as one sequential workflow that survives failures partway through. Each stage saves its result. A retry resumes from the failed stage instead of starting over. Progress and history survive a server restart.

Prerequisites from Sprint 4: database (Supabase/PostgreSQL), LLM provider abstraction, Zod response schemas, code search impact analysis.

> **Outdated (2026-11-24):** moved out of Sprint 6, which is now the AI assessment (`SPRINT6.md`). Code search impact analysis was dropped (Key Decision 15), there is no database yet (the verdict cache is deferred), and the AI design changed. References below to code search, the CLASSIFYING stage's affected files and suggested tests, and the code-search rate limit no longer apply. Revisit only after the AI assessment ships.

---

## 0. Decide first (blocks everything below)

### 0.1 What drives the workflow?
A Next.js route handler lives for one request, while the LLM and code search stages can be slow or rate-limited. Options:

| Option | How it works | Trade-off |
|---|---|---|
| A. Client-driven | The browser calls one endpoint per stage (`POST /api/review/:id/advance`). Each call runs the next pending stage and saves its result. | No job infrastructure. Stops if the tab closes, but resumes when the user returns, because state is in the database. |
| B. Background job + polling | Start the run, return an ID, and the frontend polls `GET /api/review/:id`. | Survives tab close, but needs a job runner. Serverless functions have execution time limits. |
| C. Queue / worker service | Each stage is a queued job. | Most robust. The handout explicitly advises against it at this stage. |

Leaning: **A**. It's the only option that works with bring-your-own-key without storing the key (§0.3). It also matches the handout's "a sequential workflow with persisted stage results is sufficient". The coordinator (§2) doesn't depend on route handlers, so moving the deterministic stages to B later would only change who calls `advance`. REVIEWING would stay user-triggered because of §0.3.

Check before choosing: the REVIEWING stage must fit within one request's time limit on the hosting platform, or A won't work for it.

### 0.2 Is a full workflow worth it here?
Fetching and deterministic analysis are fast and cheap. Only two stages fail in practice:
- **CLASSIFYING:** code search rate limit
- **REVIEWING:** LLM timeouts, token limits, invalid output

If Sprint 4 shows that caching the AI response (SPRINT4 1.7) covers most of the pain, this sprint may shrink to "persist and retry the LLM and code search stages only".

### 0.3 Bring your own LLM key
Decided: the user provides their own LLM API key, and **nothing stores it**: not the database, server memory between requests, or logs.
- The key travels with each request that runs REVIEWING (`advance` or `retry`), in a request header, and is used only for that request.
- This is why option A fits. B and C run stages later without the user's request, so they would need the key stored somewhere.
- Where the browser keeps the key during a session (memory only vs `sessionStorage`) is a Sprint 4 decision (SPRINT4 frontend: "way for user to provide token").
- No key provided → REVIEWING is `SKIPPED` and the run completes with deterministic results.

---

## 1. Stages

Four stages. `VALIDATING` and `COMPLETED` from the original handout are dropped:
- Validating the AI output is part of REVIEWING. Re-validating the same invalid response can't fix it; only a new LLM call can (SPRINT4 1.5 "validate and retry").
- "Completed" is an end state, not a stage. Each stage already saves its own output.

| Stage | Receives | Produces | Existing code |
|---|---|---|---|
| FETCHING | PR reference (owner, repo, number) | PR metadata (incl. `head.sha`) and changed files | `lib/github/client.ts` |
| ANALYZING | Changed files (with patches) | Findings, aggregate, change summary, file types | `lib/diff/core.ts` (`analyzeDiff`, `summarizePr`) |
| CLASSIFYING | Changed file list (names, status, line counts) + PR metadata | Affected files (with reasons), suggested tests, search status | Sprint 4 impact analysis |
| REVIEWING | `ReviewContext` (see §5) | Validated AI findings, token usage | Sprint 4 LLM layer |

Each stage is a plain async function with typed input and output. It takes no hidden shared state and never calls another stage.

---

## 2. Coordinator

The coordinator lives in `lib/workflow/`, independent of Next.js. It owns execution order, state transitions, persistence, retries and recovery. Route handlers only start, advance or read a run.

```ts
startRun(pr: PRReference): Promise<ReviewRun>   // or return the active run (§4.4)
advance(runId: string): Promise<ReviewRun>      // run the next pending stage
retry(runId: string): Promise<ReviewRun>        // retry the failed stage (§4.2)
getRun(runId: string): Promise<ReviewRunView>   // run + latest attempt per stage + outputs
```

For tests and option B, a `runToCompletion(runId)` helper calls `advance` until the run is done or fails.

### Valid transitions

**Run:**
- `PENDING → RUNNING` (first `advance`)
- `RUNNING → COMPLETED` (last stage done)
- `RUNNING → FAILED` (a stage failed after its automatic retries)
- `FAILED → RUNNING` (user retry, if retryable)

**Stage attempt:** `RUNNING → COMPLETED | FAILED`. Attempts are never updated after they finish. A new attempt is a new row.

Any other transition is rejected and logged. This is unit-tested without a database (in-memory repository).

---

## 3. State and execution log

The handout's "workflow stage" table and its "execution log" are the same thing when every stage **attempt** is its own row. One append-only list then gives:
- current progress: the latest attempt for each stage
- history: every attempt, in order, with durations and errors

```ts
type StageName = "FETCHING" | "ANALYZING" | "CLASSIFYING" | "REVIEWING";
type AttemptStatus = "RUNNING" | "COMPLETED" | "FAILED" | "SKIPPED";
type RunStatus = "PENDING" | "RUNNING" | "COMPLETED" | "FAILED";
type AttemptTrigger = "initial" | "auto-retry" | "user-retry";

interface ReviewRun {
  id: string;
  owner: string;
  repo: string;
  prNumber: number;
  headSha: string;        // results only valid for this commit (§4.3)
  status: RunStatus;
  createdAt: Date;
  updatedAt: Date;
}

interface StageAttempt {
  id: string;
  runId: string;
  stage: StageName;
  attempt: number;        // 1, 2, 3… per stage
  trigger: AttemptTrigger;
  status: AttemptStatus;
  startedAt: Date;
  finishedAt: Date | null;
  durationMs: number | null;
  error: StageError | null;
}

interface StageError {
  kind: ErrorKind;        // §4.1
  message: string;        // safe to show to users; no secrets, no raw upstream bodies
  retryable: boolean;
  retryAfter: Date | null; // set for rate limits
}
```

- There's no stored `currentStage` (the handout has one). It's the first stage whose latest attempt isn't `COMPLETED` or `SKIPPED`, and storing it separately only lets it drift.
- `SKIPPED` covers stages that can't run in the current setup (e.g. no LLM key provided, §0.3), so a run can complete with deterministic results only.
- Stage outputs are stored with the attempt that produced them (§6), not on the run.

### What logs must never contain
- API keys, tokens, auth headers, including the user's LLM key. Verify that logged Octokit and LLM errors don't include request headers.
- Secret values found by R007 (see §6.2).
- Full diffs or patches. Log counts and file names instead.

`console.error` in caught errors (CODER.md) still applies, with the same restrictions.

---

## 4. Error recovery

### 4.1 Error kinds

| Kind | Examples | Auto-retry? | User retry? |
|---|---|---|---|
| `transient` | Network error, timeout, 5xx | Yes, up to 3 attempts with backoff | Yes |
| `rate-limited` | GitHub code search limit, LLM 429 | No. Wait for the reset time. | Yes, after `retryAfter` |
| `invalid-output` | LLM response fails the Zod schema | Limited by SPRINT4 1.5's retry count, then stop | Yes |
| `auth` | Bad GitHub token or bad user-supplied LLM key | No | Only after fixing the key |
| `not-found` | PR deleted or private | No | No |
| `budget` | Context still over the token budget after trimming | No | No (needs a code change) |

Automatic retries and user retries are separate mechanisms with separate limits. A maximum number of user retries per stage (e.g. 5) stops endless clicking from burning LLM budget. Both kinds of retry are recorded as attempts with their `trigger`.

### 4.2 Resume
On Retry:
1. Find the first stage whose latest attempt isn't `COMPLETED` or `SKIPPED`.
2. If its error isn't retryable, or the retry limit has been reached, refuse with a clear message.
3. Load the saved outputs of earlier stages (§6).
4. Run the stage as a new attempt. On success, continue to the next one.

Completed stages are never re-run on resume.

### 4.3 Stale results
Before resuming, check the PR's current `head.sha`. If it changed (new commits pushed), the saved results describe old code. Start a new run, and keep the old one for history.

### 4.4 Concurrent runs and restarts
- Only one active run per (owner, repo, PR, head SHA), enforced by the database (§6.1). A second Start or Retry while a run is active returns the existing run.
- An attempt left in `RUNNING` longer than a timeout (e.g. server restarted mid-stage) is marked `FAILED` with kind `transient` the next time the run is read or advanced. This is how a run recovers after a restart.

---

## 5. LLM context

REVIEWING receives a `ReviewContext` built from earlier stage outputs. It doesn't fetch anything itself.

```ts
interface ReviewContext {
  pullRequest: { title: string; body: string };   // body: PRMetadata doesn't fetch it yet
  findings: Pattern[];                            // existing type; secret values redacted (§6.2)
  affectedFiles: AffectedFile[];                  // keep the reason, not just paths
  suggestedTests: SuggestedTest[];
  diffContext: string;                            // selected hunks, trimmed to budget, R007 lines removed
}
```

- Build it in one function (`buildReviewContext`) that enforces the Sprint 4 token budget. Lower-priority items are trimmed first; the priority order is to be decided after Sprint 4.
- The built context is saved as the REVIEWING attempt's **input**. A retry of REVIEWING reuses it as-is, with no refetch and no re-analysis (Definition of done #2, #3). What got trimmed and the final size are saved too, so the UI can show them.

---

## 6. Persistence

Two tables, as in the handout, with JSONB for stage inputs and outputs. The client library (Supabase client vs Prisma, which the README lists as planned) is decided in Sprint 4.

### 6.1 Tables

**`review_run`**
| Field | Notes |
|---|---|
| `id` | |
| `owner`, `repo`, `pr_number`, `head_sha` | Instead of the handout's single `pullRequestUrl`, so active runs can be uniquely constrained |
| `status` | `RunStatus` |
| `created_at`, `updated_at` | |

Partial unique index on (`owner`, `repo`, `pr_number`, `head_sha`) where `status` is `PENDING` or `RUNNING`. This enforces §4.4. The handout's `currentStage` is dropped (§3).

**`stage_attempt`**
| Field | Notes |
|---|---|
| `id`, `run_id` | |
| `stage`, `attempt`, `trigger`, `status` | Unique on (`run_id`, `stage`, `attempt`) |
| `input` | JSONB. Only where reuse matters, i.e. REVIEWING's `ReviewContext`. Other stages' inputs are the previous stage's output, so they're not stored twice. |
| `output` | JSONB, set only when `COMPLETED` |
| `error` | JSONB `StageError` |
| `started_at`, `finished_at`, `duration_ms` | |

### 6.2 What is not stored
- **API keys.** LLM access is bring-your-own-key (BYOK): the user supplies their key and it is never stored, on the server or in the database (§0.3).
- **Secret values found by R007.** Today, R007 messages include the matched text (`Potential API key detected: ${pattern}` in `lib/diff/util/format-data.ts`), and other findings keep the whole added line as `evidence`. Before ANALYZING's output is saved or put into `ReviewContext`, redact the matched value in R007 messages and drop `evidence` on R007 findings. Lines flagged by R007 are left out of `diffContext`.
- **Full patches.** FETCHING's saved output keeps PR metadata and the file list (name, status, line counts) but not patch text. Nothing after ANALYZING needs whole patches: CLASSIFYING uses the file list, and REVIEWING uses its saved, trimmed `diffContext`. If ANALYZING itself has to be retried, it re-fetches the patches (one cheap request), after the head SHA check.
- **Retention.** Stage outputs are deleted after N days (to decide). Run and attempt rows without outputs can be kept longer for history.

---

## 7. API (assuming option A)

Thin route handlers that call the coordinator.

| Endpoint | Purpose |
|---|---|
| `POST /api/review` | `startRun` for a PR URL, or return the active run |
| `POST /api/review/:id/advance` | `advance`. When the next stage is REVIEWING, the user's LLM key comes in a request header (§0.3). |
| `POST /api/review/:id/retry` | `retry`. Same key header as `advance`. |
| `GET /api/review/:id` | `getRun`: run status, latest attempt per stage, full attempt history, available outputs |

The existing `GET /api/pr` and `GET /api/pr/analysis` stay as they are. The stages reuse their logic and don't replace them.

---

## 8. Frontend

- A progress list with one row per stage: status, duration, attempt count.
- On failure: the error message, whether it's retryable, and a Retry button. The button is disabled for non-retryable errors and shows a countdown for `rate-limited`.
- An expandable execution history: every attempt in order, with its trigger, duration and error.
- Results appear as each stage completes. Deterministic results show without waiting for the AI review.
- A notice when the PR has new commits since the run started (§4.3).

---

## 9. Tasks

| # | Task | Deliverable | Depends on |
|---|---|---|---|
| 1 | Stage contracts | Typed input/output per stage; stage functions wrapping existing code | — |
| 2 | State model and transitions | Types, transition rules, in-memory repository for tests | 1 |
| 3 | Coordinator | `startRun`, `advance`, `retry`, `getRun` in `lib/workflow/` | 2 |
| 4 | Error classification and retry policy | Error kinds, auto-retry with backoff, retry limits | 3 |
| 5 | Context builder | `buildReviewContext` with budget enforcement and secret redaction | 1, Sprint 4 LLM |
| 6 | Persistence | Migrations for both tables, a database repository behind the same interface as the in-memory one, redaction before save | 2, Sprint 4 DB |
| 7 | API | Four thin route handlers + Zod schemas | 3 |
| 8 | Frontend | Progress list, failure and retry UI, history, stale-PR notice | 7 |

Tasks 1–4 can be built and tested without a database or LLM, using the in-memory repository and stubbed stages.

---

## 10. Definition of done

From the handout:
1. **Successful run:** a PR completes all stages and produces a final report.
2. **LLM failure:** a failed REVIEWING attempt can be retried without fetching, analyzing or classifying again.
3. **Context reuse:** the retry uses the same saved `ReviewContext`.
4. **Invalid output:** an invalid LLM response never produces a completed review.
5. **Retry limit:** repeated failures stop. They don't retry forever, automatically or by clicking.
6. **Execution history:** you can see which stages succeeded, failed, and were retried, with durations.
7. **Server restart:** a run interrupted by a restart can be recovered (§4.4).

Added:

8. **Stale PR:** a retry after new commits starts a new run instead of resuming old results.
9. **No duplicates:** starting or retrying the same PR twice at once results in one active run.
10. **No secrets persisted:** a PR containing an R007 secret leaves no secret value in any stored row or log line, and the user's LLM key appears in no stored row or log line.
11. **No LLM configured:** with REVIEWING skipped, the run completes with deterministic results.

---

## 11. Out of scope (from the handout)

Multiple autonomous AI agents, Kafka/RabbitMQ, Kubernetes, event-driven architecture, distributed orchestration, running stages in parallel, and a dedicated worker service. A sequential workflow with persisted stage results is enough.

---

## Open questions
- Option A, B or C for driving the workflow (§0.1)?
- Full workflow, or persistence and retry for CLASSIFYING and REVIEWING only (§0.2)?
- How long to keep stage outputs and runs (§6.2)?
- Should the "mark as safe" overrides in PENDING_NEW_FEATURES.md attach to a run, or apply across runs for the repo?
