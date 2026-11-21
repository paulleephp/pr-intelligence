import { ERROR_MESSAGES } from "@/lib/constants";
import { serverErrorResponse } from "@/lib/response";
import type { RequestLike } from "@/lib/types/request";

export const getBody = async (request: RequestLike) => {
  let body: unknown;
  try {
    body = await request.json();
  } catch (error) {
    console.error("Request parsing error:", error);
    return serverErrorResponse(ERROR_MESSAGES.INTERNAL_ERROR);
  }
  return body;
};
