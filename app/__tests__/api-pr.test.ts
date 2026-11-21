import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GET as getAnalysis, POST as postAnalysis } from "@/app/api/pr/analysis/route";
import { GET, POST } from "@/app/api/pr/route";
import { createMockRequest } from "./test-utils";

const { mockGetPRMetadata, mockGetFullPRAnalysis } = vi.hoisted(() => ({
  mockGetPRMetadata: vi.fn(),
  mockGetFullPRAnalysis: vi.fn(),
}));

vi.mock("@/lib/github/pr-metadata/get", () => ({
  getPRMetadata: mockGetPRMetadata,
  getFullPRAnalysis: mockGetFullPRAnalysis,
}));

import {
  mockErrorResponses,
  mockPRAnalysisNoChanges,
  mockPRAnalysisSuccess,
  mockPRUrls,
} from "./fixtures";

const PR_PATH = "/api/pr";
const ANALYSIS_PATH = "/api/pr/analysis";

describe("GET /api/pr", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it("should return PR metadata for a valid url query", async () => {
    mockGetPRMetadata.mockResolvedValueOnce({ ...mockPRAnalysisSuccess, labels: [] });

    const response = await GET(createMockRequest(PR_PATH, mockPRUrls.validPR));
    const responseBody = await response.json();

    expect(response.status).toBe(200);
    expect(responseBody.prMetadata.number).toBe(123);
    expect(mockGetPRMetadata).toHaveBeenCalledWith("owner", "repo", 123);
  });

  it("should return 400 when url query is missing", async () => {
    const response = await GET(createMockRequest(PR_PATH));
    const responseBody = await response.json();

    expect(response.status).toBe(400);
    expect(responseBody.error).toBeTruthy();
    expect(mockGetPRMetadata).not.toHaveBeenCalled();
  });

  it("should return 400 for empty url query", async () => {
    const response = await GET(createMockRequest(PR_PATH, mockPRUrls.emptyURL));

    expect(response.status).toBe(400);
  });

  it("should return 400 for invalid PR URL format", async () => {
    const response = await GET(createMockRequest(PR_PATH, mockPRUrls.invalidDomain));
    const responseBody = await response.json();

    expect(response.status).toBe(400);
    expect(responseBody.error).toContain("Invalid");
  });

  it("should return 404 when PR not found", async () => {
    mockGetPRMetadata.mockResolvedValueOnce(mockErrorResponses.notFound);

    const response = await GET(createMockRequest(PR_PATH, mockPRUrls.validPR));
    const responseBody = await response.json();

    expect(response.status).toBe(404);
    expect(responseBody.error).toContain("not found");
  });

  it("should return 429 when rate limited", async () => {
    mockGetPRMetadata.mockResolvedValueOnce(mockErrorResponses.rateLimited);

    const response = await GET(createMockRequest(PR_PATH, mockPRUrls.validPR));
    const responseBody = await response.json();

    expect(response.status).toBe(429);
    expect(responseBody.error).toContain("rate limit");
  });

  it("should return 500 for internal errors", async () => {
    mockGetPRMetadata.mockResolvedValueOnce(mockErrorResponses.internalError);

    const response = await GET(createMockRequest(PR_PATH, mockPRUrls.validPR));
    const responseBody = await response.json();

    expect(response.status).toBe(500);
    expect(responseBody.error).toBeTruthy();
  });

  it("should trim whitespace from URL", async () => {
    mockGetPRMetadata.mockResolvedValueOnce({ ...mockPRAnalysisNoChanges, labels: [] });

    const response = await GET(createMockRequest(PR_PATH, mockPRUrls.urlWithWhitespace));

    expect(response.status).toBe(200);
  });

  it("should reject POST with 405", async () => {
    const response = await POST();

    expect(response.status).toBe(405);
  });
});

describe("GET /api/pr/analysis", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return analysis for a valid url query", async () => {
    mockGetFullPRAnalysis.mockResolvedValueOnce(mockPRAnalysisSuccess);

    const response = await getAnalysis(createMockRequest(ANALYSIS_PATH, mockPRUrls.validPR));

    expect(response.status).toBe(200);
    expect(mockGetFullPRAnalysis).toHaveBeenCalledWith("owner", "repo", 123);
  });

  it("should return 400 when url query is missing", async () => {
    const response = await getAnalysis(createMockRequest(ANALYSIS_PATH));

    expect(response.status).toBe(400);
    expect(mockGetFullPRAnalysis).not.toHaveBeenCalled();
  });

  it("should propagate GitHub error status instead of 200", async () => {
    mockGetFullPRAnalysis.mockResolvedValueOnce(mockErrorResponses.notFound);

    const response = await getAnalysis(createMockRequest(ANALYSIS_PATH, mockPRUrls.validPR));

    expect(response.status).toBe(404);
  });

  it("should reject POST with 405", async () => {
    const response = await postAnalysis();

    expect(response.status).toBe(405);
  });
});
