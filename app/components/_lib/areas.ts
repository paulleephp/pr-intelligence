import type { RISK_RULES } from "@/lib/diff/util/risk-scoring";
import type { PatternSeverity } from "@/lib/types/diff/pattern";
import type { PRAnalysisResponse } from "@/lib/types/pr/metadata";
import type { AffectedArea, AffectedAreaFile, AffectedAreaGroup } from "@/types/ui/report";
import { UNKNOWN_STATUS } from "./file-display";
import { severityRank } from "./severity";

export const AREA_BY_RULE: Readonly<Record<string, AffectedArea>> = {
  R001: "auth",
  R003: "database",
  R004: "database",
  R006: "cicd",
  R009: "configuration",
  R010: "tests",
  R011: "infrastructure",
  R014: "security",
} satisfies Partial<Record<keyof typeof RISK_RULES, AffectedArea>>;

export const AREA_ORDER: readonly AffectedArea[] = [
  "auth",
  "database",
  "cicd",
  "configuration",
  "tests",
  "infrastructure",
  "security",
];

export const AREA_LABELS: Readonly<Record<AffectedArea, string>> = {
  auth: "Auth",
  database: "Database",
  cicd: "CI/CD",
  configuration: "Configuration",
  tests: "Tests",
  infrastructure: "Infrastructure",
  security: "Security",
};

const byRiskThenName = (a: AffectedAreaFile, b: AffectedAreaFile): number =>
  severityRank(a.severity) - severityRank(b.severity) || a.filename.localeCompare(b.filename);

export const buildAffectedAreas = ({
  changedFiles,
  analysis,
}: PRAnalysisResponse): AffectedAreaGroup[] => {
  const statusByFile = new Map(changedFiles.map((file) => [file.filename, file.status]));
  const severityByArea = new Map<AffectedArea, Map<string, PatternSeverity>>();

  for (const { ruleId, filename, severity } of analysis.aggregate.findings) {
    const area = AREA_BY_RULE[ruleId];
    if (!area) continue;
    const files = severityByArea.get(area) ?? new Map<string, PatternSeverity>();
    const current = files.get(filename);
    const isHigher = !current || severityRank(severity) < severityRank(current);
    if (isHigher) files.set(filename, severity);
    severityByArea.set(area, files);
  }

  const activeAreas = AREA_ORDER.filter((area) => severityByArea.has(area));
  return activeAreas.map((area) => {
    const entries = [...(severityByArea.get(area) ?? [])];
    const files: AffectedAreaFile[] = entries.map(([filename, severity]) => ({
      filename,
      status: statusByFile.get(filename) ?? UNKNOWN_STATUS,
      severity,
    }));
    const sortedFiles = files.sort(byRiskThenName);
    return { area, label: AREA_LABELS[area], files: sortedFiles };
  });
};
