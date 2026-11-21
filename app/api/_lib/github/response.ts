import { notFoundResponse, rateLimitResponse, serverErrorResponse } from "@/lib/response";
import type { PRAnalysisResponse, ServerResponse } from "@/lib/types/pr/metadata";
import type { PRMetadata } from "@/types/pr/metdata";

export const checkForErrors = (result: ServerResponse<PRMetadata> | ServerResponse<PRAnalysisResponse>) => {
  if ("error" in result) {
    if (result.status === 404) {
      return notFoundResponse(result.error);
    }
    if (result.status === 429) {
      return rateLimitResponse(result.error);
    }
    return serverErrorResponse(result.error);
  }
};
