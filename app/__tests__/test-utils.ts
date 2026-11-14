import { RequestLike } from "@/types/request";

/**
 * Creates a type-safe mock request for testing
 * Implements RequestLike interface - no type casting needed
 */
export function createMockRequest(body: unknown): RequestLike {
  return {
    json: async () => body,
  };
}
