"use dynamic();"

import { NextRequest } from "next/server";
import { parsePRUrl } from "@/lib/url";
import { analyzePR } from "@/lib/github";
import {
  badRequestResponse,
  notFoundResponse,
  rateLimitResponse,
  serverErrorResponse,
  methodNotAllowedResponse,
  successResponse,
} from "@/lib/response";
import { ERROR_MESSAGES } from "@/lib/constants";

export async function POST(request: NextRequest) {
  let body;
  try {
    body = await request.json();
  } catch (error) {
    console.error("Request parsing error:", error);
    return serverErrorResponse(ERROR_MESSAGES.INTERNAL_ERROR);
  }

  const url = body.url?.trim() || "";
  if (!url) {
    return badRequestResponse(ERROR_MESSAGES.NO_PR_URL);
  }

  const parsed = parsePRUrl(url);
  if (!parsed) {
    return badRequestResponse(ERROR_MESSAGES.INVALID_PR_URL);
  }

  const { owner, repo, prNumber } = parsed;
  const result = await analyzePR(owner, repo, prNumber);

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
