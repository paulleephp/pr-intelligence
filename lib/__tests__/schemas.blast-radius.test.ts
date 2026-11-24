/**
 * lib/schemas/blast-radius.ts blastRadiusSchema, and its place in the /api/pr/analysis response
 * (analysis.blastRadius). The round trip of a full real response is in schemas.pr-analysis.test.ts.
 */
import { describe, expect, it } from "vitest";
import { buildAnalysis } from "@/app/components/__tests__/fixtures";
import { getBlastRadius } from "@/lib/diff/blast-radius";
import { blastRadiusSchema } from "@/lib/schemas/blast-radius";
import { prAnalysisResponseSchema } from "@/lib/schemas/pr-analysis";
import type { BlastRadius } from "@/lib/types/diff/blast-radius";
import { edited } from "./fixtures/blast-radius";

/** Real engine output: moderate, two modules, tests changed. */
const radius = () =>
  getBlastRadius([edited("src/auth/a.ts"), edited("src/db/b.ts"), edited("src/auth/a.test.ts")]);

const withRadius = (blastRadius: unknown) => {
  const response = buildAnalysis([edited("src/a.ts")]);
  return { ...response, analysis: { ...response.analysis, blastRadius } };
};

const BAD_COUNTS = [
  ["negative", -1],
  ["fractional", 1.5],
  ["a string", "3"],
  ["missing", undefined],
] as const;

describe("blastRadiusSchema", () => {
  it("passes real engine output through unchanged", () => {
    const value = radius();

    expect(value.spread.modules).toEqual(["src/auth", "src/db"]);
    expect(blastRadiusSchema.parse(value)).toEqual(value);
  });

  it.each(["contained", "moderate", "wide"])("accepts the level %s everywhere", (level) => {
    const r = radius();
    const value = {
      ...r,
      level,
      fileCount: { ...r.fileCount, level },
      spread: { ...r.spread, level },
    };

    expect(blastRadiusSchema.safeParse(value).success).toBe(true);
  });

  it.each(["no-source-changes", "no-tests", "tests-changed"])(
    "accepts the test state %s",
    (state) => {
      expect(
        blastRadiusSchema.safeParse({ ...radius(), tests: { ...radius().tests, state } }).success,
      ).toBe(true);
    },
  );

  it.each<[string, (r: BlastRadius) => unknown]>([
    ["an unknown overall level", (r) => ({ ...r, level: "huge" })],
    [
      "an unknown file-count level",
      (r) => ({ ...r, fileCount: { ...r.fileCount, level: "huge" } }),
    ],
    ["a capitalised spread level", (r) => ({ ...r, spread: { ...r.spread, level: "Wide" } })],
    ["an unknown test state", (r) => ({ ...r, tests: { ...r.tests, state: "no-test" } })],
    ["modules that isn't an array", (r) => ({ ...r, spread: { ...r.spread, modules: "src" } })],
    ["a module that isn't a string", (r) => ({ ...r, spread: { ...r.spread, modules: [1] } })],
    ["a missing fileCount", (r) => ({ ...r, fileCount: undefined })],
    ["a missing spread", (r) => ({ ...r, spread: undefined })],
    ["a missing tests", (r) => ({ ...r, tests: undefined })],
  ])("rejects %s", (_, change) => {
    expect(blastRadiusSchema.safeParse(change(radius())).success).toBe(false);
  });

  it.each(
    [
      ["fileCount", "counted"],
      ["fileCount", "excluded"],
      ["tests", "sourceFiles"],
      ["tests", "testFiles"],
    ].flatMap(([group, field]) =>
      BAD_COUNTS.map(([label, value]) => [`${group}.${field}`, label, value] as const),
    ),
  )("rejects %s that is %s", (path, _, value) => {
    const [group, field] = path.split(".") as ["fileCount" | "tests", string];
    const r = radius();

    expect(
      blastRadiusSchema.safeParse({ ...r, [group]: { ...r[group], [field]: value } }).success,
    ).toBe(false);
  });
});

describe("prAnalysisResponseSchema: analysis.blastRadius", () => {
  it("accepts a response with real engine output", () => {
    expect(prAnalysisResponseSchema.safeParse(withRadius(radius())).success).toBe(true);
  });

  it.each([
    ["a missing blastRadius", undefined],
    ["a malformed blastRadius", { ...radius(), level: "huge" }],
  ])("rejects a response with %s", (_, blastRadius) => {
    expect(prAnalysisResponseSchema.safeParse(withRadius(blastRadius)).success).toBe(false);
  });
});
