import type { Pattern } from "@/types/diff/pattern";
import type { FileStatus } from "@/types/github/octokit";

const AUTH_PATHS = ["/auth/", "/login/", "/session/", "."];

const CI_PATTERNS = ["/.github/workflows/", "Dockerfile"];

function _isSensitivePath(path: string): boolean {
  return AUTH_PATHS.some((p) => path.toLowerCase().includes(p)) || path === ".env";
}

export function identifyConfigChanges(
  files: Array<{ file: string; status: FileStatus }>,
): Pattern[] {
  const findings: Pattern[] = [];

  for (const f of files) {
    if (
      (f.status === "modified" || f.status === "removed") &&
      (f.file === ".env" ||
        f.file === "tsconfig.json" ||
        f.file === "Dockerfile" ||
        f.file === "package.json")
    ) {
      findings.push({
        ruleId: "R009",
        severity: "high",
        filename: f.file,
        message: "Config change detected",
      });
    }
  }
  return findings;
}

interface CIFile {
  file: string;
  status: FileStatus;
}

export function detectCIChanges(files: Array<CIFile>): Pattern[] {
  const findings: Pattern[] = [];

  for (const f of files) {
    if (f.status === "modified" && CI_PATTERNS.some((p) => f.file.toLowerCase().includes(p))) {
      findings.push({
        ruleId: "R006",
        severity: "medium",
        filename: f.file,
        message: "CI change detected"
      });
    }
  }
  return findings;
}

interface TestFile {
  file: string;
  status: FileStatus;
}

export function detectTestChanges(files: Array<TestFile>): Pattern[] {
  const findings: Pattern[] = [];

  for (const f of files) {
    if (f.status === "removed") {
      findings.push({
        ruleId: "R010",
        severity: "medium",
        filename: f.file,
        message: "Test removal detected"
      });
    }
  }
  return findings;
}
