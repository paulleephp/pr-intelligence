/**
 * Request-like interface for test-friendly API handlers
 * Only requires methods that are actually used in handlers
 */
export interface RequestLike {
  json(): Promise<unknown>;
}
