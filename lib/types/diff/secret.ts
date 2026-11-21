import type { DiffHunks } from "./hunk";
import type { Pattern } from "./pattern";

type Arg = { filename: string; pattern: string };
export type GetHandlerFn = ({ filename, pattern }: Arg) => Pattern;

export type SecretScanType = "secret" | "apiKey" | "password" | "ssh";

export type DetectRiskyPatternsArg = {
  hunks: DiffHunks;
  filename: string;
  type: SecretScanType;
  claimedLines?: Set<number>;
};

export interface SecretScan {
  name: string;
  regex: RegExp;
}

export type GetSecretReportArg = {
  hunks: DiffHunks; 
  filename: string;
}
