/**
 * GET /api/pr response: prMetadataSchema (lib/schemas/pr-metadata.ts), which lib/api.ts validates
 * the response with. Rules carried over from the old hand-written guards (lib/api-guards.ts,
 * replaced 2026-11-23) are marked "(guard rule)". How a failed parse reaches the UI is in api.test.ts.
 */
import { describe, expect, it } from "vitest";
import { mockPRMetadataSuccess } from "@/app/__tests__/fixtures";
import { prMetadataSchema } from "@/lib/schemas/pr-metadata";

describe("prMetadataSchema", () => {
  const meta = (overrides: object) => ({ ...mockPRMetadataSuccess, ...overrides });

  it.each(["open", "closed", "merged"])("accepts PR metadata with state %s", (state) => {
    expect(prMetadataSchema.safeParse(meta({ state })).success).toBe(true);
  });

  it("accepts mergeable: null (GitHub hasn't computed it yet)", () => {
    expect(prMetadataSchema.safeParse(meta({ mergeable: null })).success).toBe(true);
  });

  it.each([
    ["an array (guard rule)", []],
    ["null (guard rule)", null],
    ["a number given as a string (guard rule)", meta({ number: "123" })],
    ["a missing title (guard rule)", meta({ title: undefined })],
    ["a missing html_url (guard rule)", meta({ html_url: undefined })],
    ["an unknown state (guard rule)", meta({ state: "draft" })],
    ["user: null (guard rule)", meta({ user: null })],
    ["a user without login (guard rule)", meta({ user: { ...mockPRMetadataSuccess.user, login: undefined } })],
    ["a label without color", meta({ labels: [{ name: "bug" }] })],
    ["a missing base.ref", meta({ base: { repo: mockPRMetadataSuccess.base.repo } })],
  ])("rejects %s", (_, value) => {
    expect(prMetadataSchema.safeParse(value).success).toBe(false);
  });
});
