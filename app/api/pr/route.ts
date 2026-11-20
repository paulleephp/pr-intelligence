"use dynamic();";

import { ERROR_MESSAGES } from "@/lib/constants";
import { getPRMetadata } from "@/lib/server/github/pr-metadata/get";
import { 
  badRequestResponse, 
  methodNotAllowedResponse, 
  notFoundResponse, 
  rateLimitResponse, 
  serverErrorResponse, 
  successResponse 
} from "@/lib/server/response";
import { parsePRUrl } from "@/lib/server/url";

import type { RequestLike } from "@/types/request";

export async function POST(request: RequestLike) {
  let body: unknown;
  try {
    body = await request.json();
  } catch (error) {
    console.error("Request parsing error:", error);
    return serverErrorResponse(ERROR_MESSAGES.INTERNAL_ERROR);
  }

  if (typeof body !== "object" || body === null || !("url" in body)) {
    return badRequestResponse(ERROR_MESSAGES.NO_PR_URL);
  }
  if (typeof body.url !== "string") {
    return badRequestResponse(ERROR_MESSAGES.INVALID_PR_URL);
  }
  const url = body.url.trim();
  if (!url) {
    return badRequestResponse(ERROR_MESSAGES.NO_PR_URL);
  }

  const parsed = parsePRUrl(url);
  if (!parsed) {
    return badRequestResponse(ERROR_MESSAGES.INVALID_PR_URL);
  }

  const { owner, repo, prNumber } = parsed;
  const result = await getPRMetadata(owner, repo, prNumber);

  if ("error" in result) {
    if (result.status === 404) {
      return notFoundResponse(result.error);
    }
    if (result.status === 429) {
      return rateLimitResponse(result.error);
    }
    return serverErrorResponse(result.error);
  }

  return successResponse(result.data);
}

export async function GET() {
  return methodNotAllowedResponse(ERROR_MESSAGES.POST_EXPECTED);
}
