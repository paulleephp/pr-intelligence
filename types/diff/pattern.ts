export type PatternSeverity = "low" | "medium" | "high" | "critical";

export type PatternCriteria =
  | "AUTHENTICATION"
  | "AUTHORIZATION"
  | "DATABASE"
  | "SECURITY"
  | "CONFIGURATION"
  | "DEPENDENCIES"
  | "CI_CD"
  | "INFRASTRUCTURE";

export interface Pattern {
  ruleId: string;
  severity: PatternSeverity;
  filename: string;
  message: string;
  evidence?: string;
}

export type PatternDetail = {
  pattern: string;
  ruleId: string;
  severity: PatternSeverity;
  description: string;
};
