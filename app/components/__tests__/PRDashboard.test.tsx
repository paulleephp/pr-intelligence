import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PRDashboard } from "../PRDashboard";
import { buildAnalysis, FILES, mixedReport, UNSCANNED } from "./fixtures";

const severityRow = (label: string) => screen.getByText(label).closest("li");
const statValue = (label: string) => screen.getByText(label).nextElementSibling;

describe("PRDashboard", () => {
  describe("files by severity", () => {
    it("counts files per severity, with unflagged files under None", () => {
      render(<PRDashboard analysis={mixedReport().analysis} />);

      expect(severityRow("Critical")).toHaveTextContent(/1$/);
      expect(severityRow("High")).toHaveTextContent(/1$/);
      expect(severityRow("Medium")).toHaveTextContent(/1$/);
      expect(severityRow("Low")).toHaveTextContent(/1$/);
      expect(severityRow("None")).toHaveTextContent(/1$/);
    });

    it("lists levels from critical to none", () => {
      render(<PRDashboard analysis={mixedReport().analysis} />);
      const labels = screen.getAllByRole("listitem").map((li) => li.firstChild?.textContent);

      expect(labels).toEqual(["Critical", "High", "Medium", "Low", "None"]);
    });

    it("counts a file once, at its highest severity, even with several findings", () => {
      // One file with a critical (R007) and a high (R012) finding.
      const multi = { ...FILES.critical, patch: `${FILES.critical.patch}\n+const d = md5(x);` };
      render(<PRDashboard analysis={buildAnalysis([multi])} />);

      expect(severityRow("Critical")).toHaveTextContent(/1$/);
      expect(severityRow("High")).toHaveTextContent(/0$/);
      expect(severityRow("None")).toHaveTextContent(/0$/);
    });
  });

  describe("unscanned files", () => {
    it("lists unscanned files separately and leaves them out of None", () => {
      render(<PRDashboard analysis={buildAnalysis([UNSCANNED.binary, UNSCANNED.noPatch, FILES.clean])} />);

      expect(severityRow("None")).toHaveTextContent(/1$/);
      expect(screen.getByText(/Not scanned: 2 files/)).toBeInTheDocument();
    });

    it("uses the singular for one unscanned file", () => {
      render(<PRDashboard analysis={buildAnalysis([UNSCANNED.binary])} />);

      expect(screen.getByText(/Not scanned: 1 file \(/)).toBeInTheDocument();
      expect(severityRow("None")).toHaveTextContent(/0$/);
    });

    it("shows no 'Not scanned' note when every file was scanned", () => {
      render(<PRDashboard analysis={mixedReport().analysis} />);

      expect(screen.queryByText(/Not scanned/)).not.toBeInTheDocument();
    });

    // Regression: the flagged unscanned file used to be subtracted twice (None = 2 - 1 - 1 = 0).
    it("counts a clean file under None when an unscanned file also has a path finding", () => {
      render(<PRDashboard analysis={buildAnalysis([UNSCANNED.deletedMigration, FILES.clean])} />);

      expect(severityRow("High")).toHaveTextContent(/1$/);
      expect(severityRow("None")).toHaveTextContent(/1$/);
    });

    it("adds up to the number of changed files with flagged, unflagged-unscanned and clean files", () => {
      render(
        <PRDashboard
          analysis={buildAnalysis([UNSCANNED.deletedMigration, UNSCANNED.binary, FILES.clean, FILES.low])}
        />,
      );

      expect(severityRow("High")).toHaveTextContent(/1$/); // deleted migration
      expect(severityRow("Low")).toHaveTextContent(/1$/);
      expect(severityRow("None")).toHaveTextContent(/1$/); // README only; the binary is under "Not scanned"
      expect(screen.getByText(/Not scanned: 2 files/)).toBeInTheDocument();
    });
  });

  describe("line changes", () => {
    it("shows added, removed, net and average lines per file", () => {
      render(<PRDashboard analysis={mixedReport().analysis} />);

      expect(statValue("Added")).toHaveTextContent("+20");
      expect(statValue("Removed")).toHaveTextContent("−7");
      expect(statValue("Net")).toHaveTextContent("+13");
      expect(statValue("Avg / file")).toHaveTextContent("5"); // round(27 / 5)
      expect(screen.getByText("27 total")).toBeInTheDocument();
    });

    it("shows a negative net without a plus sign", () => {
      const analysis = buildAnalysis([{ ...FILES.clean, additions: 1, deletions: 9 }]);
      render(<PRDashboard analysis={analysis} />);

      expect(statValue("Net")).toHaveTextContent("-8");
    });

    it("breaks files down into added / modified / removed", () => {
      render(<PRDashboard analysis={mixedReport().analysis} />);

      expect(screen.getByText("1 added · 4 modified · 0 removed")).toBeInTheDocument();
    });
  });

  it("renders zeros, not NaN, for a PR with no files", () => {
    const { container } = render(<PRDashboard analysis={buildAnalysis([])} />);

    expect(container.innerHTML).not.toContain("NaN");
    expect(container.innerHTML).not.toContain("Infinity");
    expect(statValue("Avg / file")).toHaveTextContent("0");
  });
});
