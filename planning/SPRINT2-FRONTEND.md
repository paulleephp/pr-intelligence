Day 2 — Diff analysis engine

Backend Summary:

- Build independent diff parser.
- Categorize modified files.
- Calculate change statistics.
- Detect potentially sensitive changes.
- Implement deterministic risk indicators.

Frontend:
1. PR Summary Component
   - Display overall file count and severity distribution
   - Show summary of lines changed across total files
2. Changed Files Table
   - Column for type, and modification status
   - Column for severity level (color-coded groups)
3. Risk Indicator Component
   - Display color-coded severity levels: high/medium/low
   - Group findings by risk category with counts
4. Dashboard
   - Show number of files grouped by severity
   - Display aggregate line changes statistics

Deliverables:
- PR summary and severity distribution display
- Changed files table component
- Risk indicator grouping by severity level
- Dashboard with aggregated statistics

Agent Task Assignments:
| Role | Task | Acceptance Criteria |
|------|------|---------------------|
| **Coder** | Implement diff analysis module that consumes backend API data. Build React + Tailwind components for PR summary, changed files table, and risk indicators. | Components render correct data from GET /diff endpoint without crashing |
| **Tester** | Write unit tests verifying component rendering logic and integration tests for UI display matching expected outputs | Tests confirm file counts match backend API responses; verify color-coded severity groupings align with expectations |

Acceptance criteria:
- Coder: Successfully implements React + Tailwind components consuming GET /diff endpoint
- Tester: Writes unit tests for component logic with integration tests verifying UI accuracy against backend data
