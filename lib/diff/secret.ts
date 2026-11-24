import type { DiffHunks } from "@/types/diff/hunk";
import type { Pattern } from "@/types/diff/pattern";
import type {
  DetectRiskyPatternsArg,
  GetHandlerFn,
  GetSecretReportArg,
  SecretFileKind,
  SecretLineContext,
  SecretScanType,
} from "@/types/diff/secret";
import type { SecretAnalysis } from "@/types/pr/metadata";
import { API_KEY_PATTERNS, PASSWORD_PATTERNS, SSH_PATTERNS } from "./constants/patterns";
import {
  CONFIG_FILE_PATTERNS,
  SHELL_FILE_PATTERNS,
  LOW_RISK_LINE,
  SECRET_NAME_RULES,
  SECRET_VALUE_RULES,
} from "./constants/secret";
import { withLine } from "./util/finding-id";
import { stripTrailingComment } from "./util/strip-comment";
import { isTestPath } from "./util/test-path";
import {
  getApiKeyFoundData,
  getPasswordFoundData,
  getSecretFoundData,
  getSSHFoundData,
} from "./util/format-data";

const dataFnMap: Record<SecretScanType, GetHandlerFn> = {
  secret: getSecretFoundData,
  ssh: getSSHFoundData,
  password: getPasswordFoundData,
  apiKey: getApiKeyFoundData,
};

const scansMap: Record<Exclude<SecretScanType, "secret">, string[]> = {
  ssh: SSH_PATTERNS,
  password: PASSWORD_PATTERNS,
  apiKey: API_KEY_PATTERNS,
};

const SECRET_SCAN_ORDER: readonly SecretScanType[] = ["secret", "apiKey", "password", "ssh"];

export const getSecretsReport = ({ hunks, filename }: GetSecretReportArg): SecretAnalysis => {
  const claimedLines = new Set<number>();
  const skipScan = isTestPath(filename);
  const results = {} as Record<SecretScanType, Pattern | null>;
  for (const type of SECRET_SCAN_ORDER) {
    results[type] = skipScan ? null : detectRiskyPatterns({ hunks, filename, type, claimedLines });
  }
  return { filename, ...results };
};

export const detectSecrets = (hunks: DiffHunks, filename: string): Pattern | null =>
  detectRiskyPatterns({ hunks, filename, type: "secret" });

export const detectAPIKeys = (hunks: DiffHunks, filename: string): Pattern | null =>
  detectRiskyPatterns({ hunks, filename, type: "apiKey" });

export const detectPasswords = (hunks: DiffHunks, filename: string): Pattern | null =>
  detectRiskyPatterns({ hunks, filename, type: "password" });

export const detectSSHKeys = (hunks: DiffHunks, filename: string): Pattern | null =>
  detectRiskyPatterns({ hunks, filename, type: "ssh" });

const findNameMatch = ({ rawLine, type, fileKind }: SecretLineContext): string | null => {
  if (type === "secret") {
    const rules = SECRET_NAME_RULES.filter((scan) => !scan.fileKind || scan.fileKind === fileKind);
    return rules.find((scan) => scan.regex.test(rawLine))?.name ?? null;
  }
  const line = rawLine.toLowerCase();
  return scansMap[type].find((scan) => line.includes(scan)) ?? null;
};

const findValueMatch = ({ rawLine, type }: SecretLineContext): string | null =>
  type === "secret" ? (SECRET_VALUE_RULES.find((scan) => scan.regex.test(rawLine))?.name ?? null) : null;

const findMatch = (context: SecretLineContext): string | null => {
  const valueMatch = findValueMatch(context);
  if (valueMatch) {
    return valueMatch;
  }
  const code = stripTrailingComment(context.rawLine).trim();
  const filterTarget = code || context.rawLine;
  return LOW_RISK_LINE.test(filterTarget) ? null : findNameMatch(context);
};

const getSecretFileKind = (filename: string): SecretFileKind => {
  const basename = (filename.split("/").pop() ?? filename).toLowerCase();
  const matches = (patterns: readonly RegExp[]) => patterns.some((pattern) => pattern.test(basename));
  if (matches(SHELL_FILE_PATTERNS)) return "shell";
  return matches(CONFIG_FILE_PATTERNS) ? "config" : "code";
};

const detectRiskyPatterns = ({
  hunks,
  filename,
  type,
  claimedLines = new Set<number>(),
}: DetectRiskyPatternsArg): Pattern | null => {
  const formatFn = dataFnMap[type];
  const fileKind = getSecretFileKind(filename);

  for (const [index, rawLine] of hunks.added.entries()) {
    if (claimedLines.has(index)) {
      continue;
    }
    const match = findMatch({ rawLine, type, fileKind });
    if (match) {
      claimedLines.add(index);
      return withLine(formatFn({ filename, pattern: match }), hunks.addedLineNumbers?.[index]);
    }
  }

  return null;
};
