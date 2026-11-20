import type { DiffHunks } from "@/types/diff/hunk";
import type { Pattern } from "@/types/diff/pattern";
import type {
  DetectRiskyPatternsArg,
  GetHandlerFn,
  GetSecretReportArg,
  SecretScan,
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

const dataFnMap: Record<string, GetHandlerFn> = {
  secret: getSecretFoundData,
  ssh: getSSHFoundData,
  password: getPasswordFoundData,
  apiKey: getApiKeyFoundData,
};

const scansMap: Record<string, Array<string>> = {
  ssh: SSH_PATTERNS,
  password: PASSWORD_PATTERNS,
  apiKey: API_KEY_PATTERNS,
};

export const getSecretsReport = ({ hunks, filename }: GetSecretReportArg): SecretAnalysis => ({
  filename,
  secret: detectSecrets(hunks, filename),
  apiKey: detectAPIKeys(hunks, filename),
  password: detectPasswords(hunks, filename),
  ssh: detectSSHKeys(hunks, filename),
});

export const detectSecrets = (hunks: DiffHunks, filename: string): Pattern | null =>
  detectRiskyPatterns({ hunks, filename, type: "secret" });

export const detectAPIKeys = (hunks: DiffHunks, filename: string): Pattern | null =>
  detectRiskyPatterns({ hunks, filename, type: "apiKey" });

export const detectPasswords = (hunks: DiffHunks, filename: string): Pattern | null =>
  detectRiskyPatterns({ hunks, filename, type: "password" });

export const detectSSHKeys = (hunks: DiffHunks, filename: string): Pattern | null =>
  detectRiskyPatterns({ hunks, filename, type: "ssh" });

const detectRiskyPatterns = ({ hunks, filename, type }: DetectRiskyPatternsArg) => {
  const formatFn = dataFnMap[type];

  for (const rawString of hunks.added) {
    const string = rawString.toLowerCase();

    if (LOW_RISK_PATTERNS.some((p) => string.includes(p))) {
      return null;
    }

    if (type === "secret") {
      const scans: SecretScan[] = SECRET_SCAN_RULES;

      for (const scan of scans) {
        if (scan.regex?.test(string)) {
          return formatFn({ filename, pattern: scan.name });
        }
      }
    } else {
      const scans: Array<string> = scansMap[type];
      for (const scan of scans) {
        if (string.includes(scan)) {
          return formatFn({ filename, pattern: scan });
        }
      }
    }
  }

  return null;
};
