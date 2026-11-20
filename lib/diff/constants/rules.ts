import type { Pattern } from "@/types/diff/pattern";

export type ChangeType = "added" | "removed" | "modified";

export interface AuthChangeFinding extends Pattern {
  ruleId: "R002" | "R003" | "R004";
  changeType: ChangeType;
}

export interface DependencyChangeFinding extends Pattern {
  ruleId: "R005";
  changeType: ChangeType;
}

export interface CIChangeFinding extends Pattern {
  ruleId: "R006";
  changeType: ChangeType;
}

export interface TestChangeFinding extends Pattern {
  ruleId: "R010";
  changeType: ChangeType;
}
