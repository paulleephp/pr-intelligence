import type { Pattern } from "@/types/diff/pattern";
import type { ChangedFile } from "@/types/pr/metadata";
import { PRFileStatus } from "./constants/file";
import { RUNNABLE_EXTENSIONS, RUNNABLE_FOLDER_PATTERN } from "./constants/mode-change";
import { extension, hasNoContentChange } from "./util/changed-file";
import { RISK_RULES } from "./util/risk-scoring";

const RULE_ID = "R018";

const isRunnable = (filename: string): boolean =>
  RUNNABLE_EXTENSIONS.has(extension(filename)) || RUNNABLE_FOLDER_PATTERN.test(filename);

export const detectPermissionChange = (file: ChangedFile): Pattern | null => {
  const { filename, status } = file;
  const isCandidate =
    status === PRFileStatus.Modified && hasNoContentChange(file) && isRunnable(filename);
  if (!isCandidate) return null;
  return {
    ruleId: RULE_ID,
    severity: RISK_RULES[RULE_ID].severity,
    filename,
    message: `"${filename}" changed with no content change: likely a permission change (e.g. "chmod +x")`,
  };
};
