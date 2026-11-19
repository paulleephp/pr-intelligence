import type { CategorizerArg } from "@/types/diff/categorize";
import type { Pattern } from "@/types/diff/pattern";
import { PRFileStatus } from "./constants/file";
import { SeverityLevels } from "./constants/patterns";

const AUTH_PATHS = ["/auth", "/login", "/session"];
const CI_PATTERNS = [".github/workflows/", "Dockerfile"];
const POTENTIAL_CONFIG_CHANGES = [".env", "tsconfig.json", "dockerfile", "package.json"];

export const getCategoryReport = ({ filename: rawFilename, status }: CategorizerArg) => {
  const filename = rawFilename.toLowerCase()
  const result: Pattern[] | null = []

  const idCheck = detectConfigChanges({ filename, status });
  if (idCheck) result.push(idCheck)
  const authCheck = detectAuthChanges({ filename, status });
  if (authCheck) result.push(authCheck)
  const ciCheck = detectCIChanges({ filename, status });
  if (ciCheck) result.push(ciCheck)
  const testChanges = detectTestChanges({filename, status})
  if (testChanges) result.push(testChanges)

  return result
};

export const detectConfigChanges = ({
  filename,
  status,
}: CategorizerArg): Pattern | null => {
  if (
    (status === PRFileStatus.Modified || status === PRFileStatus.Removed) &&
    POTENTIAL_CONFIG_CHANGES.includes(filename)
  ) {
    return {
      ruleId: "R009",
      severity: SeverityLevels.High,
      filename,
      message: "Config change detected",
    };
  }

  return null;
};

export const detectAuthChanges = ({filename, status}: CategorizerArg): Pattern | null => {
  if ((status === PRFileStatus.Modified || status === PRFileStatus.Removed) && 
    AUTH_PATHS.some((p) => filename.includes(p))) {
    return {
      ruleId: "R006",
      severity: SeverityLevels.Medium,
      filename,
      message: "Potential auth change detected",
    };
  }

  return null;
}

export const detectCIChanges = ({filename, status}: CategorizerArg): Pattern | null => {
  if (status === PRFileStatus.Modified && CI_PATTERNS.some((p) => filename.includes(p))) {
    return {
      ruleId: "R006",
      severity: SeverityLevels.Medium,
      filename,
      message: "CI change detected",
    };
  }

  return null;
}

export const detectTestChanges = ({ filename, status }: CategorizerArg): Pattern | null => {
  if (status === PRFileStatus.Removed) {
    return {
      ruleId: "R010",
      severity: SeverityLevels.Medium,
      filename,
      message: "Test removal detected",
    };
  }

  return null;
}
