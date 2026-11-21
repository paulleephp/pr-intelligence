import type { API_ENDPOINTS } from "@/lib/api-constants";

export type ApiEndpoint = (typeof API_ENDPOINTS)[keyof typeof API_ENDPOINTS];

export interface ApiResult<T> {
  data: T | null;
  error: string | null;
  ok: boolean;
}

export type ResponseGuard<T> = (value: unknown) => value is T;

export interface ApiRequestOptions {
  signal?: AbortSignal;
}
