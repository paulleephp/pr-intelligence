Feature IDEAs:

- After PR has been analyzed, user can toggle "This is safe" which will
disregard the pattern 

- QOL feat - user will be abllowed to say "All auth changes are safe"
or "all migration patterns found are safe"

- and after that's clicked, the number of risky patterns should decrease
on the frontend. If that was the only critical or high risky item,
the UI should reflect the change and update the overall risk level

---

# UI backlog: candidates for a lighter sprint

Added 2026-11-24. Not scheduled. Sizes: S = under a day for one agent, M = one to two days.

Suggested order: **U5 (routing) first**, because it reshapes the page the other items live on. Then U2/U3/U4/U6 together, because they all extend the PR header and share one metadata change. U1 can go anytime.

## U1. Narrower severity distribution bar (S, frontend only)
- Today the bar under "Severity distribution" in `PRSummary.tsx` spans the full card width, and its labels sit underneath.
- Make the bar about half the width, with the labels/legend to its right on the same row.
- On narrow screens, stack them again (bar full width, labels below).
- Files: `app/components/PRSummary.tsx`, `app/components/severity/SeverityBar.tsx`.

## U2. Repository information (S, backend + frontend)
- Show the repository the PR belongs to: `owner/repo` (linked), description, and optionally primary language.
- **No extra GitHub request needed.** The `pulls.get` response already includes the base repository (`base.repo.full_name`, `description`, `html_url`, `language`). Extend `fetchPRMetadata`, the `PRMetadata` type and the Zod schema.

## U3. Bring back PR labels (S, frontend only)
- Labels (e.g. `C++`, `needs-ci`, `typings`) were shown by `PRInfoCard`, which was removed in #2 (`9a7b8aa`).
- **The data is still there.** `fetchPRMetadata` still returns `labels` (name and color), and the schema validates them. Only the UI needs to come back.
- Use the label's GitHub color, but pick a readable text color for it (dark text on light labels, light text on dark labels).

## U4. Pending reviewers (S, backend + frontend)
- Show the PR's pending reviewers with avatars, under the label **"Pending reviewer"** (plural when there are several).
- Source: `requested_reviewers` and `requested_teams` from `pulls.get`. No extra request. Extend `fetchPRMetadata`, the `PRMetadata` type and the Zod schema.
- GitHub drops a reviewer from this list once they submit a review, so it shows only people who haven't reviewed yet. That's intended (decided 2026-11-24). Showing completed reviews (`pulls.listReviews`) is out of scope.
- Assignees are not shown (decided 2026-11-24).
- When there are no pending reviewers, hide the row or show "None".

## U5. Home page → PR view page (M, frontend)
- **Home page:** title, short description, and the form. Submitting navigates to the PR view.
- **PR view page:** a readable, shareable URL, e.g. `/pr/<owner>/<repo>/<number>`. Refreshing or sharing the link reloads the same PR. The form isn't shown here.
  - The page builds the GitHub PR URL from the route and calls the existing `/api/pr` and `/api/pr/analysis` endpoints. No API changes needed.
- **Page title:** e.g. `#142 · owner/repo · <PR title>` in the browser tab.
- **Navigation:** a clear way back to the home page (header link and/or a back link above the PR header).
- **Readable PR heading:** today it's a small grey `PR #142 · Open` line above the title. Make the repo and number prominent, e.g. `owner/repo` then `#142` next to the title, with the state as a badge.
- Remove or repurpose the placeholder `app/dashboard/page.tsx`.
- Note for the coder: this Next.js version differs from older ones (see AGENTS.md). Check `node_modules/next/dist/docs/` for dynamic route params and page metadata before writing the route.

## U6. Collapsible PR description with full Markdown (M, backend + frontend)
- A collapsible "Description" section, collapsed by default, showing the PR body as GitHub renders it: images, tables, task lists, code blocks, and links to commits, issues, other PRs and @mentions.
- **Recommended approach:** ask GitHub for the already-rendered HTML instead of rendering Markdown ourselves.
  - `pulls.get` can return `body_html` (request the `full` or `html` media format). GitHub has already turned `#123`, `owner/repo#45`, commit SHAs and `@user` into links, which is hard to reproduce correctly ourselves.
  - The alternative, `react-markdown` + `remark-gfm` + our own reference-linking, is more work and will differ from GitHub in edge cases.
- **Security:** rendering HTML means `dangerouslySetInnerHTML`, which our own R016 flags. Sanitize with DOMPurify (or equivalent) before rendering, even though GitHub already sanitizes. Links open in a new tab with `rel="noopener noreferrer"`.
- **Images:** images uploaded to public repos load fine. Attachments in **private** repos may need GitHub authentication and show as broken. Show a fallback instead of a broken image.
- **Also useful later:** the plain `body` is needed for the Sprint 5 LLM context (SPRINT5.md §5 notes it isn't fetched yet). Fetch both in the same request.

## U7. Theme-derived color palette (S–M, frontend only)
- Adopted 2026-11-24. Values and rules: STYLEGUIDE.md "Colors and brand"; visual reference: `docs/style-guide.html`.
- Proposal with previews: https://claude.ai/artifact/Bv7UpWUdm3ikH5jiUTgmtd (private until shared from its Share menu).
- All colors derived in OKLCH from the anchors: title gradient (emerald-400 → cyan-400) and the CTA (emerald-500). The anchors themselves don't change.
- **Severity:** hues on the warm arc next to teal's complement (critical 15°, high 50°, medium 80°), low analogous to the theme (232°), with a lightness ramp so the levels stay distinct under red-green color blindness (closest pair 14.7 vs 10.5 today).
- **Badge style:** outline badges (no tinted fill) for high/medium/low/none, because orange tinted over near-black renders as brown. Critical stays a solid badge as its own level.
- **File status:** muted (low-chroma) colors, and "modified" becomes neutral, so it no longer matches medium severity on the same table row.
- **PR state:** open = theme green, merged = purple (theme triad), closed = muted rose.
- Optional: tint neutral surfaces slightly toward the theme hue.
- Files: `app/components/_lib/severity.ts`, `app/components/_lib/file-display.ts`, plus any hardcoded colors in components. Exact token values are in the proposal's table.
- Pairs naturally with U1 (severity bar layout).

## U8. Logo and favicon (S, frontend)
- Replace the 🚀 emoji header mark with an SVG mark; wordmark in near-white, theme color carried by the mark.
- Replace the favicon (currently a light-blue clip-art magnifier). The current `favicon.ico` sits at the repo root, where Next.js doesn't serve it; the new one goes where the App Router expects it (check `node_modules/next/dist/docs/` for icon file conventions).
- Decided 2026-11-24: concept B (impact nodes). Asset: `docs/brand/mark.svg`; rules in STYLEGUIDE.md "Brand mark".
- Header cleanup while there: the "Dashboard" link goes to an empty placeholder page (see U5), and "GitHub ↗" links to github.com's home page rather than the project repo.
