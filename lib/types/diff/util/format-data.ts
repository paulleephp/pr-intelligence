import type { RiskRuleId } from "@/lib/diff/util/risk-scoring";

interface GenericArgs {
  filename: string;
}

export type ApiArgs = GenericArgs & {
  pattern: string;
};
export type PassArgs = GenericArgs & {
  pattern: string;
};
export type SshArgs = GenericArgs;

export type FormatDataArgs = {
  ruleId: RiskRuleId;
  filename: string;
  message: string;
};
