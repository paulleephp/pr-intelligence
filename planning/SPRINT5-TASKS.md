# Sprint 5: Task Briefs (AI assessment, bring your own key)

Spec: `SPRINT5.md`. Read the whole spec before starting any of these tasks, especially "Which findings are sent" and "What is sent". **The security exclusions are the most important part of this feature; when in doubt, don't send.**

**Prerequisite from Sprint 4:** S4-T4 (line numbers and stable IDs on findings) merged.

No database this sprint: the verdict cache is deferred (SPRINT5.md "Future deliverables").

**Order**
- Wave A, in parallel: S5-T1 (payload builder), S5-T2 (Claude client)
- Wave B: S5-T3 (route, needs S5-T1 and S5-T2)
- Wave C: S5-T4 (frontend; can start on S5-T1's preview data, then wire up S5-T3)
- Tester (S5-T5) follows each wave. Reviewer after each PR.
- S5-T6 (CI workflow, carried from Sprint 4) is independent: do it first, so every later Sprint 5 PR is checked by CI.

## S5-T1. Eligibility and payload builder (backend, M)
**Role:** Coder (backend)
**Depends on:** S4-T4 (Sprint 4)
**First step:** make `id` required on findings in `aggregate.findings`, in both the type (e.g. `Finding = Pattern & { id: string }`) and the Zod schema, and update the tests that build findings without ids. Verdicts are matched back by id, so it must always be present (deferred from S4-T4).
**Files:** new `lib/llm/eligibility.ts`, `lib/llm/payload.ts`, `lib/llm/constants.ts`; types in `lib/types/llm/`; `lib/types/pr/metadata.ts`; `lib/schemas/`; the analysis route

**Scope**
- **Eligibility constant** (single source for backend and UI): every rule R001–R018 → `{ status: "sent" | "excluded-security" | "deterministic", reason: string }`, using the exact user-facing reasons in SPRINT5.md. Sent: R002, R012, R013, R015, R016. Excluded for security: R003, R004, R006, R007, R009, R011. Everything else deterministic.
- **`buildAssessmentPayload(files, findings, repoIsPrivate)`**, a pure function, applying SPRINT5.md "What is sent" in this order:
  1. Private repo → nothing is sent; status `private-repo`.
  2. Keep findings whose rule is `sent`.
  3. Drop any finding whose file isn't JS/TS (`JS_TS_FILE_PATTERN`).
  4. Drop any finding whose file has an R003, R004, R006, R007, R009 or R011 finding, or whose path matches migration, schema, `.env*`, production-config, CI or infrastructure patterns (reuse the existing path constants).
  5. Cut the flagged line with 5 lines of context either side from its patch hunk. Keep the patch's `+`/`-`/space markers and include removed lines inside the window (R002 is about removals). Never reach outside the hunk.
     - **R002 from a removed line has no `line`** (Sprint 4 decision: no position in the new file). The payload builder must still locate it, e.g. by recording the removed line's position in the old file or in the hunk (an `oldLine` field set by `parsePatch`). Add that here as part of S5-T1; don't send R002 without context.
  6. Run the secret detectors over each snippet. **Any match → drop the finding** with status `possible-secret`. Never redact-and-send.
  7. Serialize to JSON; if over **10,000 characters**, status `too-large` and nothing is sent.
- **Per-finding outcome** for the UI: `sent`, `excluded-security`, `deterministic`, `not-js-ts`, `excluded-file`, `possible-secret`.
- **Preview in the analysis response:** add `aiAssessment: { available, reason?, findings: [{ id, outcome, reason }], payloadChars, limitChars: 10000 }`. It must not contain the snippets themselves. `available` is false for private repos, no eligible findings, or too-large.
- **Private flag:** read `base.repo.private` from the `pulls.get` response the analysis route already makes. No extra request.

**Out of scope:** calling Claude; the JSON download (future deliverable).

**Acceptance (fixtures)**
- An R015 finding in `src/nav.ts` → sent, snippet is lines n−5 to n+5.
- An R016 finding in a file that also has an R007 finding → `excluded-file`, nothing from that file in the payload.
- An R002 finding whose snippet contains an `AKIA…` key → `possible-secret`, not in the payload.
- R016 in a `.github/workflows/` YAML → `not-js-ts`.
- 20 eligible findings → `too-large` when the JSON is over 10,000 characters; payload empty.
- Private repo → `available: false`, reason `private-repo`, payload empty.
- The preview never includes snippet text.

## S5-T2. Claude client (backend, M)
**Role:** Coder (backend)
**Files:** new `lib/llm/claude.ts`, `lib/llm/prompt.ts`, `lib/schemas/ai-assessment.ts`; add `@anthropic-ai/sdk`

**Scope**
- One function, no provider interface (Claude is the only platform): `assess({ payload, apiKey }): Promise<AssessResult>`. `AssessResult` is either `{ ok: true, verdicts, usage: { inputTokens, outputTokens }, model }` or `{ ok: false, error: "invalid-key" | "rate-limited" | "refused" | "invalid-output" | "provider-error" }`.
- **Implementation** (SPRINT5.md "Backend deliverables" 1):
  - Official SDK, client created per request with the user's key. Never read a key from the environment.
  - Model `claude-opus-5-5`; set `output_config.effort` explicitly (`"high"`); don't send `thinking: { type: "disabled" }` or `budget_tokens` (both rejected by this model).
  - Structured output with the verdict schema (`output_config.format`), then validate with Zod anyway.
  - Check `stop_reason` before reading the result. Enable the server-side refusal fallback (`fallbacks: "default"` with its beta flag). A final `refusal` → `error: "refused"`.
  - Invalid output → retry once with the validation error in the prompt, then `invalid-output`.
  - Map SDK errors with the SDK's typed error classes (authentication → `invalid-key`, rate limit → `rate-limited`), not by matching message text.
  - **Confirm every SDK call against the SDK's documentation** (structured outputs and fallbacks together on the beta messages endpoint in particular). Don't write SDK calls from memory.
- **Prompt** (`lib/llm/prompt.ts`), versioned with a `PROMPT_VERSION` constant (returned with results; would be part of a future cache key):
  - The AI sees only diff snippets from one PR, never the whole repository, and must answer "unclear" when the snippet doesn't show enough.
  - Per finding: verdict (`confirmed` / `likely-harmless` / `worse-than-rule` / `unclear`) and an explanation of about 80 words max that references line numbers.
  - It must not assign or change severity.
- **Never log** the API key, the request body or the payload. Error logs record only the error kind and status code.

**Acceptance:** with the SDK mocked, each error kind maps correctly, the retry happens exactly once, the key never appears in any log call, and a valid response yields typed verdicts with token usage.

## S5-T3. Assessment route (backend, M)
**Role:** Coder (backend)
**Depends on:** S5-T1, S5-T2
**Files:** new `app/api/pr/assessment/route.ts`; `lib/schemas/request.ts`; `lib/api.ts` and `lib/api-constants.ts` (allowlist, timeout); AGENTS.md Key Decision 10 and README "Design Decisions" (API)

**Scope**
- `POST /api/pr/assessment` with body `{ url, apiKey }`, validated with Zod:
  1. Re-fetch the PR and rebuild the payload **on the server** with S5-T1. Never accept findings or snippets from the client; the security exclusions are only meaningful if the server applies them.
  2. Private repo, nothing eligible, or over 10,000 characters → 400 with the reason, no call to Claude.
  3. Call Claude and return verdicts, token usage, model, prompt version and `assessedAt`. Nothing is saved.
- Error mapping: `invalid-key` → 401, `rate-limited` → 429, `refused` → 422 with "Claude declined to assess this", `invalid-output` / `provider-error` → 502.
- Set the route's `maxDuration` high enough for an AI call (check `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/02-route-segment-config/maxDuration.md` and the Vercel plan's limit).
- `lib/api.ts`: add the endpoint to the allowlist with its own longer timeout (the 20s default is too short for AI calls) and Zod validation of the response.
- **The key never appears in the URL, in logs or in the response.** It's read from the POST body, used once, and dropped.

**Acceptance:** with Claude mocked, the server ignores any findings in the request body; a private repo is rejected before any Claude call; each error maps to its status; no log call contains the key.

## S5-T4. AI assessment section (frontend, M)
**Role:** Coder (frontend)
**Depends on:** S5-T1 (preview data); S5-T3 (sending)
**Files:** new `app/components/ai-assessment/` (section, key form, finding lists, verdict badge); place the section below the deterministic results; verdict display next to findings in the existing finding views

**Scope** (SPRINT5.md "Frontend" 1–4, using its exact wording)
- **Always visible.** Shows why AI is offered and which findings in this PR will be sent, each with its reason.
- **Two not-sent lists:** "For security reasons…" (with the JS/TS-only statement) and "Not sent, on purpose". Also show `possible-secret` and `excluded-file` outcomes with plain explanations.
- **States:**
  - private repo: "AI assessment isn't available for private repositories"
  - no eligible findings: "AI wouldn't add anything for this PR", and no button
  - too large: "Too large for AI assessment (over 10,000 characters)"
- **Form:**
  - password-type key input with the "Bring your own key…" text; the key is held only in component state and is never written to `localStorage`, cookies or the URL; clear it after the request
  - the size against the cap
- **During:** loading state; the request can take tens of seconds. **After:** tokens used, the model, and errors explained per status (invalid key, rate limited, declined, failed).
- **Results:** each verdict next to its finding; the rule's severity unchanged. Text and icons, STYLEGUIDE.md colors, never color alone.
- Results live in component state only; reloading the page clears them (no cache this sprint).

**Acceptance:** renders every state above against fixture data; the key isn't present in storage, the URL or the DOM after submit; works at mobile width.

## S5-T5. Tests
**Role:** Tester
**Scope**
- S5-T1: one test per filtering step and per outcome; the 10,000-character boundary (exactly at and one over); the preview never contains snippet text. **Security tests are the priority:** for each excluded rule (R003, R004, R006, R007, R009, R011), prove nothing from that file reaches the payload, even when an eligible rule fires on the same file.
- S5-T2: error mapping, the single retry, no key in logs (spy on `console`), refusal handling.
- S5-T3: server ignores client-sent findings; private repo rejected before any Claude call; status mapping.
- S5-T4: every UI state; the key isn't in storage or the URL after submit.

## S5-T6. CI workflow (backend, S; carried over from Sprint 4)
**Role:** Coder (backend)
**Files:** new `.github/workflows/ci.yml`; README (Tech Stack, Contributing) and AGENTS.md Tech Stack via mochi.

**Scope**
- A GitHub Actions workflow on pull requests into `sprint-*`, `staging` and `main`, running in order:
  1. `npm ci`
  2. `npx next typegen` (without it, `tsc` fails on `LayoutProps` in a fresh checkout)
  3. `npm run check` (Biome lint, formatting, import order)
  4. `npx tsc --noEmit`
  5. `npx vitest run`
- Pin the Node version to the one the project uses. No secrets are needed: tests don't call GitHub or Claude.
- Our own R006 will flag this PR as "CI/CD workflow modified". That's expected, and a good live check.

**Acceptance:** the workflow runs on its own PR and passes. `npm run check` starts green (Sprint 4 PRs #26 and #27). Biome's remaining infos (`noUselessStringRaw`) and the `docs/style-guide.html` size warning don't fail it, which the user accepted.
