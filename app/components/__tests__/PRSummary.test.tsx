import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PRSummary } from "../PRSummary";
import { buildReport, cleanReport, FILES, mixedReport, UNSCANNED } from "./fixtures";

const statValue = (label: string) => screen.getByText(label).nextElementSibling;
/** The "PR #123 · Open" line; the state is wrapped in its own coloured span. */
const prLine = () =>
  screen.getByText((_, el) => el?.tagName === "P" && /^PR #\d+/.test(el.textContent ?? ""));

describe("PRSummary", () => {
  it("links the PR title to GitHub in a new tab", () => {
    render(<PRSummary report={mixedReport()} />);
    const link = screen.getByRole("link", { name: /Test PR/ });

    expect(link).toHaveAttribute("href", "https://github.com/owner/repo/pull/123");
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", expect.stringContaining("noopener"));
  });

  it("shows the PR number, state and author", () => {
    render(<PRSummary report={mixedReport()} />);

    expect(prLine()).toHaveTextContent("PR #123 · Open");
    expect(screen.getByText("@user")).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "user" })).toBeInTheDocument();
  });

  it.each([
    ["open", "Open"],
    ["closed", "Closed"],
    ["merged", "Merged"],
  ] as const)("labels a %s PR as %s, in a distinct colour", (state, label) => {
    render(<PRSummary report={buildReport([FILES.clean], { state })} />);

    expect(prLine()).toHaveTextContent(`PR #123 · ${label}`);
    expect(screen.getByText(label).className).toMatch(/text-/);
  });

  it("gives open, closed and merged different colours", () => {
    const colour = (state: "open" | "closed" | "merged") => {
      const { unmount } = render(<PRSummary report={buildReport([FILES.clean], { state })} />);
      const label = { open: "Open", closed: "Closed", merged: "Merged" }[state];
      const cls = screen.getByText(label).className;
      unmount();
      return cls;
    };

    expect(new Set([colour("open"), colour("closed"), colour("merged")]).size).toBe(3);
  });

  it("shows file, line and finding totals", () => {
    render(<PRSummary report={mixedReport()} />);

    expect(statValue("Files changed")).toHaveTextContent("5");
    expect(statValue("Lines changed")).toHaveTextContent("27");
    expect(screen.getByText("+20 / −7")).toBeInTheDocument();
    expect(statValue("Risk findings")).toHaveTextContent("4");
  });

  // Regression: "Files changed" used to count unchanged files too.
  it.each([
    ["1, leaving out an unchanged file", [FILES.high, UNSCANNED.unchanged], /^1$/],
    ["0 for a PR where every file is unchanged", [UNSCANNED.unchanged], /^0$/],
  ])("shows 'Files changed' as %s", (_, files, expected) => {
    render(<PRSummary report={buildReport(files)} />);

    expect(statValue("Files changed")).toHaveTextContent(expected);
  });

  it("uses the highest severity found as the overall risk", () => {
    render(<PRSummary report={mixedReport()} />);
    const overall = screen.getByText("Overall risk").nextElementSibling;

    expect(overall).toHaveTextContent("Critical");
  });

  it.each([
    ["high", [FILES.high, FILES.medium, FILES.low], "High"],
    ["medium", [FILES.medium, FILES.low], "Medium"],
    ["low", [FILES.low], "Low"],
  ] as const)("shows %s as overall risk when it is the highest", (_, files, label) => {
    render(<PRSummary report={buildReport([...files])} />);

    expect(screen.getByText("Overall risk").nextElementSibling).toHaveTextContent(label);
  });

  it("shows 'No risks' when nothing was detected", () => {
    render(<PRSummary report={cleanReport()} />);

    expect(screen.getByText("Overall risk").nextElementSibling).toHaveTextContent("No risks");
    expect(statValue("Risk findings")).toHaveTextContent("0");
  });

  it("labels the severity bar with the total number of findings", () => {
    render(<PRSummary report={mixedReport()} />);

    expect(screen.getByRole("img", { name: "4 findings by severity" })).toBeInTheDocument();
  });

  // happy-dom has no layout, so the class stands in for "no layout break with a long module list"
  // (S4-T2): min-w-0 lets each grid column shrink instead of widening the page.
  it("lets the severity and blast radius columns shrink, so a long module list can't widen the page", () => {
    render(<PRSummary report={mixedReport()} />);
    const severity = screen.getByRole("heading", { name: "Severity distribution" }).parentElement;
    const columns = [...(severity?.parentElement?.children ?? [])] as HTMLElement[];

    expect(columns).toHaveLength(2);
    expect(within(columns[1]).getByRole("heading", { name: "Blast radius" })).toBeInTheDocument();
    for (const column of columns) {
      expect(column).toHaveClass("min-w-0");
    }
  });

  // mixedReport: README.md is counted but left out of the modules; package.json is (root).
  it("shows the blast radius card for the PR", () => {
    render(<PRSummary report={mixedReport()} />);

    expect(screen.getByRole("heading", { name: "Blast radius" })).toBeInTheDocument();
    expect(screen.getByText("5 files")).toBeInTheDocument();
    expect(screen.getByText("3 modules")).toBeInTheDocument();
    expect(screen.getByText("No tests changed for 2 source files")).toBeInTheDocument();
  });
});
