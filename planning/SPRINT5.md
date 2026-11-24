Sprint 5 — AI assessment of flagged findings (optional, bring your own key)

Status: scoped and briefed 2026-11-24 (moved here from Sprint 4). Prerequisite from Sprint 4: line numbers and stable IDs on findings. Replaces the original Sprint 4 "Core analysis" plan (security invariant analysis and change-impact analysis), which is in git history at commit `44160c8`.

## Bring your own key (decided 2026-11-24)

- AI assessment runs **only with the user's own API key** for a provider they choose. The app has no AI key of its own and never pays for or proxies AI usage on its own account.
- The user picks the provider and enters their key in the AI assessment section. **Default and only provider this sprint: Claude (Anthropic).** Gemini and ChatGPT come later (see "Future deliverables").
- The key goes from the browser to our route handler with the request, is used for that one call to the provider, and is discarded. Never stored (server, database, browser storage) and never logged, including request headers and bodies in error logs (Key Decision 14).

## Narrative (what the user should understand)

> The rules have already run, and their results stand on their own. **AI assessment is optional, but it helps** for some findings: a rule can find *where* something risky changed, but not judge *what* the change does. For findings the rules answer completely, we deliberately send nothing to the AI.

Every screen in this feature tells that story: why AI is offered, which findings it helps with and why, and which findings are not sent and why.

## Which findings are sent, and why

Single source of truth: one constant mapping each rule to `eligible: boolean` and a short user-facing reason. The backend uses it to decide what to send; the frontend shows the same reasons. Proposed location `lib/llm/eligibility.ts` (exact path decided in the brief).

**Only JS/TS source code is ever sent to AI** (decided 2026-11-24). That's where the analysis should focus, and it's the simplest promise to keep. All remaining eligible rules are JS/TS code rules.

**Sent to AI (rule finds the spot in JS/TS code; AI judges the change):**

| Rule | User-facing reason |
|------|--------------------|
| R002 auth check removed | Was the check removed, or moved somewhere else (e.g. middleware)? |
| R012 crypto algorithm changed | Is the new algorithm weaker or stronger? |
| R013 password hashing changed | Did hashing get weaker (lower cost factor, faster algorithm)? |
| R015 unsafe navigation | Is the value validated or constant before it reaches `window.location`? |
| R016 code execution / DOM sink | Is the input sanitized or constant? |

**Not sent, for security reasons (decided 2026-11-24):** secrets, database schema, production configuration, CI workflows and infrastructure files are never processed by the LLM. Redaction depends on our detectors recognising every secret format; a one-off format they miss would be sent unredacted. For these files the risk of a leak outweighs the benefit, so they are excluded outright rather than redacted.

| Rule | User-facing reason |
|------|--------------------|
| R007 secrets | For security reasons, secrets are never sent to AI. |
| R003 migration added/modified | For security reasons, database schema is never sent to AI. |
| R004 migration deleted | For security reasons, database schema is never sent to AI. |
| R009 production config | For security reasons, production configuration is never sent to AI. |
| R006 CI workflow modified | For security reasons, CI workflows are never sent to AI. |
| R011 infrastructure | For security reasons, infrastructure files are never sent to AI. |

**Not sent, on purpose (deterministic: the rule's answer is complete):**

| Rule | User-facing reason |
|------|--------------------|
| R005 dependencies | AI knowledge of vulnerable versions is outdated and can be wrong. (A vulnerability database would be the right tool; not in scope.) |
| R001 auth files modified, R014 security-sensitive path | The finding is the location itself. |
| R010 test files removed | The finding is the fact itself. |
| R008 | Not implemented. |
| R017 exported signature changed | The finding is the fact itself. |

## What is sent

- For each eligible finding: rule ID and condition, file path, and the flagged lines with 5 lines of context either side from the patch.
- **Request cap: 10,000 characters of JSON** for the findings data (our fixed instructions don't count). Over the cap, the request isn't sent and the UI says "Too large for AI assessment (over 10,000 characters)". At about 650 characters per finding, roughly 15 findings fit. Decided 2026-11-24. Never whole files, never anything outside the PR's diff.
- **JS/TS files only:** a hunk is sent only from a file matching `JS_TS_FILE_PATTERN`.
- **Files excluded outright:** even a JS/TS file is never sent if it has an R003, R004, R006, R007, R009 or R011 finding, or matches migration, schema, `.env*`, production-config, CI or infrastructure paths.
- **Secret check as a second line of defence:** every remaining hunk is run through the secret detectors before sending. If anything matches, the hunk is dropped (not redacted) and the finding is listed as "not sent: possible secret".
- **Public repositories only** (decided 2026-11-24). AI assessment isn't offered for private repos (`base.repo.private` from `pulls.get`, no extra request); the section says "AI assessment isn't available for private repositories". Deterministic analysis is unaffected.
- No repository source, no code from outside the PR (Key Decision 15). The AI is told it only sees the diff.

## What comes back

Per finding, validated with Zod:
- `verdict`: `"confirmed"` (the risk is real) · `"likely-harmless"` · `"worse-than-rule"` (more serious than the rule's severity suggests) · `"unclear"` (diff doesn't show enough)
- `explanation`: short (about 80 words max), plain language, referencing line numbers
- **The rule's severity never changes.** The verdict is shown next to it (Deterministic First). This replaces the original item "AI returns severity levels".
- A "likely harmless" verdict is a natural input to the backlog's "mark as safe" idea later; not in this sprint.
- Findings need a stable ID (e.g. rule + file + line) so verdicts can be matched back. The coder adds this if it doesn't exist.

## Backend deliverables (carried from the original plan, adjusted)

1. **Provider:** Claude first, via the official `@anthropic-ai/sdk`. A small provider interface (`assess(findings, key) → verdicts + token usage`) with one implementation, so Gemini and ChatGPT can be added without touching callers.
   - Default model: Claude Opus 5.5 (`claude-opus-5-5`). Set `output_config.effort` explicitly (this model defaults to `medium`; thinking can't be turned off).
   - Use structured outputs (`output_config.format` with the verdict schema) so the response is valid JSON, then still validate with Zod.
   - Security-related code can trigger the model's safety refusals (`stop_reason: "refusal"`). Check `stop_reason` before reading the result, enable the server-side refusal fallback (`fallbacks: "default"`), and show "the provider declined to assess this" rather than a generic error.
   - Coder: confirm SDK calls against the SDK docs; don't write them from memory.
2. **Key handling:** bring-your-own-key, sent per request, never stored or logged (Key Decision 14).
3. **Budget:** before sending, show the number of findings, the request size against the 10,000-character cap, and an estimated token count; after, show tokens actually used. Over the cap, don't send.
4. **Validation and retry:** responses validated with Zod; an invalid response is retried once with the validation error, then reported as failed.
5. **No cache or database this sprint** (decided 2026-11-24). Each assessment calls the provider again; with bring your own key that costs the user cents. See "Future deliverables".

## Frontend

1. **"AI assessment" section**, below the deterministic results, always visible:
   - **Why it's offered:** "Optional. The rules above already ran. For N findings in this PR, a rule can tell where something changed but not whether the change is harmful. AI assessment helps judge those."
   - **Will be sent:** the eligible findings in this PR, each with its reason from the table above.
   - **Not sent, for security reasons:** R007, R003, R004, R009, R006 and R011 findings in this PR, stated explicitly: "For security reasons, we only send JavaScript/TypeScript code to AI. Secrets, database schema, production configuration, CI workflows and infrastructure files are never sent."
   - **Not sent, on purpose:** the deterministic findings in this PR, each with its reason.
   - **No eligible findings:** say so plainly ("AI wouldn't add anything for this PR: all findings are deterministic") and don't offer the button.
2. **Before sending:**
   - **Provider selector:** Claude (default). Gemini and ChatGPT shown as "coming soon", not selectable.
   - **Key field** for the chosen provider, with: "Bring your own key. Your key is sent with this request only and is never stored." A password-type input; not saved in the browser.
   - The number of findings, the request size against the 10,000-character cap, and estimated tokens.
3. **During / after:** loading state (AI is slower than the rest of the page); errors explained (invalid key, rate limit, token limit, invalid output); tokens used.
4. **Results:** each verdict shown next to its finding, with the rule's severity unchanged. Verdicts use text and icons; colors from STYLEGUIDE.md, never color alone.

## Future deliverables (not this sprint)

- **Download the assessment data instead of sending it** (decided 2026-11-24): when the findings JSON is over 10,000 characters, the user can't send it to AI from the app, but can **download the JSON** and use it however they want (e.g. paste it into their own AI tool).
  - Hard limit for the download: **30,000 characters**. Over that, no download either; the UI says the PR is too large.
  - The download contains exactly what would have been sent: the same JS/TS-only selection, the same security exclusions and the same secret check. Nothing excluded for security reasons appears in it.
- **More providers:** Gemini and ChatGPT, behind the same provider interface and selector.
- **Verdict cache (Supabase)** (deferred 2026-11-24; reconsider only once everything else is done): store verdicts so the same PR isn't sent twice. Public repos only. Key: owner, repo, PR number, head SHA, provider, model and prompt version. Store verdicts, explanations and token usage only: never the API key, never the code sent. The UI would then show "Assessed on <date> · <model>" instead of the form. Needs a decision on the database client (recommended: Supabase JS client with plain SQL migrations).

## Dropped from the original plan

- **Change-impact analysis** ("called by", "consumed by", "breaks downstream consumers"): needs code outside the PR, which is the same source-access problem as Key Decision 15, plus token cost on the user's key.
- **Security invariant inventory** across the repo: same reason. Within the diff, it's covered by the R012/R013/R002 assessments above.

## Open questions

- None blocking.

Task briefs: `SPRINT5-TASKS.md`.
