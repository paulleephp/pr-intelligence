import { ERROR_MESSAGES } from "@/lib/constants";
import { getPRMetadata } from "@/lib/github/pr-metadata/get";
import { badRequestResponse, methodNotAllowedResponse, successResponse } from "@/lib/response";
import type { ErrorResponse, ServerResponse } from "@/lib/types/pr/metadata";
import { parsePRUrl } from "@/lib/url";
import type { PRMetadata } from "@/types/pr/metdata";
import type { RequestLike } from "@/types/request";
import { checkForErrors } from "../_lib/github/response";
import { getBody } from "../_lib/request";

export async function GET(request: RequestLike) {
  const body = getBody(request);

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
  const result: ServerResponse<PRMetadata> = await getPRMetadata(owner, repo, prNumber);

  checkForErrors(result);

  return successResponse(result);
}

export async function POST() {
  return methodNotAllowedResponse(ERROR_MESSAGES.GET_EXPECTED);
}
