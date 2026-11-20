import type { DiffHunks } from "@/types/diff/hunk";
import type { Pattern } from "@/types/diff/pattern";
import {
  AUTH_PATTERNS,
  PASSWORD_HASHING_PATTERNS,
  CRYPTO_ALGO_PATTERNS,
} from "./change-detection";

export const getCodeReport = ({ hunks, status, filename }: { 
  hunks: DiffHunks; 
  status: string; 
  filename: string; 
}): CodeAnalysis => {
  const authPatterns: Array<{ patternId: string; message: string }> = [];
  const passwordHashingPatterns: Array<{ patternId: string; message: string }> = [];
  const cryptoAlgoPatterns: Array<{ patternId: string; message: string }> = [];

  // Analyze added code for authentication/authorization issues (R002)
  analyzeAuthChanges(hunks.added, filename, status, authPatterns);
  
  // Analyze added code for password hashing patterns (R013)
  analyzePasswordHashing(hunks.added, filename, passwordHashingPatterns);
  
  // Analyze added code for crypto algorithm patterns (R012)
  analyzeCryptoAlgorithms(hunks.added, filename, cryptoAlgoPatterns);

  return {
    authPatterns,
    passwordHashingPatterns,
    cryptoAlgoPatterns,
  };
};

const analyzeAuthChanges = (
  addedLines: string[], 
  filename: string, 
  status: string, 
  results: Array<{ patternId: string; message: string }> 
) => {
  const isRemoval = status === 'removed' || status === 'deleted';

  for (const line of addedLines) {
    const lowerLine = line.toLowerCase();
    
    // Skip if this line was removed (we're looking at additions)
    if (isRemoval && !line.startsWith('+')) {
      continue;
    }

    for (const pattern of AUTH_PATTERNS) {
      if (lowerLine.includes(pattern)) {
        results.push({
          patternId: 'R002',
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
  results: Array<{ patternId: string; message: string }> 
) => {
  for (const line of addedLines) {
    const lowerLine = line.toLowerCase();

    for (const pattern of PASSWORD_HASHING_PATTERNS) {
      if (lowerLine.includes(pattern)) {
        results.push({
          patternId: 'R013',
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
  results: Array<{ patternId: string; message: string }> 
) => {
  for (const line of addedLines) {
    const lowerLine = line.toLowerCase();

    for (const pattern of CRYPTO_ALGO_PATTERNS) {
      if (lowerLine.includes(pattern)) {
        results.push({
          patternId: 'R012',
          message: `Insecure crypto algorithm detected in ${filename}: "${pattern}"`,
        });
        break; // Only report one finding per line
      }
    }
  }
};