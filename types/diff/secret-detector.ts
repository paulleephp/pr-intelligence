import type { PRFilesDiff } from "../github";
import type { Finding } from "./findings";

type Arg = {file: string, pattern: string}
export type GetHandlerFn = ({file, pattern}: Arg) => Finding;

export type getFindingsArg = {
  diff: PRFilesDiff;
  file: string;
  type: string;
};