import type { NextRequest } from "next/server";
import { ERROR_MESSAGES } from "@/lib/constants";
import { getPRMetadata } from "@/lib/github/pr-metadata/get";
import { methodNotAllowedResponse } from "@/lib/response";
import { toRouteResponse } from "../_lib/github/response";
import { getPRUrlParam } from "../_lib/request";

export async function GET(request: NextRequest) {
  const parsed = getPRUrlParam(request);
  if (parsed instanceof Response) {
    return parsed;
  }

  const { owner, repo, prNumber } = parsed;
  const result = await getPRMetadata(owner, repo, prNumber);

  return toRouteResponse(result);
}

export async function POST() {
  return methodNotAllowedResponse(ERROR_MESSAGES.GET_EXPECTED);
}
