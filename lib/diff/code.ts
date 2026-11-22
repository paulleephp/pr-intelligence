import type { DiffHunks } from "@/types/diff/hunk";
import type { Pattern } from "@/types/diff/pattern";
import type { CodeAnalysis } from "../types/pr/metadata";
import {
  AUTH_PATTERNS,
  CRYPTO_ALGO_PATTERNS,
  DANGEROUS_CODE_PATTERNS,
  PASSWORD_HASHING_PATTERNS,
  PROD_CONFIG_CHANGE_PATTERNS,
  RISKY_API_PATTERNS,
} from "./change-detection";
import { detectDependencyChanges } from "./dependency";
import { findRegexFinding } from "./util/regex-finding";
import { RISK_RULES, type RiskRuleId } from "./util/risk-scoring";

import type { MessageFn } from "@/types/diff/finding";

const WORD_PATTERN = /^\w+$/;

const lineMatches = (lowerLine: string, pattern: string): boolean => {
  const lowerPattern = pattern.toLowerCase();
  if (WORD_PATTERN.test(lowerPattern)) {
    return new RegExp(`\\b${lowerPattern}\\b`).test(lowerLine);
  }
  return lowerLine.includes(lowerPattern);
};

const findCodeFinding = (
  addedLines: string[],
  filename: string,
  patterns: readonly string[],
  ruleId: RiskRuleId,
  buildMessage: MessageFn,
): Pattern | null => {
  for (const line of addedLines) {
    const lowerLine = line.toLowerCase();
    const match = patterns.find((pattern) => lineMatches(lowerLine, pattern));

    if (match) {
      return {
        ruleId,
        severity: RISK_RULES[ruleId].severity,
        filename,
        message: buildMessage(filename, match),
        evidence: line.trim(),
      };
    }
  }
  return null;
};

const getNetRemovedLines = (hunks: DiffHunks): string[] => {
  const addedTrimmed = new Set(hunks.added.map((line) => line.trim()));
  return hunks.removed.filter((line) => !addedTrimmed.has(line.trim()));
};

export const getCodeReport = ({
  hunks,
  filename,
}: {
  hunks: DiffHunks;
  status: string;
  filename: string;
}): CodeAnalysis => {
  const added = hunks.added;

  const netRemoved = getNetRemovedLines(hunks);
  const removedAuthCheck = findCodeFinding(
    netRemoved,
    filename,
    AUTH_PATTERNS,
    "R002",
    (f, m) => `Authentication/authorization check removed in ${f}: "${m}"`,
  );
  const changedAuthCheck = findCodeFinding(
    added,
    filename,
    AUTH_PATTERNS,
    "R002",
    (f, m) => `Authentication/authorization logic changed in ${f}: "${m}"`,
  );
  const authPatterns = removedAuthCheck ?? changedAuthCheck;
  const passwordHashingPatterns = findCodeFinding(
    added,
    filename,
    PASSWORD_HASHING_PATTERNS,
    "R013",
    (f, m) => `Password hashing change detected in ${f}: "${m}"`,
  );
  const cryptoAlgoPatterns = findCodeFinding(
    added,
    filename,
    CRYPTO_ALGO_PATTERNS,
    "R012",
    (f, m) => `Insecure crypto algorithm detected in ${f}: "${m}"`,
  );
  const prodConfigChanges = findCodeFinding(
    added,
    filename,
    PROD_CONFIG_CHANGE_PATTERNS,
    "R009",
    (f, m) => `Production configuration change detected in ${f}: "${m}"`,
  );
  const riskyApiCalls = findRegexFinding(
    added,
    filename,
    RISKY_API_PATTERNS,
    "R015",
    (f, m) => `Potentially risky API call detected in ${f}: "${m}"`,
  );
  const dangerousCodeCalls = findRegexFinding(
    added,
    filename,
    DANGEROUS_CODE_PATTERNS,
    "R016",
    (f, m) => `Dangerous code execution or DOM sink introduced in ${f}: "${m}"`,
  );

  const dependencyChanges = detectDependencyChanges(hunks, filename);

  return {
    filename,
    authPatterns,
    passwordHashingPatterns,
    cryptoAlgoPatterns,
    prodConfigChanges,
    riskyApiCalls,
    dangerousCodeCalls,
    dependencyChanges,
  };
};
