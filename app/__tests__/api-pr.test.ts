import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { GET } from "@/app/api/pr/route";
import { createMockRequest } from "./test-utils";

// Declare mock functions at the top level with vi.hoisted()
// This runs before vi.mock() executes, avoiding closure issues
const { mockGetPRMetadata } = vi.hoisted(() => ({
  mockGetPRMetadata: vi.fn(),
}));

vi.mock("@/lib/github/pr-metadata/get", () => ({
  getPRMetadata: mockGetPRMetadata,
  getFullPRAnalysis: vi.fn(),
}));

import {
  mockPRAnalysisSuccess,
  mockPRAnalysisNoChanges,
  mockErrorResponses,
  mockRequestBodies,
} from "./fixtures";

describe("GET /api/pr", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it("should analyze PR successfully", async () => {
    mockGetPRMetadata.mockResolvedValueOnce({
      ...mockPRAnalysisSuccess,
      labels: [], // Simplified for this test
    });

    const request = createMockRequest(mockRequestBodies.validPR);
    const response = await GET(request);
    const responseBody = await response.json();

    expect(response.status).toBe(200);
    expect(responseBody.prMetadata.number).toBe(123);
    expect(responseBody.changedFiles).toHaveLength(1);
  });

  it("should return 400 for missing URL", async () => {
    const request = createMockRequest(mockRequestBodies.emptyURL);
    const response = await GET(request);
    const responseBody = await response.json();

    expect(response.status).toBe(400);
    expect(responseBody.error).toBeTruthy();
  });

  it("should return 400 for invalid PR URL format", async () => {
    const request = createMockRequest(mockRequestBodies.invalidDomain);
    const response = await GET(request);
    const responseBody = await response.json();

    expect(response.status).toBe(400);
    expect(responseBody.error).toContain("Invalid");
  });

  it("should return 404 when PR not found", async () => {
    mockGetPRMetadata.mockResolvedValueOnce(mockErrorResponses.notFound);

    const request = createMockRequest(mockRequestBodies.validPR);
    const response = await GET(request);
    const responseBody = await response.json();

    expect(response.status).toBe(404);
    expect(responseBody.error).toContain("not found");
  });

  it("should return 429 when rate limited", async () => {
    mockGetPRMetadata.mockResolvedValueOnce(mockErrorResponses.rateLimited);

    const request = createMockRequest(mockRequestBodies.validPR);
    const response = await GET(request);
    const responseBody = await response.json();

    expect(response.status).toBe(429);
    expect(responseBody.error).toContain("rate limit");
  });

  it("should return 500 for internal errors", async () => {
    mockGetPRMetadata.mockResolvedValueOnce(
      mockErrorResponses.internalError,
    );

    const request = createMockRequest(mockRequestBodies.validPR);
    const response = await GET(request);
    const responseBody = await response.json();

    expect(response.status).toBe(500);
    expect(responseBody.error).toBeTruthy();
  });

  it("should handle invalid JSON in request", async () => {
    const mockRequest = {
      json: async () => {
        throw new Error("Invalid JSON");
      },
    };

    const response = await GET(mockRequest);
    const responseBody = await response.json();

    expect(response.status).toBe(500);
    expect(responseBody.error).toBeTruthy();
  });

  it("should trim whitespace from URL", async () => {
    mockGetPRMetadata.mockResolvedValueOnce({
      ...mockPRAnalysisNoChanges,
      labels: [], // Simplified for this test
    });

    const request = createMockRequest(mockRequestBodies.urlWithWhitespace);
    const response = await GET(request);

    expect(response.status).toBe(200);
  });
});
