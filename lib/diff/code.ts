import type { DiffHunks } from "@/types/diff/hunk";
import type { CodeAnalysis } from "../types/pr/metadata";
import { AUTH_PATTERNS, CRYPTO_ALGO_PATTERNS, PASSWORD_HASHING_PATTERNS, PROD_CONFIG_CHANGE_PATTERNS, RISKY_API_PATTERNS } from "./change-detection";

export const getCodeReport = ({
  hunks,
  status,
  filename,
}: {
  hunks: DiffHunks;
  status: string;
  filename: string;
}): CodeAnalysis => {
  const authPatterns = analyzeAuthChanges(hunks.added, filename) ?? null;
  const passwordHashingPatterns = analyzePasswordHashing(hunks.added, filename) ?? null;
  const cryptoAlgoPatterns = analyzeCryptoAlgorithms(hunks.added, filename) ?? null;
  const prodConfigChanges = collectProdConfigChanges(hunks.added, filename) ?? null;
  const riskyApiCalls = collectRiskyApiCalls(hunks.added, filename) ?? null;  

  return {
    authPatterns,
    passwordHashingPatterns,
    cryptoAlgoPatterns,
    prodConfigChanges,
    riskyApiCalls,
  };
};

const analyzeAuthChanges = (
  addedLines: string[],
  filename: string,
) => {
  for (const line of addedLines) {
    const lowerLine = line.toLowerCase();

    for (const pattern of AUTH_PATTERNS) {
      if (lowerLine.includes(pattern)) {
        return {
          ruleId: "R002",
          message: `Authentication/authorization check removal detected in ${filename}: "${pattern}"`,
        };
      }
    }
  }
};

const analyzePasswordHashing = (
  addedLines: string[],
  filename: string
) => {
  for (const line of addedLines) {
    const lowerLine = line.toLowerCase();

    for (const pattern of PASSWORD_HASHING_PATTERNS) {
      if (lowerLine.includes(pattern)) {
        return {
          ruleId: "R013",
          message: `Weak password hashing algorithm detected in ${filename}: "${pattern}"`,
        };
      }
    }
  }
};

const analyzeCryptoAlgorithms = (
  addedLines: string[],
  filename: string,
) => {
  for (const line of addedLines) {
    const lowerLine = line.toLowerCase();

    for (const pattern of CRYPTO_ALGO_PATTERNS) {
      if (lowerLine.includes(pattern)) {
        return {
          ruleId: "R012",
          message: `Insecure crypto algorithm detected in ${filename}: "${pattern}"`,
        };
      }
    }
  }
};

const collectProdConfigChanges = (
  addedLines: string[],
  filename: string,
) => {
  for (const line of addedLines) {
    const lowerLine = line.toLowerCase();

    for (const pattern of PROD_CONFIG_CHANGE_PATTERNS) {
      if (lowerLine.includes(pattern)) {
        return {
          ruleId: "R014",
          message: `Production configuration change detected in ${filename}: "${pattern}"`,
        };
      }
    }
  }
};

const collectRiskyApiCalls = (
  addedLines: string[],
  filename: string,
) => {
  for (const line of addedLines) {
    const lowerLine = line.toLowerCase();

    for (const pattern of RISKY_API_PATTERNS) {
      if (lowerLine.includes(pattern)) {
        return {
          ruleId: "R015",
          message: `Potentially risky API call detected in ${filename}: "${pattern}"`,
        };
      }
    }
  }
};
