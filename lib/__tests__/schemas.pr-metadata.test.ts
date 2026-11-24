/**
 * GET /api/pr response: prMetadataSchema (lib/schemas/pr-metadata.ts), which lib/api.ts validates
 * the response with. Rules carried over from the old hand-written guards (lib/api-guards.ts,
 * replaced 2026-11-23) are marked "(guard rule)". How a failed parse reaches the UI is in api.test.ts.
 */
import { describe, expect, it, vi } from "vitest";
import { mockPRMetadataSuccess } from "@/app/__tests__/fixtures";
import { getPRMetadata } from "@/lib/github/pr-metadata/get";
import { prMetadataSchema } from "@/lib/schemas/pr-metadata";
import { octokit } from "./fixtures/github";

const { mockOctokit, mockPullsGet } = await vi.hoisted(() => import("./mocks/octokit"));

vi.mock("@octokit/rest", () => ({ Octokit: mockOctokit }));

describe("prMetadataSchema", () => {
  const meta = (overrides: object) => ({ ...mockPRMetadataSuccess, ...overrides });

  // lib/api.ts hands the UI parsed.data, and z.object drops keys it doesn't define: a field added to
  // PRMetadata but not to the schema would never reach the UI. The input is exactly what the route
  // sends; it has labels and a non-null mergeable, so no field hides behind an empty array or null.
  it("passes every field of a real /api/pr response through unchanged", async () => {
    mockPullsGet.mockResolvedValueOnce({
      data: { ...octokit.pullsGetWithLabels.data, mergeable: true },
    });
    const real = await getPRMetadata("owner", "repo", 1);

    expect(prMetadataSchema.parse(real)).toEqual(real);
  });

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
    ["a PR number of 0", meta({ number: 0 })],
    ["a negative PR number", meta({ number: -1 })],
    ["a fractional PR number", meta({ number: 1.5 })],
    ["a missing title (guard rule)", meta({ title: undefined })],
    ["a missing html_url (guard rule)", meta({ html_url: undefined })],
    ["an unknown state (guard rule)", meta({ state: "draft" })],
    ["user: null (guard rule)", meta({ user: null })],
    [
      "a user without login (guard rule)",
      meta({ user: { ...mockPRMetadataSuccess.user, login: undefined } }),
    ],
    ["a label without color", meta({ labels: [{ name: "bug" }] })],
    ["a missing base.ref", meta({ base: { repo: mockPRMetadataSuccess.base.repo } })],
  ])("rejects %s", (_, value) => {
    expect(prMetadataSchema.safeParse(value).success).toBe(false);
  });
});
