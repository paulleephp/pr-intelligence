import type { DiffHunks } from "@/types/diff/hunk";
import type { Pattern } from "@/types/diff/pattern";
import type { GetHandlerFn, GetRiskyPatternsArg, SecretScan } from "@/types/diff/secret";
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

export const checkForSecrets = ({ hunks, filename }: { hunks: DiffHunks; filename: string }) => ({
  filename,
  secret: detectSecrets(hunks, filename),
  apiKey: detectAPIKeys(hunks, filename),
  password: detectPasswords(hunks, filename),
  ssh: detectSSHKeys(hunks, filename),
});

export const detectSecrets = (hunks: DiffHunks, filename: string): Pattern[] =>
  getRiskyPatterns({ hunks, filename, type: "secret" });

export const detectAPIKeys = (hunks: DiffHunks, filename: string): Pattern[] =>
  getRiskyPatterns({ hunks, filename, type: "apiKey" });

export const detectPasswords = (hunks: DiffHunks, filename: string): Pattern[] =>
  getRiskyPatterns({ hunks, filename, type: "password" });

export const detectSSHKeys = (hunks: DiffHunks, filename: string): Pattern[] =>
  getRiskyPatterns({ hunks, filename, type: "ssh" });

const getRiskyPatterns = ({ hunks, filename, type }: GetRiskyPatternsArg) => {
  const riskyPatterns: Pattern[] = [];
  const formatFn = dataFnMap[type];

  for (const rawString of hunks.added) {
    const string = rawString.toLowerCase();

    if (LOW_RISK_PATTERNS.some((p) => string.includes(p))) {
      continue;
    }

    if (type === "secret") {
      const scans: SecretScan[] = SECRET_SCAN_RULES;

      for (const scan of scans) {
        if (scan.regex?.test(string)) {
          riskyPatterns.push(formatFn({ filename, pattern: scan.name }));
          break;
        }
      }
    } else {
      const scans: Array<string> = scansMap[type];
      for (const scan of scans) {
        if (string.includes(scan)) {
          riskyPatterns.push(formatFn({ filename, pattern: scan }));
          break;
        }
      }
    }
  }

  return riskyPatterns;
};
