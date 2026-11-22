import type { DiffHunks } from "@/types/diff/hunk";
import type { Pattern } from "@/types/diff/pattern";
import type {
  DetectRiskyPatternsArg,
  GetHandlerFn,
  GetSecretReportArg,
  SecretScanType,
} from "@/types/diff/secret";
import type { SecretAnalysis } from "@/types/pr/metadata";
import {
  API_KEY_PATTERNS,
  LOW_RISK_PATTERNS,
  PASSWORD_PATTERNS,
  SSH_PATTERNS,
} from "./constants/patterns";
import { SECRET_SCAN_RULES } from "./constants/secret";
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
  const results = {} as Record<SecretScanType, Pattern | null>;
  for (const type of SECRET_SCAN_ORDER) {
    results[type] = detectRiskyPatterns({ hunks, filename, type, claimedLines });
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

const findMatchName = (line: string, type: SecretScanType): string | null => {
  if (type === "secret") {
    return SECRET_SCAN_RULES.find((scan) => scan.regex.test(line))?.name ?? null;
  }
  return scansMap[type].find((scan) => line.includes(scan)) ?? null;
};

const detectRiskyPatterns = ({
  hunks,
  filename,
  type,
  claimedLines = new Set<number>(),
}: DetectRiskyPatternsArg): Pattern | null => {
  const formatFn = dataFnMap[type];

  for (const [index, rawString] of hunks.added.entries()) {
    const string = rawString.toLowerCase();
    if (claimedLines.has(index) || LOW_RISK_PATTERNS.some((p) => string.includes(p.toLowerCase()))) {
      continue;
    }
    const match = findMatchName(string, type);
    if (match) {
      claimedLines.add(index);
      return formatFn({ filename, pattern: match });
    }
  }

  return null;
};
