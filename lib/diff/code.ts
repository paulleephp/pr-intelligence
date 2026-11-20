import type { DiffHunks } from "@/types/diff/hunk";
import type { CodeAnalysis } from "../types/pr/metadata";
import { AUTH_PATTERNS, CRYPTO_ALGO_PATTERNS, PASSWORD_HASHING_PATTERNS } from "./change-detection";

export const getCodeReport = ({
  hunks,
  status,
  filename,
}: {
  hunks: DiffHunks;
  status: string;
  filename: string;
}): CodeAnalysis => {
  const authPatterns: Array<{ patternId: string; message: string }> = [];
  const passwordHashingPatterns: Array<{ patternId: string; message: string }> = [];
  const cryptoAlgoPatterns: Array<{ patternId: string; message: string }> = [];
  const prodConfigChanges: Array<{ patternId: string; message: string }> = [];
  const riskyApiCalls: Array<{ patternId: string; message: string }> = [];

  // Analyze added code for authentication/authorization issues (R002)
  analyzeAuthChanges(hunks.added, filename, status, authPatterns);

  // Analyze added code for password hashing patterns (R013)
  analyzePasswordHashing(hunks.added, filename, passwordHashingPatterns);

  // Analyze added code for crypto algorithm patterns (R012)
  analyzeCryptoAlgorithms(hunks.added, filename, cryptoAlgoPatterns);

  // Analyze added code for production config changes
  collectProdConfigChanges(hunks.added, filename, prodConfigChanges);

  // Analyze added code for risky API calls
  collectRiskyApiCalls(hunks.added, filename, riskyApiCalls);

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
  status: string,
  results: Array<{ patternId: string; message: string }>,
) => {

  for (const line of addedLines) {
    const lowerLine = line.toLowerCase();

    for (const pattern of AUTH_PATTERNS) {
      if (lowerLine.includes(pattern)) {
        results.push({
          patternId: "R002",
          message: `Authentication/authorization check removal detected in ${filename}: "${pattern}"`,
        });
        break; // Only report one finding per line
      }
    }
  }
};

const analyzePasswordHashing = (
  addedLines: string[],
  filename: string,
  results: Array<{ patternId: string; message: string }>,
) => {
  for (const line of addedLines) {
    const lowerLine = line.toLowerCase();

    for (const pattern of PASSWORD_HASHING_PATTERNS) {
      if (lowerLine.includes(pattern)) {
        results.push({
          patternId: "R013",
          message: `Weak password hashing algorithm detected in ${filename}: "${pattern}"`,
        });
        break; // Only report one finding per line
      }
    }
  }
};

const analyzeCryptoAlgorithms = (
  addedLines: string[],
  filename: string,
  results: Array<{ patternId: string; message: string }>,
) => {
  for (const line of addedLines) {
    const lowerLine = line.toLowerCase();

    for (const pattern of CRYPTO_ALGO_PATTERNS) {
      if (lowerLine.includes(pattern)) {
        results.push({
          patternId: "R012",
          message: `Insecure crypto algorithm detected in ${filename}: "${pattern}"`,
        });
        break; // Only report one finding per line
      }
    }
  }
};
const collectProdConfigChanges = (
  addedLines: string[],
  filename: string,
  findings: Array<{ patternId: string; message: string }>,
) => {
  const PROD_CONFIG_CHANGE_PATTERNS = ["production", "prod", "NODE_ENV"];

  for (const line of addedLines) {
    const lowerLine = line.toLowerCase();

    for (const pattern of PROD_CONFIG_CHANGE_PATTERNS) {
      if (lowerLine.includes(pattern)) {
        findings.push({
          patternId: "R014",
          message: `Production configuration change detected in ${filename}: "${pattern}"`,
        });
        break; // Only report one finding per line
      }
    }
  }
};

const collectRiskyApiCalls = (
  addedLines: string[],
  filename: string,
  findings: Array<{ patternId: string; message: string }>,
) => {
  const RISKY_API_PATTERNS = [
    "fetch(",
    "axios(",
    "http(",
    "request(",
    "window.location",
    "document.createElement",
  ];

  for (const line of addedLines) {
    const lowerLine = line.toLowerCase();

    for (const pattern of RISKY_API_PATTERNS) {
      if (lowerLine.includes(pattern)) {
        findings.push({
          patternId: "R015",
          message: `Potentially risky API call detected in ${filename}: "${pattern}"`,
        });
        break; // Only report one finding per line
      }
    }
  }
};
