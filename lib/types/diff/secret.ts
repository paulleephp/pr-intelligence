import type { DiffHunks } from "./hunk";
import type { Pattern } from "./pattern";

type Arg = { filename: string; pattern: string };
export type GetHandlerFn = ({ filename, pattern }: Arg) => Pattern;

export type SecretScanType = "secret" | "apiKey" | "password" | "ssh";

export type KeywordScanType = Exclude<SecretScanType, "secret">;

export type DetectRiskyPatternsArg = {
  hunks: DiffHunks;
  filename: string;
  type: SecretScanType;
  claimedLines?: Set<number>;
};

export interface SecretLineContext {
  rawLine: string;
  type: SecretScanType;
  fileKind: SecretFileKind;
}

export type SecretScanKind = "name" | "value";

export type SecretFileKind = "code" | "config" | "shell";

export interface SecretScan {
  name: string;
  kind: SecretScanKind;
  regex: RegExp;
  fileKind?: SecretFileKind;
}

export type GetSecretReportArg = {
  hunks: DiffHunks;
  filename: string;
};
