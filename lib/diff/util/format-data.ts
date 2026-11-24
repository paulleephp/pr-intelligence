import type { Pattern } from "@/types/diff/pattern";
import type { ApiArgs, FormatDataArgs, PassArgs, SshArgs } from "@/types/diff/util/format-data";
import { RISK_RULES } from "./risk-scoring";

export const getSecretFoundData = ({ filename, pattern }: PassArgs) => {
  return formatData({
    ruleId: "R007",
    filename,
    message: `Potential secret detected: ${pattern}`,
  });
};

export const getSSHFoundData = ({ filename }: SshArgs) => {
  return formatData({
    ruleId: "R007",
    filename,
    message: `Potential SSH key detected`,
  });
};

export const getApiKeyFoundData = ({ filename, pattern }: ApiArgs) => {
  return formatData({
    ruleId: "R007",
    filename,
    message: `Potential API key detected: ${pattern}`,
  });
};

export const getPasswordFoundData = ({ filename, pattern }: PassArgs) => {
  return formatData({
    ruleId: "R007",
    filename,
    message: `Potential password detected: ${pattern}`,
  });
};

export const formatData = ({ ruleId, filename, message }: FormatDataArgs): Pattern => {
  return {
    ruleId,
    severity: RISK_RULES[ruleId].severity,
    filename,
    message,
    evidence: `Pattern found in file: ${filename}`,
  };
};
