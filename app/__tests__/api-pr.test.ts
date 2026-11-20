import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { POST } from "@/app/api/pr/route";
import { createMockRequest } from "./test-utils";
import {
  mockPRAnalysisSuccess,
  mockPRAnalysisNoChanges,
  mockErrorResponses,
  mockRequestBodies,
} from "./fixtures";

// Mock the github module
vi.mock("@/lib/github", () => ({
  analyzePR: vi.fn(),
}));

describe("POST /api/pr", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it("should analyze PR successfully", async () => {
    const { analyzePR } = await import("@/lib/github");
    console.log('analyzePR:', analyzePR);
    vi.mocked(analyzePR).mockResolvedValueOnce({ data: mockPRAnalysisSuccess });
    const prResult = await analyzePR('test', 'repo', 123);
    console.log('analyzePR result:', prResult);

    const request = createMockRequest(mockRequestBodies.validPR);
    const response = await POST(request);
    const responseBody = await response.json();

    expect(response.status).toBe(200);
    expect(responseBody.prMetadata.number).toBe(123);
    expect(responseBody.changedFiles).toHaveLength(1);
  });

  it("should return 400 for missing URL", async () => {
    const request = createMockRequest(mockRequestBodies.emptyURL);
    const response = await POST(request);
    const responseBody = await response.json();

    expect(response.status).toBe(400);
    expect(responseBody.error).toBeTruthy();
  });

  it("should return 400 for invalid PR URL format", async () => {
    const request = createMockRequest(mockRequestBodies.invalidDomain);
    const response = await POST(request);
    const responseBody = await response.json();

    expect(response.status).toBe(400);
    expect(responseBody.error).toContain("Invalid");
  });

  it("should return 404 when PR not found", async () => {
    const { analyzePR } = await import("@/lib/github");
    vi.mocked(analyzePR).mockResolvedValueOnce(mockErrorResponses.notFound);

    const request = createMockRequest(mockRequestBodies.validPR);
    const response = await POST(request);
    const responseBody = await response.json();

    expect(response.status).toBe(404);
    expect(responseBody.error).toContain("not found");
  });

  it("should return 429 when rate limited", async () => {
    const { analyzePR } = await import("@/lib/github");
    vi.mocked(analyzePR).mockResolvedValueOnce(mockErrorResponses.rateLimited);

    const request = createMockRequest(mockRequestBodies.validPR);
    const response = await POST(request);
    const responseBody = await response.json();

    expect(response.status).toBe(429);
    expect(responseBody.error).toContain("rate limit");
  });

  it("should return 500 for internal errors", async () => {
    const { analyzePR } = await import("@/lib/github");
    vi.mocked(analyzePR).mockResolvedValueOnce(
      mockErrorResponses.internalError,
    );

    const request = createMockRequest(mockRequestBodies.validPR);
    const response = await POST(request);
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

    const response = await POST(mockRequest);
    const responseBody = await response.json();

    expect(response.status).toBe(500);
    expect(responseBody.error).toBeTruthy();
  });

  it("should trim whitespace from URL", async () => {
    const { analyzePR } = await import("@/lib/github");
    vi.mocked(analyzePR).mockResolvedValueOnce({
      data: mockPRAnalysisNoChanges,
    });

    const request = createMockRequest(mockRequestBodies.urlWithWhitespace);
    const response = await POST(request);

    expect(response.status).toBe(200);
  });
});
