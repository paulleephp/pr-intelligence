# Sprint 7 (draft): saved AI results

User's draft, not scoped yet. Some lines predate the Claude-only decision (Key Decision 14): "different LLM" and "via which platform" no longer apply.

- So far the application can:
- fetch A PR from Github
- analyze diffs and identify deterministic risks
- identify potentially affected files and relevant tests with impact radius and LLM analysis for very specifc set of potentially risky patterns found
- Error recovery: if user cannot get the result they wanted with the api key and the platform they chose, they should be able to try with different LLM
- We finally need to save the LLM data so that if the user revits the page, they should be able to see the same data.
- we need to store when the AI analysis was done, via which platform
- user should have option to 'flush' ai data.
- if LLM data retrieval fails, we should show the error
