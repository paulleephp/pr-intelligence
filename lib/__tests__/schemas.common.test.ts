/**
 * Schemas every endpoint shares: the { error } body of a failed response (lib/schemas/common.ts),
 * which lib/api.ts reads the message from, the finding shape (patternSchema, same file), and the
 * `url` query param (lib/schemas/request.ts), which the route handlers validate. Rules carried
 * over from the old hand-written guards (lib/api-guards.ts, replaced 2026-11-23) are marked
 * "(guard rule)". Per-endpoint response schemas are in schemas.<endpoint>.test.ts.
 */
import { describe, expect, it } from "vitest";
import { analyzeDiff } from "@/lib/diff/core";
import { errorBodySchema, patternSchema } from "@/lib/schemas/common";
import { prUrlParamSchema } from "@/lib/schemas/request";
import { file } from "./fixtures/rules";

describe("errorBodySchema", () => {
  it("reads a string error message (guard rule)", () => {
    expect(errorBodySchema.safeParse({ error: "nope" })).toMatchObject({
      success: true,
      data: { error: "nope" },
    });
  });

  it.each([
    ["a non-string error (guard rule)", { error: 500 }],
    ["no body (guard rule)", undefined],
    ["a body without error", { message: "nope" }],
  ])("rejects %s", (_, body) => {
    expect(errorBodySchema.safeParse(body).success).toBe(false);
  });
});

// S4-T4: `line` and `id` are optional this sprint (id becomes required in Sprint 5, S5-T1).
describe("patternSchema", () => {
  const PATTERN = { ruleId: "R016", severity: "high", filename: "src/a.ts", message: "m" };

  it.each([
    ["no line and no id", PATTERN],
    ["a line and an id", { ...PATTERN, line: 52, id: "R016:src/a.ts:52" }],
    ["an id but no line (a path rule)", { ...PATTERN, id: "R016:src/a.ts" }],
    ["a line but no id (a per-file report)", { ...PATTERN, line: 1 }],
  ])("accepts a finding with %s", (_, value) => {
    expect(patternSchema.parse(value)).toEqual(value);
  });

  it.each([
    ["line 0", { line: 0 }],
    ["a negative line", { line: -3 }],
    ["a fractional line", { line: 1.5 }],
    ["a line that is a string", { line: "52" }],
    ["an id that is a number", { id: 52 }],
  ])("rejects a finding with %s", (_, overrides) => {
    expect(patternSchema.safeParse({ ...PATTERN, ...overrides }).success).toBe(false);
  });

  it("passes real findings, with and without a line, through unchanged", () => {
    const { findings } = analyzeDiff([
      file({ filename: "src/a.ts", patch: "@@ -1 +1,2 @@\n x\n+eval(code);" }),
      file({ filename: "infra/main.tf" }),
    ]).aggregate;

    expect(findings.map((f) => f.id).sort()).toEqual(["R011:infra/main.tf", "R016:src/a.ts:2"]);
    for (const finding of findings) {
      expect(patternSchema.parse(finding)).toEqual(finding);
    }
  });
});

describe("prUrlParamSchema", () => {
  it("trims the url query param", () => {
    expect(prUrlParamSchema.safeParse("  https://github.com/o/r/pull/1  ")).toMatchObject({
      success: true,
      data: "https://github.com/o/r/pull/1",
    });
  });

  it.each([
    ["a missing param", null],
    ["an empty string", ""],
    ["only whitespace", "   "],
  ])("rejects %s", (_, value) => {
    expect(prUrlParamSchema.safeParse(value).success).toBe(false);
  });
});
