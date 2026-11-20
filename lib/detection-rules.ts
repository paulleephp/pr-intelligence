import type { FileCategory } from "@/types/diff/file";
import type { FindingSeverity } from "@/types/diff/rule";
import { RULES } from "./diff/constants/high-risk-patterns";
import { HIGH_PRIORITY_FILES, SEVERITY_LEVELS } from "./diff/constants/patterns";

export function isSensitivePath(filePath: string): boolean {
  const lowerPath = filePath.toLowerCase();

  if (RULES.AUTHENTICATION.some((r) => lowerPath.includes(r.pattern))) {
    return true;
  }

  if (RULES.AUTHORIZATION.some((r) => lowerPath.includes(r.pattern))) {
    return true;
  }

  if (RULES.SECURITY.some((r) => lowerPath.includes(r.pattern))) {
    return true;
  }

  if (RULES.CONFIGURATION.some((r) => lowerPath.includes(r.pattern))) {
    return true;
  }

  return false;
}

export function isAuthPath(filePath: string): boolean {
  return RULES.AUTHENTICATION.some((r) => filePath.toLowerCase().includes(r.pattern));
}

export function isSecurityPath(filePath: string): boolean {
  return RULES.SECURITY.some((r) => filePath.toLowerCase().includes(r.pattern));
}

export function isConfigPath(filePath: string): boolean {
  return RULES.CONFIGURATION.some((r) => filePath.toLowerCase().includes(r.pattern));
}

export function isHighPriorityFile(filePath: string): boolean {
  return HIGH_PRIORITY_FILES.includes(filePath);
}

export function isCIFile(filePath: string): boolean {
  return RULES.CI_CD.some((r) => filePath.toLowerCase().includes(r.pattern));
}

export function isInfrastructureFile(filePath: string): boolean {
  return RULES.INFRASTRUCTURE.some((r) => filePath.toLowerCase().includes(r.pattern));
}

export function getSensitiveRules(
  filePath: string,
): { ruleId: string; severity: FindingSeverity; description: string }[] {
  const rules: { ruleId: string; severity: FindingSeverity; description: string }[] = [];

  const lowerPath = filePath.toLowerCase();

  for (const rule of RULES.AUTHENTICATION) {
    if (lowerPath.includes(rule.pattern)) {
      rules.push({ ...rule, ruleId: rule.ruleId, severity: rule.severity });
    }
  }

  for (const rule of RULES.AUTHORIZATION) {
    if (lowerPath.includes(rule.pattern)) {
      rules.push({ ...rule, ruleId: rule.ruleId, severity: rule.severity });
    }
  }

  for (const rule of RULES.SECURITY) {
    if (lowerPath.includes(rule.pattern)) {
      rules.push({ ...rule, ruleId: rule.ruleId, severity: rule.severity });
    }
  }

  for (const rule of RULES.CONFIGURATION) {
    if (lowerPath.includes(rule.pattern)) {
      rules.push({ ...rule, ruleId: rule.ruleId, severity: rule.severity });
    }
  }

  for (const file of HIGH_PRIORITY_FILES) {
    if (lowerPath === file.toLowerCase()) {
      rules.push({
        ruleId: `${file.replace(/[^a-z]/g, "_").toUpperCase()}`,
        severity: SEVERITY_LEVELS.HIGH,
        description: `${file} modified`,
      });
    }
  }

  return rules;
}

export function categorizeFile(filePath: string, fileExtension?: string): FileCategory {
  const lowerPath = filePath.toLowerCase();

  if (RULES.INFRASTRUCTURE.some((r) => lowerPath.includes(r.pattern))) {
    return "infrastructure";
  }

  if (RULES.CI_CD.some((r) => lowerPath.includes(r.pattern))) {
    return "infrastructure";
  }

  if (RULES.DATABASE.some((r) => lowerPath.includes(r.pattern))) {
    return "infrastructure";
  }

  if (RULES.CONFIGURATION.some((r) => lowerPath.includes(r.pattern))) {
    return "config";
  }

  if (RULES.DEPENDENCIES.some((r) => lowerPath.includes(r.pattern))) {
    return "dependency";
  }

  if (RULES.AUTHENTICATION.some((r) => lowerPath.includes(r.pattern))) {
    return "code";
  }

  if (RULES.AUTHORIZATION.some((r) => lowerPath.includes(r.pattern))) {
    return "code";
  }

  if (RULES.SECURITY.some((r) => lowerPath.includes(r.pattern))) {
    return "code";
  }

  if (fileExtension) {
    const ext = fileExtension.toLowerCase();

    if (ext === ".test" || ext === ".spec") {
      return "test";
    }

    if (ext === ".ts" || ext === ".tsx") {
      return "code";
    }

    if (ext === ".md" || ext === ".mdx") {
      return "docs";
    }
  }

  // Default fallback
  return "code";
}

export function getFileCategory(filePath: string): FileCategory {
  return categorizeFile(filePath);
}

export const CATEGORY_MAPPINGS: Record<FileCategory, string[]> = {
  code: [
    ...RULES.AUTHENTICATION.map((r) => r.pattern),
    ...RULES.AUTHORIZATION.map((r) => r.pattern),
    ...RULES.SECURITY.map((r) => r.pattern),
  ],
  test: ["*.test", "*.spec"],
  docs: ["*.md", "*.mdx"],
  config: [...RULES.CONFIGURATION.map((r) => r.pattern)],
  dependency: [...RULES.DEPENDENCIES.map((r) => r.pattern)],
  build: ["Dockerfile", "webpack.config.js"],
  infrastructure: [
    ...RULES.INFRASTRUCTURE.map((r) => r.pattern),
    ...RULES.CI_CD.map((r) => r.pattern),
    ...RULES.DATABASE.map((r) => r.pattern),
  ],
};
