export const RUNNABLE_EXTENSIONS: ReadonlySet<string> = new Set([
  "sh",
  "bash",
  "zsh",
  "ksh",
  "fish",
  "command",
]);

export const RUNNABLE_FOLDER_PATTERN = /(?:^|\/)(?:bin|scripts|\.husky|\.githooks)\//i;
