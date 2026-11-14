# PR Intelligence

## The problem: 

- Reviewing a pull request requires understanding of what changed, which parts
of the codebase are affected, what tests are relevant, and whether there are
potential risks. This is especially challenging if the codebase has long
history and/or a lot of inner dependencies.
- This tool automates the initial investigation.

A developer runs:

```bash
npx analyze https://github.com/owner/repo/pull/123
```

This tool will:

1. Fetch PR metadata and changed files.
2. Analyze the diff.
3. Identify potentially affected modules
4. Determine which tests might be relevant
5. Use an LLM to produce a structured review
6. Generate a Markdown report with findings and recommendations.

* The important distinction: the LLM doesn't do everything. Deterministic code handles fetching, parsing, validation, and analysis. The LLM handles tasks where reasoning and interpretation are useful.

## Architecture
@TODO Miro link

Review Orchestrator
|
LLM Provider      Deterministic Rules
|
Result Validator
|
Database
|
Nextjs Frontend
|
Next.js API Routes
|
node.js Analysis Service
|
Github API Client
|
PR Data collector
|
Diff Analyzer
|
change Impact Analyzer

## Tech stack:

|Component|	Technology|
|--|--|
Layer	Technology
Frontend	Next.js App Router
UI	React + TypeScript
Styling	Tailwind CSS
Backend	Node.js
API	Next.js Route Handlers
Analysis engine	TypeScript
GitHub integration	Octokit
LLM	OpenAI API
Validation	Zod
Database	PostgreSQL
ORM	Prisma
Testing	Vitest + Playwright
CI/CD	GitHub Actions
