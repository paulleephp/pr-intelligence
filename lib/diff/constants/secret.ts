import type { KeywordScanType, SecretFileKind, SecretScan } from "@/types/diff/secret";
import { API_KEY_PATTERNS, PASSWORD_PATTERNS, SSH_PATTERNS } from "./patterns";

const nameRule = (name: string, core: string): SecretScan => ({
  name,
  kind: "name",
  regex: new RegExp(String.raw`\b[\w.]*(?:${core})[\w.]*["']?\s*(?::|=(?!=))`, "i"),
});

const valueRule = (name: string, regex: RegExp): SecretScan => ({ name, kind: "value", regex });

const TYPE_ANNOTATION = String.raw`(?:\??\s*:\s*[\w.$<>[\]]+|\s+[\w.]+)?`;
const ASSIGNMENT = String.raw`["']?\]?\s*(?:${TYPE_ANNOTATION}\s*(?:\?\?|\|\||&&)?=(?!=)|:=?)\s*`;
const NOT_UNION = String.raw`(?!\s*\|(?!\|))`;
const SECRET_NAME = String.raw`\b(?:[\w.]*[_.])?secret(?:[_.][\w.]*)?${ASSIGNMENT}`;
const NON_LITERAL_WORDS = String.raw`(?!(?:process\.env|env\(|true|false|null|undefined|string|number|boolean|await|new|yield|typeof|require|import)\b)`;
const INTERPOLATION = String.raw`(?!["'\x60]?\$\{)`;
const CONFIG_VARIABLE = String.raw`(?!["'\x60]?\$[{A-Za-z_])`;
const SHELL_REFERENCE = String.raw`(?!["']?(?:\$[{(A-Za-z_]|\x60))`;
const QUOTED_VALUE = String.raw`(["'\x60])[^"'\x60\n]{4,}\1`;
const SHELL_QUOTED_VALUE = String.raw`(["'])[^"'\x60\n]{4,}\1`;
const DOTTED_REFERENCE = String.raw`[A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)+(?:[\s,;#}]|$)`;
const BARE_VALUE = String.raw`(?!${DOTTED_REFERENCE})[^\s"'\x60,;(){}]{4,}(?=\s*(?:$|[,;#}]|\/\/))`;

const ASSIGNED_LITERAL: Record<SecretFileKind, { value: string; reference: string }> = {
  code: { value: QUOTED_VALUE, reference: INTERPOLATION },
  config: { value: `${QUOTED_VALUE}|${BARE_VALUE}`, reference: CONFIG_VARIABLE },
  shell: { value: `${SHELL_QUOTED_VALUE}|${BARE_VALUE}`, reference: SHELL_REFERENCE },
};
const SECRET_FILE_KINDS = Object.keys(ASSIGNED_LITERAL) as SecretFileKind[];

const literalAfter = (fileKind: SecretFileKind): string => {
  const { value, reference } = ASSIGNED_LITERAL[fileKind];
  return `${reference}${NON_LITERAL_WORDS}(?:${value})${NOT_UNION}`;
};

const genericRule = (fileKind: SecretFileKind): SecretScan => ({
  name: "GENERIC_SECRET",
  kind: "name",
  fileKind,
  regex: new RegExp(`${SECRET_NAME}${literalAfter(fileKind)}`, "i"),
});

const escapeKeyword = (keyword: string): string => keyword.replaceAll(".", String.raw`\.`);

const keywordRules = (keywords: readonly string[]): SecretScan[] =>
  keywords.flatMap((keyword) =>
    SECRET_FILE_KINDS.map((fileKind) => ({
      name: keyword,
      kind: "name" as const,
      fileKind,
      regex: new RegExp(
        String.raw`(?<!\btype\s+)(?<![\w.])[\w.]*${escapeKeyword(keyword)}[\w.]*${ASSIGNMENT}${literalAfter(fileKind)}`,
        "i",
      ),
    })),
  );

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
  ...SECRET_FILE_KINDS.map(genericRule),
];

export const KEYWORD_RULES: Record<KeywordScanType, readonly SecretScan[]> = {
  ssh: keywordRules(SSH_PATTERNS),
  password: keywordRules(PASSWORD_PATTERNS),
  apiKey: keywordRules(API_KEY_PATTERNS),
};

export const LOW_RISK_LINE = /(?<![a-z])(?:todo|fixme|example|demo|mock|test)(?![a-z])/i;
