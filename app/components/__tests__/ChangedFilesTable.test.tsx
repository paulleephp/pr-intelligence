import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ChangedFilesTable } from "../ChangedFilesTable";
import { buildAnalysis, FILES, mixedReport } from "./fixtures";

const bodyRows = () => screen.getAllByRole("row").slice(1); // drop header row
const cells = (row: HTMLElement) => within(row).getAllByRole("cell").map((c) => c.textContent);

describe("ChangedFilesTable", () => {
  it("shows the file count in the heading", () => {
    render(<ChangedFilesTable analysis={mixedReport().analysis} />);

    expect(screen.getByRole("heading", { name: "Changed files (5)" })).toBeInTheDocument();
  });

  it("renders the expected column headers", () => {
    render(<ChangedFilesTable analysis={mixedReport().analysis} />);

    expect(screen.getAllByRole("columnheader").map((h) => h.textContent)).toEqual([
      "File",
      "Type",
      "Status",
      "Lines",
      "Severity",
    ]);
  });

  it("sorts rows by severity (most severe first), then by filename", () => {
    render(<ChangedFilesTable analysis={mixedReport().analysis} />);

    expect(bodyRows().map((row) => cells(row)[0])).toEqual([
      "src/config.ts",
      "src/hash.ts",
      ".github/workflows/ci.yml",
      "package.json",
      "README.md",
    ]);
  });

  it("breaks severity ties alphabetically", () => {
    const a = { ...FILES.medium, filename: ".github/workflows/b.yml" };
    const b = { ...FILES.medium, filename: ".github/workflows/a.yml" };
    render(<ChangedFilesTable analysis={buildAnalysis([a, b])} />);

    expect(bodyRows().map((row) => cells(row)[0])).toEqual([
      ".github/workflows/a.yml",
      ".github/workflows/b.yml",
    ]);
  });

  it("shows type, status, line counts and severity for each file", () => {
    render(<ChangedFilesTable analysis={mixedReport().analysis} />);
    const [critical] = bodyRows();
    const readme = bodyRows().at(-1) as HTMLElement;

    expect(cells(critical)).toEqual(["src/config.ts", "Backend", "modified", "+10 −2", "Critical"]);
    expect(cells(readme)).toEqual(["README.md", "Docs", "added", "+2 −1", "None"]);
  });

  it("shows the full filename as a tooltip for truncated paths", () => {
    render(<ChangedFilesTable analysis={mixedReport().analysis} />);

    expect(screen.getByTitle(".github/workflows/ci.yml")).toBeInTheDocument();
  });

  it("falls back to Backend when the file type is unknown", () => {
    const analysis = buildAnalysis([FILES.clean]);
    analysis.analysis.fileTypes = {};
    render(<ChangedFilesTable analysis={analysis} />);

    expect(cells(bodyRows()[0])[1]).toBe("Backend");
  });

  it("shows an empty state instead of a table when no files changed", () => {
    render(<ChangedFilesTable analysis={buildAnalysis([])} />);

    expect(screen.getByText("No changed files found")).toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });
});
