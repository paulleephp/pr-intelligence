import { NextRequest } from "next/server";

const TEST_ORIGIN = "http://localhost:3000";

export function createMockRequest(path: string, prUrl?: string): NextRequest {
  const requestUrl = new URL(path, TEST_ORIGIN);
  if (prUrl !== undefined) {
    requestUrl.searchParams.set("url", prUrl);
  }
  return new NextRequest(requestUrl);
}
