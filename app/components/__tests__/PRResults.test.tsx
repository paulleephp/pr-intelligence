import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { SEVERITY_SCORES } from "@/lib/diff/constants/patterns";
import { PRResults } from "../PRResults";
import { buildReport, FILES, mixedReport, UNSCANNED } from "./fixtures";

describe("PRResults", () => {
  it("renders nothing before a report exists", () => {
    const { container } = render(<PRResults report={null} loading={false} />);

    expect(container).toBeEmptyDOMElement();
  });

  it("shows the skeleton (and no stale report) while loading", () => {
    render(<PRResults report={mixedReport()} loading />);

    expect(screen.queryByText("Test PR")).not.toBeInTheDocument();
    expect(screen.queryByText("Risk indicators")).not.toBeInTheDocument();
    expect(document.querySelector(".react-loading-skeleton")).toBeInTheDocument();
  });

  it("renders every report section once loaded", () => {
    render(<PRResults report={mixedReport()} loading={false} />);

    expect(screen.getByRole("heading", { name: "Test PR" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Files by severity" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Line changes" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Affected areas" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Risk indicators" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Changed files (5)" })).toBeInTheDocument();
  });

  it("leaves out Affected areas, and keeps the other sections, when no file is in an area", () => {
    render(<PRResults report={buildReport([FILES.clean, FILES.low])} loading={false} />);

    expect(screen.queryByRole("heading", { name: "Affected areas" })).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Risk indicators" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Changed files (2)" })).toBeInTheDocument();
  });

  // Key decision (AGENTS.md): color-coded severity groups, NO raw scores shown to users.
  // Regression: unchanged files were counted in some of these numbers and not others.
  it("counts the same files everywhere on the page when the PR has an unchanged file", () => {
    render(<PRResults report={buildReport([FILES.high, UNSCANNED.binary, UNSCANNED.unchanged])} loading={false} />);
    const filesBySeverity = within(screen.getByRole("heading", { name: "Files by severity" }).parentElement as HTMLElement)
      .getAllByRole("listitem")
      .reduce((sum, item) => sum + Number(item.lastElementChild?.textContent), 0);
    const notScanned = Number(screen.getByText(/Not scanned: \d+ file/).textContent?.match(/(\d+) file/)?.[1]);

    expect({
      filesChanged: Number(screen.getByText("Files changed").nextElementSibling?.textContent),
      tableRows: within(screen.getByRole("table")).getAllByRole("row").length - 1,
      bySeverityPlusNotScanned: filesBySeverity + notScanned,
    }).toEqual({ filesChanged: 2, tableRows: 2, bySeverityPlusNotScanned: 2 });
  });

  describe("never exposes raw risk scores", () => {
    it("does not mention scores anywhere", () => {
      render(<PRResults report={mixedReport()} loading={false} />);

      expect(document.body.textContent).not.toMatch(/score/i);
    });

    it("does not render any internal severity score value as a standalone number", () => {
      render(<PRResults report={mixedReport()} loading={false} />);

      for (const score of Object.values(SEVERITY_SCORES)) {
        expect(screen.queryByText(String(score), { exact: true })).not.toBeInTheDocument();
      }
    });
  });
});
