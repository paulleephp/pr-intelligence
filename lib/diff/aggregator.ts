import type { Pattern, PatternSeverity } from "../types/diff/pattern";
import type {
  CategoryAnalysis,
  CodeAnalysis,
  PRAggregate,
  PRAnalysis,
  RuleCount,
  SecretAnalysis,
  SeverityCounts,
} from "../types/pr/metadata";
import { RISK_RULES, SEVERITY_RANK } from "./util/risk-scoring";

interface AggregateArgs {
  secretReports: PRAnalysis["secret"];
  categoryReports: PRAnalysis["category"];
  codeReports: PRAnalysis["code"];
}

const emptySeverityCounts = (): SeverityCounts => ({ low: 0, medium: 0, high: 0, critical: 0 });

const isPattern = (p: Pattern | null): p is Pattern => p !== null;

const higherSeverity = (a: PatternSeverity | null, b: PatternSeverity): PatternSeverity =>
  a && SEVERITY_RANK[a] >= SEVERITY_RANK[b] ? a : b;

const flattenSecretPatterns = (reports: SecretAnalysis[]): Pattern[] =>
  reports.flatMap((r) => [r.secret, r.apiKey, r.password, r.ssh].filter(isPattern));

const flattenCategoryPatterns = (reports: CategoryAnalysis[]): Pattern[] =>
  reports.flatMap((r) => r.category);

const flattenCodePatterns = (reports: CodeAnalysis[]): Pattern[] =>
  reports.flatMap((r) =>
    [
      r.authPatterns,
      r.passwordHashingPatterns,
      r.cryptoAlgoPatterns,
      r.prodConfigChanges,
      r.riskyApiCalls,
      r.dangerousCodeCalls,
      r.dependencyChanges,
    ].filter(isPattern),
  );

const countRules = (findings: Pattern[]): RuleCount[] => {
  const counts = new Map<string, RuleCount>();
  for (const { ruleId, severity } of findings) {
    const existing = counts.get(ruleId);
    if (existing) {
      existing.count++;
      continue;
    }
    const rule = RISK_RULES[ruleId as keyof typeof RISK_RULES];
    const condition = rule?.condition ?? ruleId;
    counts.set(ruleId, { ruleId, condition, severity, count: 1 });
  }
  return [...counts.values()].sort(
    (a, b) => SEVERITY_RANK[b.severity] - SEVERITY_RANK[a.severity] || b.count - a.count,
  );
};

export const aggregateData = ({
  secretReports,
  categoryReports,
  codeReports,
}: AggregateArgs): PRAggregate => {
  const secretPatterns = flattenSecretPatterns(secretReports);
  const categoryPatterns = flattenCategoryPatterns(categoryReports);
  const codePatterns = flattenCodePatterns(codeReports);
  const findings = [...secretPatterns, ...categoryPatterns, ...codePatterns];

  const severityCounts = emptySeverityCounts();
  const fileSeverity: Record<string, PatternSeverity> = {};
  let overallSeverity: PatternSeverity | null = null;

  for (const { severity, filename } of findings) {
    severityCounts[severity]++;
    fileSeverity[filename] = higherSeverity(fileSeverity[filename] ?? null, severity);
    overallSeverity = higherSeverity(overallSeverity, severity);
  }

  const fileSeverityCounts = emptySeverityCounts();
  for (const severity of Object.values(fileSeverity)) {
    fileSeverityCounts[severity]++;
  }

  const ruleCounts = countRules(findings);
  const totalFindings = findings.length;

  return {
    findings,
    totalFindings,
    severityCounts,
    ruleCounts,
    fileSeverity,
    fileSeverityCounts,
    overallSeverity,
  };
};
