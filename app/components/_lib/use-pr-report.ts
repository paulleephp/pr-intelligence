import { useCallback, useState } from "react";
import { fetchPrAnalysis, fetchPrMetadata } from "@/lib/api";
import type { PRReportState } from "@/types/ui/report";

const FALLBACK_ERROR = "Failed to analyze PR. Please check the GitHub URL.";

const INITIAL_STATE: PRReportState = { report: null, loading: false, error: null };

export function usePRReport() {
  const [state, setState] = useState<PRReportState>(INITIAL_STATE);

  const analyze = useCallback(async (url: string) => {
    setState({ report: null, loading: true, error: null });

    const [metadataResult, analysisResult] = await Promise.all([
      fetchPrMetadata(url),
      fetchPrAnalysis(url),
    ]);

    if (!metadataResult.data || !analysisResult.data) {
      const error = metadataResult.error ?? analysisResult.error ?? FALLBACK_ERROR;
      setState({ report: null, loading: false, error });
      return;
    }

    const report = { metadata: metadataResult.data, analysis: analysisResult.data };
    setState({ report, loading: false, error: null });
  }, []);

  return { ...state, analyze };
}
