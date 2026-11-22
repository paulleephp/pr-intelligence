import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { SEVERITY_SCORES } from "@/lib/diff/constants/patterns";
import { PRResults } from "../PRResults";
import { mixedReport } from "./fixtures";

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
    expect(screen.getByRole("heading", { name: "Risk indicators" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Changed files (5)" })).toBeInTheDocument();
  });

  // Key decision (AGENTS.md): color-coded severity groups, NO raw scores shown to users.
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
