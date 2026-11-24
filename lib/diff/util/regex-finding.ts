import type { MessageFn } from "@/types/diff/finding";
import type { Pattern } from "@/types/diff/pattern";
import { withLine } from "./finding-id";
import { RISK_RULES, type RiskRuleId } from "./risk-scoring";

export const findRegexFinding = (
  lines: string[],
  filename: string,
  patterns: readonly RegExp[],
  ruleId: RiskRuleId,
  buildMessage: MessageFn,
  lineNumbers?: readonly number[],
): Pattern | null => {
  for (const [index, line] of lines.entries()) {
    const match = patterns.map((pattern) => pattern.exec(line)?.[0]).find(Boolean);
    if (match) {
      const finding: Pattern = {
        ruleId,
        severity: RISK_RULES[ruleId].severity,
        filename,
        message: buildMessage(filename, match.trim()),
        evidence: line.trim(),
      };
      return withLine(finding, lineNumbers?.[index]);
    }
  }
  return null;
};
