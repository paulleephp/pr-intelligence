import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { RiskIndicator } from "../RiskIndicator";
import { buildAnalysis, FILES, mixedReport } from "./fixtures";

const aggregateOf = (files: Parameters<typeof buildAnalysis>[0]) => buildAnalysis(files).analysis.aggregate;

describe("RiskIndicator", () => {
  it("shows an empty state when nothing was detected", () => {
    render(<RiskIndicator aggregate={aggregateOf([FILES.clean])} />);

    expect(screen.getByText("No risky changes detected.")).toBeInTheDocument();
  });

  it("uses the plural for a level with several findings", () => {
    const twoCritical = { ...FILES.critical, filename: "src/other.ts" };
    render(<RiskIndicator aggregate={aggregateOf([FILES.critical, twoCritical])} />);

    expect(screen.getByText("2 findings")).toBeInTheDocument();
  });

  it("groups findings by severity, most severe first, skipping empty levels", () => {
    render(<RiskIndicator aggregate={aggregateOf([FILES.low, FILES.critical])} />);

    const headings = screen.getAllByText(/^\d+ findings?$/).map((el) => el.previousSibling?.textContent);
    expect(headings).toEqual(["Critical", "Low"]);
    expect(screen.queryByText("High")).not.toBeInTheDocument();
    expect(screen.queryByText("No risky changes detected.")).not.toBeInTheDocument();
  });

  it("pluralises the finding count", () => {
    render(<RiskIndicator aggregate={mixedReport().analysis.analysis.aggregate} />);

    expect(screen.getAllByText("1 finding")).toHaveLength(4); // one per level
    expect(screen.queryByText(/findings$/)).not.toBeInTheDocument();
  });

  it("lists each triggered rule with its condition, ID and count", () => {
    render(<RiskIndicator aggregate={mixedReport().analysis.analysis.aggregate} />);
    const rule = screen.getByText("Private key/api key pattern detected").closest("summary");

    expect(rule).toHaveTextContent("R007");
    expect(rule).toHaveTextContent(/1$/);
  });

  it("reveals the affected files and messages when a rule is expanded", async () => {
    const user = userEvent.setup();
    render(<RiskIndicator aggregate={mixedReport().analysis.analysis.aggregate} />);
    const summary = screen.getByText("CI/CD workflow modified").closest("summary") as HTMLElement;
    const details = summary.closest("details") as HTMLDetailsElement;

    expect(details.open).toBe(false);
    await user.click(summary);

    expect(details.open).toBe(true);
    expect(within(details).getByText(".github/workflows/ci.yml")).toBeInTheDocument();
    expect(within(details).getByText("CI change detected")).toBeInTheDocument();
  });

  it("only lists a rule's own findings under it", () => {
    render(<RiskIndicator aggregate={mixedReport().analysis.analysis.aggregate} />);
    const details = screen.getByText("Crypto algo changed").closest("details") as HTMLElement;

    expect(within(details).getAllByText(/^src\//)).toHaveLength(1);
    expect(within(details).getByText("src/hash.ts")).toBeInTheDocument();
  });
});
