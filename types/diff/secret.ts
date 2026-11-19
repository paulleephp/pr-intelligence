import type { DiffHunks } from "./hunk";
import type { Pattern } from "./pattern";

type Arg = { filename: string; pattern: string };
export type GetHandlerFn = ({ filename, pattern }: Arg) => Pattern;

export type DetectRiskyPatternsArg = {
  hunks: DiffHunks;
  filename: string;
  type: string;
};

export interface SecretScan {
  name: string;
  regex: RegExp;
}

export type GetSecretReportArg = {
  hunks: DiffHunks; 
  filename: string;
}
