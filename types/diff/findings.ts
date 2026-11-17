import type { ChangeType } from "@/lib/diff-analysis";

/**
 * Finding severity level
 */
export type FindingSeverity = "low" | "medium" | "high" | "critical";

/**
 * Finding interface for risk detection
 */
export interface Finding {
  ruleId: string;
  severity: FindingSeverity;
  file: string;
  message: string;
  evidence?: string;
}

/**
 * Array of findings
 */
export type FindingsArray = Finding[];

/**
 * Finding with auth-related changes
 */
export interface AuthChangeFinding extends Finding {
  ruleId: "R002" | "R003" | "R004";
  changeType: ChangeType;
}

/**
 * Finding with dependency changes
 */
export interface DependencyChangeFinding extends Finding {
  ruleId: "R005";
  changeType: ChangeType;
}

/**
 * Finding with CI/CD changes
 */
export interface CIChangeFinding extends Finding {
  ruleId: "R006";
  changeType: ChangeType;
}

/**
 * Finding with test changes
 */
export interface TestChangeFinding extends Finding {
  ruleId: "R010";
  changeType: ChangeType;
}

/**
 * Secret pattern categories
 */
export type SecretCategory = 
  | "api_key"
  | "password"
  | "ssh_key"
  | "private_key"
  | "credential";
  