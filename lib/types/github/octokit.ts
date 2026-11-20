export interface GenericResponse<T> {
  data: T;
}

export interface PRFetchError {
  status: number;
  error: string;
}

export interface PRMetadataResponse {
  prMetadata: unknown;
  changedFiles: unknown[];
}

