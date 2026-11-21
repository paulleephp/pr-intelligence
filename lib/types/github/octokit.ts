import type { ChangedFile } from "@/types/pr/metadata";
import type { PRMetadata } from "@/types/pr/metdata";
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


export interface PRAnalyzeData {
  prMetadata: PRMetadata;
  changedFiles: ChangedFile[];
}

export interface OctokitErrorShape {
  response?: { status?: number };
  message?: string;
}

export type AnalyzePRResult = GenericResponse<PRAnalyzeData> | PRFetchError;
