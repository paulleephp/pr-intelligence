import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PRSummary } from "../PRSummary";
import { buildReport, cleanReport, FILES, mixedReport } from "./fixtures";

const statValue = (label: string) => screen.getByText(label).nextElementSibling;
/** The "PR #123 · Open" line; the state is wrapped in its own coloured span. */
const prLine = () => screen.getByText((_, el) => el?.tagName === "P" && /^PR #\d+/.test(el.textContent ?? ""));

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
});
