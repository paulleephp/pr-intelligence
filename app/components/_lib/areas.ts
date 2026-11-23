import type { PRAnalysisResponse } from "@/lib/types/pr/metadata";
import type { AffectedArea, AffectedAreaFile, AffectedAreaGroup } from "@/types/ui/report";
import { severityRank } from "./severity";

export const AREA_BY_RULE: Readonly<Record<string, AffectedArea>> = {
  R001: "auth",
  R002: "auth",
  R003: "database",
  R004: "database",
  R006: "cicd",
  R007: "security",
  R009: "configuration",
  R010: "tests",
  R011: "infrastructure",
  R012: "security",
  R013: "security",
  R014: "security",
  R015: "security",
  R016: "security",
};

export const AREA_ORDER: readonly AffectedArea[] = [
  "auth",
  "database",
  "cicd",
  "configuration",
  "tests",
  "infrastructure",
  "security",
];

export const AREA_LABELS: Record<AffectedArea, string> = {
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
  const { findings, fileSeverity } = analysis.aggregate;
  const statusByFile = new Map(changedFiles.map((file) => [file.filename, file.status]));
  const filesByArea = new Map<AffectedArea, Set<string>>();

  for (const { ruleId, filename } of findings) {
    const area = AREA_BY_RULE[ruleId];
    if (!area) continue;
    const files = filesByArea.get(area) ?? new Set<string>();
    files.add(filename);
    filesByArea.set(area, files);
  }

  const activeAreas = AREA_ORDER.filter((area) => filesByArea.has(area));
  return activeAreas.map((area) => {
    const filenames = [...(filesByArea.get(area) ?? [])];
    const files: AffectedAreaFile[] = filenames.map((filename) => ({
      filename,
      status: statusByFile.get(filename) ?? "",
      severity: fileSeverity[filename] ?? "none",
    }));
    const sortedFiles = files.sort(byRiskThenName);
    return { area, label: AREA_LABELS[area], files: sortedFiles };
  });
};
