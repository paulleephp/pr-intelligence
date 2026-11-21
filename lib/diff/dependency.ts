import type { DependencyChanges } from "@/types/diff/dependency";
import type { DiffHunks } from "@/types/diff/hunk";
import type { Pattern } from "@/types/diff/pattern";
import { DEPENDENCY_LINE_PATTERNS, IGNORED_DEPENDENCY_KEYS } from "./constants/dependency";
import { RISK_RULES } from "./util/risk-scoring";

const DEPENDENCY_RULE_ID = "R005";
const TRAILING_COMMA = /,\s*$/;

const normalizeLine = (line: string): string => line.trim().replace(TRAILING_COMMA, "");

const extractDependencyName = (line: string): string | null => {
  for (const pattern of DEPENDENCY_LINE_PATTERNS) {
    const name = pattern.exec(line)?.[1];
    if (name && !IGNORED_DEPENDENCY_KEYS.includes(name.toLowerCase())) {
      return name;
    }
  }
  return null;
};

const collectDependencies = (lines: string[], unchanged: Set<string>): Map<string, string> => {
  const found = new Map<string, string>();
  for (const line of lines) {
    if (unchanged.has(normalizeLine(line))) {
      continue;
    }
    const name = extractDependencyName(line);
    if (name && !found.has(name)) {
      found.set(name, line.trim());
    }
  }
  return found;
};

export const classifyDependencyChanges = (hunks: DiffHunks): DependencyChanges => {
  const addedLines = new Set(hunks.added.map(normalizeLine));
  const removedLines = new Set(hunks.removed.map(normalizeLine));
  const unchanged = new Set([...addedLines].filter((line) => removedLines.has(line)));

  const addedDeps = collectDependencies(hunks.added, unchanged);
  const removedDeps = collectDependencies(hunks.removed, unchanged);

  const upgraded = [...addedDeps.keys()].filter((name) => removedDeps.has(name));
  const added = [...addedDeps.keys()].filter((name) => !removedDeps.has(name));
  const removed = [...removedDeps.keys()].filter((name) => !addedDeps.has(name));
  const evidence = addedDeps.values().next().value ?? removedDeps.values().next().value ?? null;

  return { added, removed, upgraded, evidence };
};

const describeChanges = ({ added, removed, upgraded }: DependencyChanges): string => {
  const parts = [
    added.length ? `added ${added.join(", ")}` : null,
    removed.length ? `removed ${removed.join(", ")}` : null,
    upgraded.length ? `upgraded ${upgraded.join(", ")}` : null,
  ];
  return parts.filter(Boolean).join("; ");
};

export const detectDependencyChanges = (hunks: DiffHunks, filename: string): Pattern | null => {
  const changes = classifyDependencyChanges(hunks);
  const total = changes.added.length + changes.removed.length + changes.upgraded.length;
  if (total === 0) {
    return null;
  }

  const summary = describeChanges(changes);

  return {
    ruleId: DEPENDENCY_RULE_ID,
    severity: RISK_RULES[DEPENDENCY_RULE_ID].severity,
    filename,
    message: `Dependency changes in ${filename}: ${summary}`,
    evidence: changes.evidence ?? undefined,
  };
};
