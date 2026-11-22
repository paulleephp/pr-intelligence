import type { PRAnalysisResponse } from "@/lib/types/pr/metadata";
import type { PRMetadata } from "@/types/pr/metdata";
import type { ApiEndpoint, ApiRequestOptions, ApiResult, ResponseGuard } from "@/types/ui/api";
import {
  API_ENDPOINTS,
  API_ERROR_MESSAGES,
  API_TIMEOUT_MS,
  JSON_CONTENT_TYPE,
} from "./api-constants";
import { isPRAnalysisResponse, isPRMetadata, readErrorMessage } from "./api-guards";

const failure = <T>(error: string): ApiResult<T> => ({ data: null, error, ok: false });

const buildSignal = (callerSignal?: AbortSignal): AbortSignal => {
  const timeoutSignal = AbortSignal.timeout(API_TIMEOUT_MS);
  return callerSignal ? AbortSignal.any([callerSignal, timeoutSignal]) : timeoutSignal;
};

const toRequestError = (err: unknown): string => {
  if (err instanceof DOMException && err.name === "TimeoutError") return API_ERROR_MESSAGES.TIMEOUT;
  if (err instanceof DOMException && err.name === "AbortError") return API_ERROR_MESSAGES.ABORTED;
  if (err instanceof TypeError) return API_ERROR_MESSAGES.NETWORK;
  return API_ERROR_MESSAGES.UNKNOWN;
};

const readJson = async (response: Response): Promise<unknown> => {
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes(JSON_CONTENT_TYPE)) return undefined;
  return response.json();
};

export async function fetchPrData<T>(
  endpoint: ApiEndpoint,
  url: string,
  isValid: ResponseGuard<T>,
  { signal }: ApiRequestOptions = {},
): Promise<ApiResult<T>> {
  const query = new URLSearchParams({ url });
  const requestUrl = `${endpoint}?${query}`;
  const requestInit: RequestInit = {
    method: "GET",
    headers: { Accept: JSON_CONTENT_TYPE },
    credentials: "same-origin",
    signal: buildSignal(signal),
  };

  let response: Response;
  let body: unknown;
  try {
    response = await fetch(requestUrl, requestInit);
    body = await readJson(response);
  } catch (err) {
    console.error(`Request to ${endpoint} failed:`, err);
    return failure(toRequestError(err));
  }

  if (!response.ok) return failure(readErrorMessage(body) ?? API_ERROR_MESSAGES.UNKNOWN);
  if (body === undefined) return failure(API_ERROR_MESSAGES.NON_JSON);
  if (!isValid(body)) {
    console.error(`Unexpected response shape from ${endpoint}`);
    return failure(API_ERROR_MESSAGES.INVALID_SHAPE);
  }
  return { data: body, error: null, ok: true };
}

export function fetchPrMetadata(
  url: string,
  options?: ApiRequestOptions,
): Promise<ApiResult<PRMetadata>> {
  return fetchPrData(API_ENDPOINTS.PR_METADATA, url, isPRMetadata, options);
}

export function fetchPrAnalysis(
  url: string,
  options?: ApiRequestOptions,
): Promise<ApiResult<PRAnalysisResponse>> {
  return fetchPrData(API_ENDPOINTS.PR_ANALYSIS, url, isPRAnalysisResponse, options);
}
