import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { ChangedFile } from "@/lib/types/pr/metadata";
import { AffectedAreas } from "../AffectedAreas";
import { buildAnalysis, FILES, UNSCANNED } from "./fixtures";

const addedMigration: ChangedFile = {
  filename: "db/migrations/002_users.sql",
  status: "added",
  additions: 5,
  deletions: 0,
  patch: "@@ -0,0 +1 @@\n+CREATE TABLE users ();",
};

describe("AffectedAreas", () => {
  it.each<[string, ChangedFile[]]>([
    ["a PR with no files", []],
    ["only a dependency change (R005 has no area)", [FILES.low]],
    ["no findings at all", [FILES.clean, UNSCANNED.binary]],
  ])("renders nothing for %s", (_, files) => {
    const { container } = render(<AffectedAreas analysis={buildAnalysis(files)} />);

    expect(container).toBeEmptyDOMElement();
  });

  it("shows each area with its file count, then each file's name, status and severity", () => {
    render(
      <AffectedAreas
        analysis={buildAnalysis([FILES.medium, addedMigration, UNSCANNED.deletedMigration])}
      />,
    );

    expect(screen.getByRole("heading", { level: 2, name: "Affected areas" })).toBeInTheDocument();
    expect(screen.getAllByRole("heading", { level: 3 }).map((h) => h.textContent)).toEqual([
      "Database",
      "CI/CD",
    ]);
    expect(screen.getByRole("heading", { name: "Database" }).nextElementSibling).toHaveTextContent(
      /^2 files$/,
    );
    expect(screen.getByRole("heading", { name: "CI/CD" }).nextElementSibling).toHaveTextContent(
      /^1 file$/,
    );
    expect(
      screen.getAllByRole("listitem").map((li) => [...li.children].map((el) => el.textContent)),
    ).toEqual([
      ["db/migrations/001_init.sql", "removed", "High"],
      ["db/migrations/002_users.sql", "added", "Medium"],
      [".github/workflows/ci.yml", "modified", "Medium"],
    ]);
  });
});
