import { NextResponse } from "next/server";
import { HTTP_STATUS } from "./constants";

export function successResponse<T>(data: T, status: number = HTTP_STATUS.OK) {
  return NextResponse.json(data, { status });
}

export function errorResponse(
  message: string,
  status: number = HTTP_STATUS.INTERNAL_SERVER_ERROR,
) {
  return NextResponse.json({ error: message }, { status });
}

export function badRequestResponse(message: string) {
  return errorResponse(message, HTTP_STATUS.BAD_REQUEST);
}

export function notFoundResponse(message: string) {
  return errorResponse(message, HTTP_STATUS.NOT_FOUND);
}

export function methodNotAllowedResponse(message: string) {
  return errorResponse(message, HTTP_STATUS.METHOD_NOT_ALLOWED);
}

export function rateLimitResponse(message: string) {
  return errorResponse(message, HTTP_STATUS.TOO_MANY_REQUESTS);
}

export function serverErrorResponse(message: string) {
  return errorResponse(message, HTTP_STATUS.INTERNAL_SERVER_ERROR);
}
