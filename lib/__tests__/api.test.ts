import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mockPRMetadataSuccess } from "@/app/__tests__/fixtures";
import { buildAnalysis } from "@/app/components/__tests__/fixtures";
import { fetchPrAnalysis, fetchPrMetadata } from "@/lib/api";
import { API_ERROR_MESSAGES } from "@/lib/api-constants";
import { isPRAnalysisResponse, isPRMetadata, readErrorMessage } from "@/lib/api-guards";

const PR_URL = "https://github.com/owner/repo/pull/123";

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

const mockFetch = vi.fn<typeof fetch>();

beforeEach(() => {
  vi.stubGlobal("fetch", mockFetch);
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  mockFetch.mockReset();
});

describe("fetchPrMetadata / fetchPrAnalysis", () => {
  it("calls the metadata endpoint with the PR URL as an encoded query param", async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse(mockPRMetadataSuccess));

    await fetchPrMetadata(PR_URL);

    const [requestUrl, init] = mockFetch.mock.calls[0];
    expect(requestUrl).toBe(`/api/pr?url=${encodeURIComponent(PR_URL)}`);
    expect(init).toMatchObject({ method: "GET", credentials: "same-origin" });
    expect(init?.signal).toBeInstanceOf(AbortSignal);
  });

  it("calls the analysis endpoint", async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse(buildAnalysis([])));

    await fetchPrAnalysis(PR_URL);

    expect(mockFetch.mock.calls[0][0]).toBe(`/api/pr/analysis?url=${encodeURIComponent(PR_URL)}`);
  });

  it("returns data on a valid 200 response", async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse(mockPRMetadataSuccess));

    const result = await fetchPrMetadata(PR_URL);

    expect(result).toEqual({ ok: true, error: null, data: mockPRMetadataSuccess });
  });

  it("returns the server's error message on a non-2xx JSON response", async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse({ error: "PR not found" }, 404));

    const result = await fetchPrMetadata(PR_URL);

    expect(result).toEqual({ ok: false, data: null, error: "PR not found" });
  });

  it("falls back to a generic message on a non-2xx response without an error field", async () => {
    mockFetch.mockResolvedValueOnce(new Response("Bad Gateway", { status: 502 }));

    expect((await fetchPrMetadata(PR_URL)).error).toBe(API_ERROR_MESSAGES.UNKNOWN);
  });

  it("rejects a 200 response that is not JSON", async () => {
    mockFetch.mockResolvedValueOnce(
      new Response("<html></html>", { status: 200, headers: { "content-type": "text/html" } }),
    );

    expect((await fetchPrMetadata(PR_URL)).error).toBe(API_ERROR_MESSAGES.NON_JSON);
  });

  it("rejects a 200 JSON response with the wrong shape", async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse({ unexpected: true }));

    expect((await fetchPrAnalysis(PR_URL)).error).toBe(API_ERROR_MESSAGES.INVALID_SHAPE);
  });

  it.each([
    ["a network failure", new TypeError("Failed to fetch"), API_ERROR_MESSAGES.NETWORK],
    ["a timeout", new DOMException("t", "TimeoutError"), API_ERROR_MESSAGES.TIMEOUT],
    ["an abort", new DOMException("a", "AbortError"), API_ERROR_MESSAGES.ABORTED],
    ["anything else", new Error("boom"), API_ERROR_MESSAGES.UNKNOWN],
  ])("maps %s to a user-facing message", async (_, error, message) => {
    mockFetch.mockRejectedValueOnce(error);

    expect(await fetchPrMetadata(PR_URL)).toEqual({ ok: false, data: null, error: message });
  });

  it("aborts the request when the caller's signal aborts", async () => {
    const controller = new AbortController();
    mockFetch.mockImplementationOnce(
      (_, init) =>
        new Promise((_, reject) => {
          init?.signal?.addEventListener("abort", () => reject(new DOMException("a", "AbortError")));
        }),
    );

    const pending = fetchPrMetadata(PR_URL, { signal: controller.signal });
    controller.abort();

    expect((await pending).error).toBe(API_ERROR_MESSAGES.ABORTED);
  });
});

describe("response guards", () => {
  it("accepts real PR metadata and rejects incomplete objects", () => {
    expect(isPRMetadata(mockPRMetadataSuccess)).toBe(true);
    expect(isPRMetadata({ ...mockPRMetadataSuccess, user: null })).toBe(false);
    expect(isPRMetadata({ number: "123", title: "x" })).toBe(false);
    expect(isPRMetadata([])).toBe(false);
    expect(isPRMetadata(null)).toBe(false);
  });

  it("accepts a real engine-produced analysis response", () => {
    expect(isPRAnalysisResponse(buildAnalysis([]))).toBe(true);
  });

  it("rejects an analysis response with a malformed changed file", () => {
    const analysis = buildAnalysis([]);

    expect(isPRAnalysisResponse({ ...analysis, changedFiles: [{ filename: "a.ts" }] })).toBe(false);
  });

  it("rejects an analysis response missing aggregate fields", () => {
    const analysis = buildAnalysis([]);
    const { fileSeverity: _, ...aggregate } = analysis.analysis.aggregate;

    expect(isPRAnalysisResponse({ ...analysis, analysis: { ...analysis.analysis, aggregate } })).toBe(false);
  });

  it("reads an error message only when it is a string", () => {
    expect(readErrorMessage({ error: "nope" })).toBe("nope");
    expect(readErrorMessage({ error: 500 })).toBeNull();
    expect(readErrorMessage(undefined)).toBeNull();
  });
});
