interface GenericArgs {
  filename: string;
};

export type ApiArgs = GenericArgs & {
  pattern: string;
};
export type PassArgs = GenericArgs & {
  pattern: string;
};
export type SshArgs = GenericArgs;

export type FormatDataArgs = {
  ruleId: string;
  filename: string;
  message: string;
};