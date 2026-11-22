import type { SecretFileKind, SecretScan } from "@/types/diff/secret";

const nameRule = (name: string, core: string): SecretScan => ({
  name,
  kind: "name",
  regex: new RegExp(String.raw`\b[\w.]*(?:${core})[\w.]*["']?\s*(?::|=(?!=))`, "i"),
});

const valueRule = (name: string, regex: RegExp): SecretScan => ({ name, kind: "value", regex });

const SECRET_NAME = String.raw`\b(?:[\w.]*[_.])?secret(?:[_.][\w.]*)?["']?\s*(?::|=(?!=))\s*`;
const NON_LITERAL_WORDS = String.raw`(?!(?:process\.env|env\(|true|false|null|undefined|string|number|boolean|await|new|yield|typeof|require|import)\b)`;
const INTERPOLATION = String.raw`(?!["'\x60]?\$\{)`;
const CONFIG_VARIABLE = String.raw`(?!["'\x60]?\$[{A-Za-z_])`;
const SHELL_REFERENCE = String.raw`(?!["']?(?:\$[{(A-Za-z_]|\x60))`;
const QUOTED_VALUE = String.raw`(["'\x60])[^"'\x60\n]{4,}\1`;
const SHELL_QUOTED_VALUE = String.raw`(["'])[^"'\x60\n]{4,}\1`;
const DOTTED_REFERENCE = String.raw`[A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)+(?:[\s,;#}]|$)`;
const BARE_VALUE = String.raw`(?!${DOTTED_REFERENCE})[^\s"'\x60,;(){}]{4,}(?=\s*(?:$|[,;#}]|\/\/))`;

const genericRule = (fileKind: SecretFileKind, value: string, reference: string): SecretScan => ({
  name: "GENERIC_SECRET",
  kind: "name",
  fileKind,
  regex: new RegExp(`${SECRET_NAME}${reference}${NON_LITERAL_WORDS}(?:${value})`, "i"),
});

export const CONFIG_FILE_PATTERNS: readonly RegExp[] = [
  /^\.env(?:\.[\w-]+)?$/,
  /^dockerfile(?:\.(?!(?:[cm]?[jt]sx?|py|rb|go|java|kt|rs|php|cs|swift)$)[\w-]+)?$/,
  /\.(?:env|ya?ml|ini|toml|conf|cfg|tfvars)$/,
];

export const SHELL_FILE_PATTERNS: readonly RegExp[] = [/^\.envrc$/, /\.(?:sh|bash|zsh)$/];

export const SECRET_VALUE_RULES: readonly SecretScan[] = [
  valueRule("PRIVATE_KEY", /-----BEGIN [A-Z ]*PRIVATE KEY-----/),
  valueRule("AWS_ACCESS_KEY", /\b(?:AKIA|ASIA)[0-9A-Z]{16}\b/),
  valueRule("GITHUB_TOKEN", /\b(?:gh[pousr]_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,})/),
  valueRule("SLACK_TOKEN", /\bxox[abposr]-[A-Za-z0-9-]{10,}/),
  valueRule("STRIPE_SECRET", /\b[sr]k_live_[A-Za-z0-9]{16,}/),
];

export const SECRET_NAME_RULES: readonly SecretScan[] = [
  nameRule("GITHUB_TOKEN", String.raw`github[_.]token|gh[_.]token`),
  nameRule("AWS_SECRET", String.raw`aws[_.]secret`),
  nameRule("AWS_ACCESS_KEY", String.raw`aws[_.]access[_.]key`),
  nameRule("ENCRYPTION_KEY", String.raw`encryption[_.]key`),
  nameRule("OAUTH_TOKEN", String.raw`oauth[_.]token`),
  nameRule("STRIPE_SECRET", String.raw`stripe[_.](?:secret|api[_.]key)`),
  nameRule("SLACK_TOKEN", String.raw`slack[_.](?:\w+[_.])?token`),
  nameRule("JWT_SECRET", String.raw`jwt[_.]secret`),
  genericRule("code", QUOTED_VALUE, INTERPOLATION),
  genericRule("config", `${QUOTED_VALUE}|${BARE_VALUE}`, CONFIG_VARIABLE),
  genericRule("shell", `${SHELL_QUOTED_VALUE}|${BARE_VALUE}`, SHELL_REFERENCE),
];

export const LOW_RISK_LINE = /(?<![a-z])(?:todo|fixme|example|demo|mock|test)(?![a-z])/i;
