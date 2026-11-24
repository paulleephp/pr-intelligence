/**
 * lib/api.ts: the browser fetch client (fetch stubbed). The response schemas it validates with are
 * tested rule by rule in schemas.<endpoint>.test.ts; here only how a failed parse reaches the caller.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mockPRMetadataSuccess } from "@/app/__tests__/fixtures";
import { buildAnalysis } from "@/app/components/__tests__/fixtures";
import { fetchPrAnalysis, fetchPrMetadata } from "@/lib/api";
import { API_ERROR_MESSAGES } from "@/lib/api-constants";

const PR_URL = "https://github.com/owner/repo/pull/123";

type Analysis = ReturnType<typeof buildAnalysis>;

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

  it("falls back to a generic message when the error field is not a string", async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse({ error: 500 }, 500));

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

  // Sprint 3 T2 acceptance: these give the "unexpected format" error instead of reaching the UI.
  it.each([
    [
      "a missing fileTypes",
      (a: Analysis) => ({ ...a, analysis: { ...a.analysis, fileTypes: undefined } }),
    ],
    [
      "a negative count",
      (a: Analysis) => ({ ...a, prChangeSummary: { ...a.prChangeSummary, filesChanged: -1 } }),
    ],
    [
      "a fractional count",
      (a: Analysis) => ({ ...a, prChangeSummary: { ...a.prChangeSummary, totalLinesAdded: 1.5 } }),
    ],
  ])("rejects an analysis response with %s and logs the schema issues", async (_, corrupt) => {
    mockFetch.mockResolvedValueOnce(jsonResponse(corrupt(buildAnalysis([]))));

    expect(await fetchPrAnalysis(PR_URL)).toEqual({
      ok: false,
      data: null,
      error: API_ERROR_MESSAGES.INVALID_SHAPE,
    });
    expect(console.error).toHaveBeenCalledWith(
      expect.stringContaining("Unexpected response shape"),
      [expect.objectContaining({ path: expect.any(Array) })],
    );
  });

  // The schemas are the one place the response shape is defined: a field must be added there
  // before the UI can see it.
  it("returns the parsed data, without fields the schema doesn't define", async () => {
    mockFetch.mockResolvedValueOnce(
      jsonResponse({ ...mockPRMetadataSuccess, impact: { modules: [] } }),
    );

    expect((await fetchPrMetadata(PR_URL)).data).toEqual(mockPRMetadataSuccess);
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
          init?.signal?.addEventListener("abort", () =>
            reject(new DOMException("a", "AbortError")),
          );
        }),
    );

    const pending = fetchPrMetadata(PR_URL, { signal: controller.signal });
    controller.abort();

    expect((await pending).error).toBe(API_ERROR_MESSAGES.ABORTED);
  });
});
