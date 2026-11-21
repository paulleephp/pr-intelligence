import type { NextResponse } from "next/server";
import { HTTP_STATUS } from "@/lib/constants";
import {
  notFoundResponse,
  rateLimitResponse,
  serverErrorResponse,
  successResponse,
} from "@/lib/response";
import type { ServerResponse } from "@/lib/types/pr/metadata";

export const toRouteResponse = <T extends object>(result: ServerResponse<T>): NextResponse => {
  if (!("error" in result)) {
    return successResponse(result);
  }
  if (result.status === HTTP_STATUS.NOT_FOUND) {
    return notFoundResponse(result.error);
  }
  if (result.status === HTTP_STATUS.TOO_MANY_REQUESTS) {
    return rateLimitResponse(result.error);
  }
  return serverErrorResponse(result.error);
};
