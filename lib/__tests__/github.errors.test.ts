/**
 * lib/github/errors.ts: toGitHubErrorResponse turns an Octokit error into the { status, error } the
 * API routes send. A pure function, so nothing is mocked; Octokit-shaped errors live in
 * ./fixtures/github.ts.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GITHUB_ERROR_MESSAGES } from "@/lib/github/constants";
import { toGitHubErrorResponse } from "@/lib/github/errors";
import { HTTP_STATUS } from "../constants";
import { errors } from "./fixtures/github";

beforeEach(() => {
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("toGitHubErrorResponse", () => {
  const { RATE_LIMIT, BAD_TOKEN, FORBIDDEN, PR_NOT_FOUND, FETCH_FAILED } = GITHUB_ERROR_MESSAGES;
  const {
    TOO_MANY_REQUESTS,
    FORBIDDEN: FORBIDDEN_STATUS,
    UNAUTHORIZED,
    NOT_FOUND,
    INTERNAL_SERVER_ERROR,
  } = HTTP_STATUS;

  it.each([
    ["429", { status: 429 }, TOO_MANY_REQUESTS, RATE_LIMIT],
    ["429 on response", errors.rateLimited, TOO_MANY_REQUESTS, RATE_LIMIT],
    ["403 with x-ratelimit-remaining: 0", errors.quotaExhausted, TOO_MANY_REQUESTS, RATE_LIMIT],
    [
      "403 with numeric x-ratelimit-remaining 0",
      errors.quotaExhaustedNumeric,
      TOO_MANY_REQUESTS,
      RATE_LIMIT,
    ],
    [
      "403 with retry-after (secondary rate limit)",
      errors.secondaryRateLimit,
      TOO_MANY_REQUESTS,
      RATE_LIMIT,
    ],
    ["403 with quota left", errors.forbiddenWithQuotaLeft, FORBIDDEN_STATUS, FORBIDDEN],
    ["403 without headers", errors.rateLimitedForbidden, FORBIDDEN_STATUS, FORBIDDEN],
    ["401", { status: 401 }, UNAUTHORIZED, BAD_TOKEN],
    ["404", errors.notFound, NOT_FOUND, PR_NOT_FOUND],
    ["500", { status: 500 }, INTERNAL_SERVER_ERROR, FETCH_FAILED],
    ["a plain Error", errors.networkError, INTERNAL_SERVER_ERROR, FETCH_FAILED],
    ["a non-object", "boom", INTERNAL_SERVER_ERROR, FETCH_FAILED],
    ["null", null, INTERNAL_SERVER_ERROR, FETCH_FAILED],
  ])("maps %s", (_, error, status, message) => {
    expect(toGitHubErrorResponse(error)).toEqual({ status, error: message });
  });

  it("prefers the top-level status over response.status", () => {
    expect(toGitHubErrorResponse({ status: 404, response: { status: 500 } }).status).toBe(
      NOT_FOUND,
    );
  });

  it("never echoes the raw GitHub error message to the client", () => {
    const result = toGitHubErrorResponse({ status: 500, message: "secret internal detail" });

    expect(result.error).not.toContain("secret internal detail");
  });
});
