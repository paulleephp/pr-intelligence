import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { NOT_SCANNED_HINT } from "../_lib/file-display";
import { ChangedFilesTable } from "../ChangedFilesTable";
import { buildAnalysis, FILES, mixedReport, UNSCANNED } from "./fixtures";

const bodyRows = () => screen.getAllByRole("row").slice(1); // drop header row
const cells = (row: HTMLElement) =>
  within(row)
    .getAllByRole("cell")
    .map((c) => c.textContent);

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

  describe("unscanned files", () => {
    const rowFor = (filename: string) =>
      bodyRows().find((row) => cells(row)[0] === filename) as HTMLElement;

    it.each([
      ["binary", UNSCANNED.binary, "Binary file"],
      ["no-patch", UNSCANNED.noPatch, "No diff available"],
    ])("shows 'Not scanned' with the %s reason as a tooltip", (_, file, reason) => {
      render(<ChangedFilesTable analysis={buildAnalysis([file, FILES.clean])} />);

      expect(cells(rowFor(file.filename)).at(-1)).toBe("Not scanned");
      expect(screen.getByText("Not scanned")).toHaveAttribute("title", reason);
      expect(cells(rowFor("README.md")).at(-1)).toBe("None");
    });

    it("keeps the type, status and line counts of an unscanned file", () => {
      render(<ChangedFilesTable analysis={buildAnalysis([UNSCANNED.noPatch])} />);

      expect(cells(bodyRows()[0])).toEqual([
        "src/old.ts",
        "Backend",
        "removed",
        "+0 −40",
        "Not scanned",
      ]);
    });

    // Path rules still run on unscanned files (deleting a migration is R004, high); the badge must show it.
    it("still shows the severity of a path finding on an unscanned file", () => {
      render(
        <ChangedFilesTable analysis={buildAnalysis([UNSCANNED.deletedMigration, FILES.clean])} />,
      );

      expect(cells(rowFor("db/migrations/001_init.sql")).at(-1)).toContain("High");
    });

    // R018 is a path finding on an unscanned file too: a script whose only change is its mode.
    it("shows Medium, with the 'not scanned' hint, for a script whose only change is its mode", () => {
      const chmod = {
        ...UNSCANNED.unchanged,
        filename: "scripts/deploy.sh",
        status: "modified" as const,
      };
      render(<ChangedFilesTable analysis={buildAnalysis([chmod, FILES.clean])} />);
      const cell = within(rowFor("scripts/deploy.sh")).getAllByRole("cell").at(-1) as HTMLElement;

      expect(cell).toHaveTextContent("Medium");
      expect(within(cell).getByText(NOT_SCANNED_HINT)).toBeInTheDocument();
    });

    it("adds a 'not scanned' hint with the reason under the severity of a flagged unscanned file", () => {
      render(
        <ChangedFilesTable analysis={buildAnalysis([UNSCANNED.deletedMigration, FILES.clean])} />,
      );
      const cell = within(rowFor("db/migrations/001_init.sql"))
        .getAllByRole("cell")
        .at(-1) as HTMLElement;

      expect(within(cell).getByText(NOT_SCANNED_HINT)).toHaveAttribute(
        "title",
        "No diff available",
      );
      expect(within(cell).queryByText("Not scanned")).not.toBeInTheDocument();
    });

    it("sorts a flagged unscanned file by its severity, above clean and unflagged files", () => {
      render(
        <ChangedFilesTable
          analysis={buildAnalysis([
            FILES.clean,
            UNSCANNED.binary,
            UNSCANNED.deletedMigration,
            FILES.low,
          ])}
        />,
      );

      expect(bodyRows()[0]).toHaveTextContent("db/migrations/001_init.sql");
    });
  });

  describe("unchanged files", () => {
    // Regression: the table listed unchanged files, so its heading disagreed with "Files changed".
    it("leaves an unchanged file out of the table and the heading count", () => {
      render(<ChangedFilesTable analysis={buildAnalysis([FILES.high, UNSCANNED.unchanged])} />);

      expect(screen.getByRole("heading", { name: "Changed files (1)" })).toBeInTheDocument();
      expect(bodyRows().map((row) => cells(row)[0])).toEqual(["src/hash.ts"]);
    });

    it("shows the empty state when every file is unchanged", () => {
      render(<ChangedFilesTable analysis={buildAnalysis([UNSCANNED.unchanged])} />);

      expect(screen.getByRole("heading", { name: "Changed files (0)" })).toBeInTheDocument();
      expect(screen.getByText("No changed files found")).toBeInTheDocument();
    });
  });

  it("shows an empty state instead of a table when no files changed", () => {
    render(<ChangedFilesTable analysis={buildAnalysis([])} />);

    expect(screen.getByText("No changed files found")).toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });
});
