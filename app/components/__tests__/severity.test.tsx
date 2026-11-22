import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { FILE_SEVERITY_ORDER, SEVERITY_ORDER, severityRank } from "../_lib/severity";
import { SeverityBadge } from "../severity/SeverityBadge";
import { SeverityBar } from "../severity/SeverityBar";

describe("severity helpers", () => {
  it("orders severities from most to least severe, with 'none' last", () => {
    expect(SEVERITY_ORDER).toEqual(["critical", "high", "medium", "low"]);
    expect(FILE_SEVERITY_ORDER.at(-1)).toBe("none");
  });

  it("ranks critical first and none last", () => {
    expect(severityRank("critical")).toBeLessThan(severityRank("high"));
    expect(severityRank("low")).toBeLessThan(severityRank("none"));
  });
});

describe("SeverityBadge", () => {
  it.each([
    ["critical", "Critical"],
    ["high", "High"],
    ["medium", "Medium"],
    ["low", "Low"],
    ["none", "None"],
  ] as const)("renders the %s label", (severity, label) => {
    render(<SeverityBadge severity={severity} />);

    expect(screen.getByText(label)).toBeInTheDocument();
  });

  it("uses a custom label when given", () => {
    render(<SeverityBadge severity="none" label="No risks" />);

    expect(screen.getByText("No risks")).toBeInTheDocument();
    expect(screen.queryByText("None")).not.toBeInTheDocument();
  });
});

describe("SeverityBar", () => {
  const renderBar = (counts: Parameters<typeof SeverityBar>[0]["counts"]) =>
    render(<SeverityBar counts={counts} order={SEVERITY_ORDER} ariaLabel="findings by severity" />);

  it("exposes the bar as an accessible image with the given label", () => {
    renderBar({ high: 1 });

    expect(screen.getByRole("img", { name: "findings by severity" })).toBeInTheDocument();
  });

  it("shows a legend entry with a count for every level, including zero", () => {
    renderBar({ critical: 2, low: 1 });
    const items = screen.getAllByRole("listitem");

    expect(items.map((li) => li.textContent)).toEqual(["Critical2", "High0", "Medium0", "Low1"]);
  });

  it("renders one proportional segment per non-zero level", () => {
    renderBar({ critical: 1, medium: 3 });
    const segments = within(screen.getByRole("img")).getAllByRole("generic", { hidden: true });

    expect(segments.map((s) => s.style.width)).toEqual(["25%", "75%"]);
  });

  it("renders no segments (and no NaN widths) when every count is zero", () => {
    renderBar({});
    const bar = screen.getByRole("img");

    expect(bar.children).toHaveLength(0);
    expect(bar.innerHTML).not.toContain("NaN");
  });
});
