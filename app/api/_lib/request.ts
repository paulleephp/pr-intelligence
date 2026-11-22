import type { NextRequest, NextResponse } from "next/server";
import { ERROR_MESSAGES } from "@/lib/constants";
import { badRequestResponse } from "@/lib/response";
import { type ParsedPRUrl, parsePRUrl } from "@/lib/url";

export const PR_URL_QUERY_PARAM = "url";

export const getPRUrlParam = (request: NextRequest): ParsedPRUrl | NextResponse => {
  const url = request.nextUrl.searchParams.get(PR_URL_QUERY_PARAM)?.trim();

  if (!url) {
    return badRequestResponse(ERROR_MESSAGES.NO_PR_URL);
  }

  const parsed = parsePRUrl(url);
  if (!parsed) {
    return badRequestResponse(ERROR_MESSAGES.INVALID_PR_URL);
  }

  return parsed;
};
