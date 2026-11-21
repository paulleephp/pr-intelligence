import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { mockPRMetadataSuccess } from "@/app/__tests__/fixtures";
import type { PRAnalysisResponse } from "@/lib/types/pr/metadata";
import type { PRMetadata } from "@/types/pr/metdata";
import type { ApiResult } from "@/types/ui/api";
import { usePRReport } from "../_lib/use-pr-report";
import { buildAnalysis, FILES } from "./fixtures";

const { mockFetchPrMetadata, mockFetchPrAnalysis } = vi.hoisted(() => ({
  mockFetchPrMetadata: vi.fn(),
  mockFetchPrAnalysis: vi.fn(),
}));

vi.mock("@/lib/api", () => ({
  fetchPrMetadata: mockFetchPrMetadata,
  fetchPrAnalysis: mockFetchPrAnalysis,
}));

const PR_URL = "https://github.com/owner/repo/pull/123";
const ok = <T>(data: T): ApiResult<T> => ({ ok: true, error: null, data });
const fail = <T>(error: string): ApiResult<T> => ({ ok: false, error, data: null });
const analysis = buildAnalysis([FILES.medium]);

/** A promise the test resolves by hand, to observe in-flight state. */
const deferred = <T>() => {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((r) => {
    resolve = r;
  });
  return { promise, resolve };
};

afterEach(() => {
  vi.resetAllMocks();
});

describe("usePRReport", () => {
  it("starts idle", () => {
    const { result } = renderHook(() => usePRReport());

    expect(result.current).toMatchObject({ report: null, loading: false, error: null });
  });

  it("requests metadata and analysis in parallel with the same URL and a shared signal", async () => {
    mockFetchPrMetadata.mockResolvedValue(ok(mockPRMetadataSuccess));
    mockFetchPrAnalysis.mockResolvedValue(ok(analysis));
    const { result } = renderHook(() => usePRReport());

    await act(() => result.current.analyze(PR_URL));

    expect(mockFetchPrMetadata).toHaveBeenCalledWith(PR_URL, { signal: expect.any(AbortSignal) });
    expect(mockFetchPrAnalysis).toHaveBeenCalledWith(PR_URL, { signal: expect.any(AbortSignal) });
    expect(mockFetchPrMetadata.mock.calls[0][1].signal).toBe(mockFetchPrAnalysis.mock.calls[0][1].signal);
  });

  it("is loading while requests are in flight, then exposes the combined report", async () => {
    const metadata = deferred<ApiResult<PRMetadata>>();
    mockFetchPrMetadata.mockReturnValue(metadata.promise);
    mockFetchPrAnalysis.mockResolvedValue(ok(analysis));
    const { result } = renderHook(() => usePRReport());

    act(() => {
      void result.current.analyze(PR_URL);
    });
    expect(result.current.loading).toBe(true);

    await act(async () => metadata.resolve(ok(mockPRMetadataSuccess)));

    expect(result.current).toMatchObject({
      loading: false,
      error: null,
      report: { metadata: mockPRMetadataSuccess, analysis },
    });
  });

  it.each([
    ["metadata", fail<PRMetadata>("PR not found"), ok(analysis), "PR not found"],
    ["analysis", ok(mockPRMetadataSuccess), fail<PRAnalysisResponse>("Rate limited"), "Rate limited"],
  ])("surfaces the error when the %s request fails", async (_, meta, anal, message) => {
    mockFetchPrMetadata.mockResolvedValue(meta);
    mockFetchPrAnalysis.mockResolvedValue(anal);
    const { result } = renderHook(() => usePRReport());

    await act(() => result.current.analyze(PR_URL));

    expect(result.current).toMatchObject({ report: null, loading: false, error: message });
  });

  it("prefers the metadata error when both requests fail", async () => {
    mockFetchPrMetadata.mockResolvedValue(fail("metadata failed"));
    mockFetchPrAnalysis.mockResolvedValue(fail("analysis failed"));
    const { result } = renderHook(() => usePRReport());

    await act(() => result.current.analyze(PR_URL));

    expect(result.current.error).toBe("metadata failed");
  });

  it("falls back to a generic message when a request returns no data and no error", async () => {
    mockFetchPrMetadata.mockResolvedValue({ ok: false, error: null, data: null });
    mockFetchPrAnalysis.mockResolvedValue(ok(analysis));
    const { result } = renderHook(() => usePRReport());

    await act(() => result.current.analyze(PR_URL));

    expect(result.current.error).toBe("Failed to analyze PR. Please check the GitHub URL.");
  });

  it("clears the previous report and error when a new analysis starts", async () => {
    mockFetchPrMetadata.mockResolvedValueOnce(fail("first failed"));
    mockFetchPrAnalysis.mockResolvedValueOnce(ok(analysis));
    const { result } = renderHook(() => usePRReport());
    await act(() => result.current.analyze(PR_URL));
    expect(result.current.error).toBe("first failed");

    const pending = deferred<ApiResult<PRMetadata>>();
    mockFetchPrMetadata.mockReturnValueOnce(pending.promise);
    mockFetchPrAnalysis.mockResolvedValueOnce(ok(analysis));
    act(() => {
      void result.current.analyze(PR_URL);
    });

    expect(result.current).toMatchObject({ report: null, loading: true, error: null });
    await act(async () => pending.resolve(ok(mockPRMetadataSuccess)));
  });

  it("aborts the previous request and ignores its late result when re-analyzing", async () => {
    const first = deferred<ApiResult<PRMetadata>>();
    mockFetchPrMetadata.mockReturnValueOnce(first.promise);
    mockFetchPrAnalysis.mockResolvedValueOnce(ok(analysis));
    const { result } = renderHook(() => usePRReport());

    act(() => {
      void result.current.analyze("https://github.com/owner/repo/pull/1");
    });
    const firstSignal: AbortSignal = mockFetchPrMetadata.mock.calls[0][1].signal;

    const secondMetadata = { ...mockPRMetadataSuccess, number: 2 };
    mockFetchPrMetadata.mockResolvedValueOnce(ok(secondMetadata));
    mockFetchPrAnalysis.mockResolvedValueOnce(ok(analysis));
    await act(() => result.current.analyze("https://github.com/owner/repo/pull/2"));

    expect(firstSignal.aborted).toBe(true);
    expect(result.current.report?.metadata.number).toBe(2);

    // The first request finishes late - it must not overwrite the newer report.
    await act(async () => first.resolve(ok({ ...mockPRMetadataSuccess, number: 1 })));
    expect(result.current.report?.metadata.number).toBe(2);
  });

  it("aborts an in-flight request on unmount", async () => {
    const pending = deferred<ApiResult<PRMetadata>>();
    mockFetchPrMetadata.mockReturnValue(pending.promise);
    mockFetchPrAnalysis.mockResolvedValue(ok(analysis));
    const { result, unmount } = renderHook(() => usePRReport());

    act(() => {
      void result.current.analyze(PR_URL);
    });
    const signal: AbortSignal = mockFetchPrMetadata.mock.calls[0][1].signal;
    unmount();

    expect(signal.aborted).toBe(true);
    await act(async () => pending.resolve(ok(mockPRMetadataSuccess)));
  });

  it("keeps a stable analyze function across renders", async () => {
    mockFetchPrMetadata.mockResolvedValue(ok(mockPRMetadataSuccess));
    mockFetchPrAnalysis.mockResolvedValue(ok(analysis));
    const { result } = renderHook(() => usePRReport());
    const firstAnalyze = result.current.analyze;

    await act(() => result.current.analyze(PR_URL));
    await waitFor(() => expect(result.current.report).not.toBeNull());

    expect(result.current.analyze).toBe(firstAnalyze);
  });
});
