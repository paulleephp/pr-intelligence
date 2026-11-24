/**
 * lib/diff/util/finding-id.ts (S4-T4): withLine puts a line on a finding, buildFindingId and
 * withFindingId give it an id: <ruleId>:<filename>:<line>, or <ruleId>:<filename> without a line.
 * How the engine uses them is in findings.lines.test.ts and findings.ids.test.ts.
 */
import { describe, expect, it } from "vitest";
import { buildFindingId, withFindingId, withLine } from "@/lib/diff/util/finding-id";
import type { Pattern } from "@/lib/types/diff/pattern";

const PATTERN: Pattern = {
  ruleId: "R016",
  severity: "high",
  filename: "src/a.ts",
  message: 'Dangerous code execution or DOM sink introduced in src/a.ts: "eval("',
  evidence: "eval(x);",
};

describe("buildFindingId", () => {
  it("is <ruleId>:<filename>:<line> for a finding with a line", () => {
    expect(buildFindingId({ ...PATTERN, line: 52 })).toBe("R016:src/a.ts:52");
  });

  it("is <ruleId>:<filename> for a finding without a line", () => {
    expect(buildFindingId(PATTERN)).toBe("R016:src/a.ts");
  });

  it("is the same for the same finding every time", () => {
    expect(buildFindingId({ ...PATTERN, line: 3 })).toBe(buildFindingId({ ...PATTERN, line: 3 }));
  });

  it.each<[string, Partial<Pattern>]>([
    ["rule", { ruleId: "R015" }],
    ["file", { filename: "src/b.ts" }],
    ["line", { line: 4 }],
  ])("differs when the %s differs", (_, change) => {
    expect(buildFindingId({ ...PATTERN, line: 3, ...change })).not.toBe(
      buildFindingId({ ...PATTERN, line: 3 }),
    );
  });
});

describe("withFindingId", () => {
  it("adds the id and keeps every other field", () => {
    expect(withFindingId({ ...PATTERN, line: 3 })).toEqual({
      ...PATTERN,
      line: 3,
      id: "R016:src/a.ts:3",
    });
  });

  it("returns a new finding and leaves the one it was given unchanged", () => {
    const original = { ...PATTERN };

    expect(withFindingId(original)).not.toBe(original);
    expect(original).toEqual(PATTERN);
  });
});

describe("withLine", () => {
  it("adds the line", () => {
    expect(withLine(PATTERN, 7)).toEqual({ ...PATTERN, line: 7 });
  });

  it("adds no line key when there is no line", () => {
    expect(withLine(PATTERN, undefined)).not.toHaveProperty("line");
  });

  // The schema only accepts positive lines (lib/schemas/common.ts).
  it("never records line 0", () => {
    expect(withLine(PATTERN, 0)).not.toHaveProperty("line");
  });
});
