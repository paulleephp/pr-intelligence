import type { MessageFn } from "@/types/diff/finding";
import type { DiffHunks } from "@/types/diff/hunk";
import type { Pattern } from "@/types/diff/pattern";
import type { CodeAnalysis, CodePatternFindings, CodeReportArg } from "@/types/pr/metadata";
import {
  AUTH_PATTERNS,
  CRYPTO_ALGO_PATTERNS,
  DANGEROUS_CODE_PATTERNS,
  PASSWORD_HASHING_PATTERNS,
  PROD_CONFIG_CHANGE_PATTERNS,
  UNSAFE_NAVIGATION_PATTERNS,
} from "./change-detection";
import { detectDependencyChanges } from "./dependency";
import { withLine } from "./util/finding-id";
import { findRegexFinding } from "./util/regex-finding";
import { RISK_RULES, type RiskRuleId } from "./util/risk-scoring";

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
  lineNumbers?: readonly number[],
): Pattern | null => {
  for (const [index, line] of addedLines.entries()) {
    const lowerLine = line.toLowerCase();
    const match = patterns.find((pattern) => lineMatches(lowerLine, pattern));

    if (match) {
      const finding: Pattern = {
        ruleId,
        severity: RISK_RULES[ruleId].severity,
        filename,
        message: buildMessage(filename, match),
        evidence: line.trim(),
      };
      return withLine(finding, lineNumbers?.[index]);
    }
  }
  return null;
};

const getNetRemovedLines = (hunks: DiffHunks): string[] => {
  const addedTrimmed = new Set(hunks.added.map((line) => line.trim()));
  return hunks.removed.filter((line) => !addedTrimmed.has(line.trim()));
};

const findAuthCheckChange = (hunks: DiffHunks, filename: string): Pattern | null => {
  const removedAuthCheck = findCodeFinding(
    getNetRemovedLines(hunks),
    filename,
    AUTH_PATTERNS,
    "R002",
    (f, m) => `Authentication/authorization check removed in ${f}: "${m}"`,
  );
  return (
    removedAuthCheck ??
    findCodeFinding(
      hunks.added,
      filename,
      AUTH_PATTERNS,
      "R002",
      (f, m) => `Authentication/authorization logic changed in ${f}: "${m}"`,
      hunks.addedLineNumbers,
    )
  );
};

const getCodePatternFindings = (hunks: DiffHunks, filename: string): CodePatternFindings => {
  const added = hunks.added;
  const authPatterns = findAuthCheckChange(hunks, filename);
  const passwordHashingPatterns = findCodeFinding(
    added,
    filename,
    PASSWORD_HASHING_PATTERNS,
    "R013",
    (f, m) => `Password hashing change detected in ${f}: "${m}"`,
    hunks.addedLineNumbers,
  );
  const cryptoAlgoPatterns = findCodeFinding(
    added,
    filename,
    CRYPTO_ALGO_PATTERNS,
    "R012",
    (f, m) => `Insecure crypto algorithm detected in ${f}: "${m}"`,
    hunks.addedLineNumbers,
  );
  const unsafeNavigation = findRegexFinding(
    added,
    filename,
    UNSAFE_NAVIGATION_PATTERNS,
    "R015",
    (f, m) => `Unsafe navigation: window.location assigned from a dynamic value in ${f}: "${m}"`,
    hunks.addedLineNumbers,
  );
  const dangerousCodeCalls = findRegexFinding(
    added,
    filename,
    DANGEROUS_CODE_PATTERNS,
    "R016",
    (f, m) => `Dangerous code execution or DOM sink introduced in ${f}: "${m}"`,
    hunks.addedLineNumbers,
  );
  return {
    authPatterns,
    passwordHashingPatterns,
    cryptoAlgoPatterns,
    unsafeNavigation,
    dangerousCodeCalls,
  };
};

const NO_CODE_PATTERN_FINDINGS: CodePatternFindings = {
  authPatterns: null,
  passwordHashingPatterns: null,
  cryptoAlgoPatterns: null,
  unsafeNavigation: null,
  dangerousCodeCalls: null,
};

export const getCodeReport = ({
  hunks,
  filename,
  scanCodePatterns = true,
}: CodeReportArg): CodeAnalysis => {
  const codePatternFindings = scanCodePatterns
    ? getCodePatternFindings(hunks, filename)
    : NO_CODE_PATTERN_FINDINGS;
  const prodConfigChanges = findRegexFinding(
    hunks.added,
    filename,
    PROD_CONFIG_CHANGE_PATTERNS,
    "R009",
    (f, m) => `Production configuration change detected in ${f}: "${m}"`,
    hunks.addedLineNumbers,
  );
  const dependencyChanges = detectDependencyChanges(hunks, filename);

  return { filename, ...codePatternFindings, prodConfigChanges, dependencyChanges };
};
