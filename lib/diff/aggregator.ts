import type { Pattern } from "../types/diff/pattern";
import type { CategoryAnalysis, PRAnalysis, SecretAnalysis } from "../types/pr/metadata";

export const aggregateData = ({
  secretReports,
  categoryReports,
  codeReports,
}: {
  secretReports: PRAnalysis["secret"];
  categoryReports: PRAnalysis["category"];
  codeReports: PRAnalysis["code"];
}) => {
  // Collect all patterns from secret reports (each field is a Pattern | null)
  const secretPatterns = flattenSecretPatterns(secretReports);

  // Collect all patterns from category reports (array of Patterns)
  const categoryPatterns = flattenCategoryPatterns(categoryReports);

  // Collect all patterns from code reports (ruleId + message only, no severity)
  const codePatterns: { ruleId: string; message: string }[] = [];
  for (const report of codeReports) {
    if (report.authPatterns) codePatterns.push(report.authPatterns);
    if (report.passwordHashingPatterns) codePatterns.push(report.passwordHashingPatterns);
    if (report.cryptoAlgoPatterns) codePatterns.push(report.cryptoAlgoPatterns);
    if (report.prodConfigChanges) codePatterns.push(report.prodConfigChanges);
    if (report.riskyApiCalls) codePatterns.push(report.riskyApiCalls);
  }

  const allPatterns = [...secretPatterns, ...categoryPatterns, ...codePatterns];

  // Count patterns by ID
  const patternCounts: Record<string, number> = {};
  for (const { ruleId } of allPatterns) {
    patternCounts[ruleId] = (patternCounts[ruleId] ?? 0) + 1;
  }
  for (const {ruleId } of categoryPatterns) {
    patternCounts[ruleId] = (patternCounts[ruleId] ?? 0) + 1;
  }
  for (const { ruleId } of codePatterns) {
    patternCounts[ruleId] = (patternCounts[ruleId] ?? 0) + 1;
  }

  // Count severity levels from secret and category reports only
  const severityCounts: Record<"low" | "medium" | "high" | "critical", number> = {
    low: 0,
    medium: 0,
    high: 0,
    critical: 0,
  };

  for (const p of secretPatterns) {
    severityCounts[p.severity]++;
  }
  for (const p of categoryPatterns) {
    severityCounts[p.severity]++;
  }

  // Total patterns
  const totalPatterns = Object.values(patternCounts).reduce((sum, count) => sum + count, 0);

  return {
    patternCounts,
    totalPatterns,
    severityCounts,
  };
};

// Helper: flatten secret reports (each field is a Pattern | null) into array of Patterns
function flattenSecretPatterns(reports: SecretAnalysis[]): Pattern[] {
  const patterns: Pattern[] = [];
  for (const report of reports) {
    if (report.secret) patterns.push(report.secret);
    if (report.apiKey) patterns.push(report.apiKey);
    if (report.password) patterns.push(report.password);
    if (report.ssh) patterns.push(report.ssh);
  }
  return patterns;
}

// Helper: flatten category reports (array of Patterns) into array of Patterns
function flattenCategoryPatterns(reports: CategoryAnalysis[]): Pattern[] {
  const patterns: Pattern[] = [];
  for (const report of reports) {
    patterns.push(...report.category);
  }
  return patterns;
}
