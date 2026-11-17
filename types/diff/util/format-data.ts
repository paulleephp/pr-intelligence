interface GenericArgs {
  file: string;
};

export type ApiArgs = GenericArgs & {
  pattern: string;
};
export type PassArgs = GenericArgs & {
  pattern: string;
};
export type SshArgs = GenericArgs;

export type FormatDataArgs {
  ruleId: string;
  file: string;
  message: string;
};