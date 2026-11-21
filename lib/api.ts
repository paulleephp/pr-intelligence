import type { PRMetadata } from "@/types/pr/metdata";
import type { PRAnalysisResponse } from "./types/pr/metadata";

export async function fetchPrData<T>(
  endpoint: string,
  url: string,
): Promise<{ data: T | null; error: string | null; ok: boolean }> {
  try {
    const query = new URLSearchParams({ url });
    const response = await fetch(`${endpoint}?${query}`);

    const data = (await response.json()) as T & { error?: string };

    if (!response.ok) {
      const errorMessage =
        typeof data.error === "string" ? data.error : `Failed to fetch from ${endpoint}`;
      return { data: null, error: errorMessage, ok: false };
    }

    return { data, error: null, ok: true };
  } catch (err) {
    console.error(`Failed to fetch ${endpoint}:`, err);
    const errorMessage = err instanceof Error ? err.message : "Unknown error";
    return { data: null, error: errorMessage, ok: false };
  }
}

/**
 * Fetch PR metadata and analysis
 */
export async function fetchPrMetadata(
  url: string,
): Promise<{ data: PRMetadata | null; error: string | null; ok: boolean }> {
  return fetchPrData<PRMetadata>("/api/pr", url);
}

export async function fetchPrAnalysis(
  url: string,
): Promise<{ data: PRAnalysisResponse | null; error: string | null; ok: boolean }> {
  return fetchPrData<PRAnalysisResponse>("/api/pr/analysis", url);
}
