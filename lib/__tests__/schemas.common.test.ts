/**
 * Schemas every endpoint shares: the { error } body of a failed response (lib/schemas/common.ts),
 * which lib/api.ts reads the message from, and the `url` query param (lib/schemas/request.ts),
 * which the route handlers validate. Rules carried over from the old hand-written guards
 * (lib/api-guards.ts, replaced 2026-11-23) are marked "(guard rule)". Per-endpoint response schemas
 * are in schemas.<endpoint>.test.ts.
 */
import { describe, expect, it } from "vitest";
import { errorBodySchema } from "@/lib/schemas/common";
import { prUrlParamSchema } from "@/lib/schemas/request";

describe("errorBodySchema", () => {
  it("reads a string error message (guard rule)", () => {
    expect(errorBodySchema.safeParse({ error: "nope" })).toMatchObject({ success: true, data: { error: "nope" } });
  });

  it.each([
    ["a non-string error (guard rule)", { error: 500 }],
    ["no body (guard rule)", undefined],
    ["a body without error", { message: "nope" }],
  ])("rejects %s", (_, body) => {
    expect(errorBodySchema.safeParse(body).success).toBe(false);
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
