/**
 * File Pattern Matching & Detection
 */

export type FileStatus = "added" | "removed" | "modified" | "renamed";

interface Finding {
  ruleId: string;
  severity: "low" | "medium" | "high" | "critical";
  file: string;
  message: string;
  evidence?: string;
}

export const AUTH_PATHS = ["/auth/", "/login/", "/session/", "."];
export const SECURITY_PATHS = ["/security/", "/crypto/", "/encryption/"];
export const CONFIG_FILES = [".env", ".gitignore", "tsconfig.json", "Dockerfile"];
export const CI_PATTERNS = ["/.github/workflows/", "Dockerfile"];

function isSensitivePath(path: string): boolean {
  return AUTH_PATHS.some(p => path.toLowerCase().includes(p)) || 
         SECURITY_PATHS.some(p => path.toLowerCase().includes(p));
}

export function identifyAuthChanges(
  files: Array<{ file: string; status: FileStatus }>
): Finding[] {
  const findings: Finding[] = [];
  
  for (const f of files) {
    if (isSensitivePath(f.file) && (f.status === "modified" || f.status === "removed")) {
      findings.push({
        ruleId: "R001",
        severity: f.status === "removed" ? "high" : "medium",
        file: f.file,
        message: `Authentication file ${f.status}`,
        evidence: `Sensitive auth/path file changed`,
      });
    }
  }
  return findings;
}

export function isCodeFile(file: string): boolean {
  const ext = file.toLowerCase().slice(-4);
  return ext === ".ts" || ext === ".tsx";
}

export function isTestFile(file: string): boolean {
  return file.endsWith(".test") || file.endsWith(".spec");
}

export function isConfigFile(file: string): boolean {
  const pathLower = file.toLowerCase();
  return (
    pathLower.includes(".env") ||
    pathLower.includes("config") ||
    pathLower === "tsconfig.json" ||
    pathLower === "package.json" ||
    pathLower === "Dockerfile"
  );
}

export function isCIFile(file: string): boolean {
  return CI_PATTERNS.some(p => file.toLowerCase().includes(p));
}
