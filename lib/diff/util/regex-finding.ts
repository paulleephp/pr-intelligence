import type { MessageFn } from "@/types/diff/finding";
import type { Pattern } from "@/types/diff/pattern";
import { RISK_RULES, type RiskRuleId } from "./risk-scoring";

export const findRegexFinding = (
  lines: string[],
  filename: string,
  patterns: readonly RegExp[],
  ruleId: RiskRuleId,
  buildMessage: MessageFn,
): Pattern | null => {
  for (const line of lines) {
    const match = patterns.map((pattern) => pattern.exec(line)?.[0]).find(Boolean);
    if (match) {
      return {
        ruleId,
        severity: RISK_RULES[ruleId].severity,
        filename,
        message: buildMessage(filename, match.trim()),
        evidence: line.trim(),
      };
    }
  }
  return null;
};
