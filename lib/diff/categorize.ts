import type { CategorizerArg } from "@/types/diff/categorize";
import type { Pattern } from "@/types/diff/pattern";
import { PRFileStatus } from "./constants/file";
import { SeverityLevels } from "./constants/patterns";

// Authentication + Authorization
const AUTH_PATHS = ["/auth", "/login", "/session", "/permission", "/access-control", "/rbac"];
const CI_PATHS = [".github/workflows/", "Dockerfile", "docker-compose"];
const POTENTIAL_CONFIG_CHANGES = [".env", ".config", "tsconfig.json", "dockerfile", "package.json", "package-lock.json", "tsconfig", ".npmrc", "webpack.config"];
const SECURITY_PATHS = ["/security", "/crypto", "/encryption"];
const INFRA_PATHS = ["terraform/", "k8s/", "helm/"]

export const getCategoryReport = ({ filename: rawFilename, status }: CategorizerArg) => {
  const filename = rawFilename.toLowerCase()
  
  const detections = [
    detectConfigChanges({ filename, status }),
    detectAuthChanges({ filename, status }),
    detectCIChanges({ filename, status }),
    detectSecurityChanges({ filename, status }),
    detectInfraChanges({ filename, status }),
    detectTestChanges({filename, status}),
  ]
  
  return detections.filter(Boolean)
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
      ruleId: "R001",
      severity: SeverityLevels.Medium,
      filename,
      message: "Potential auth change detected",
    };
  }

  return null;
}

export const detectCIChanges = ({filename, status}: CategorizerArg): Pattern | null => {
  if (status === PRFileStatus.Modified && CI_PATHS.some((p) => filename.includes(p))) {
    return {
      ruleId: "R006",
      severity: SeverityLevels.Medium,
      filename,
      message: "CI change detected",
    };
  }

  return null;
}

export const detectSecurityChanges = ({ filename, status }: CategorizerArg): Pattern | null => {
  if (
    (status === PRFileStatus.Modified || status === PRFileStatus.Removed) &&
    SECURITY_PATHS.some((p) => filename.includes(p))
  ) {
    return {
      ruleId: "R010",
      severity: SeverityLevels.High,
      filename,
      message: "Security change detected",
    };
  }

  return null;
}

export const detectInfraChanges = ({ filename, status }: CategorizerArg): Pattern | null => {
  if (
    (status === PRFileStatus.Modified || status === PRFileStatus.Removed) && 
    INFRA_PATHS.some((p) => filename.includes(p))) {
    return {
      ruleId: "R011",
      severity: SeverityLevels.High,
      filename,
      message: "Infrastructure change detected",
    };
  }

  return null;
}

export const detectTestChanges = ({ filename, status }: CategorizerArg): Pattern | null => {
  if (status === PRFileStatus.Removed) {
    return {
      ruleId: "R012",
      severity: SeverityLevels.Medium,
      filename,
      message: "Test removal detected",
    };
  }

  return null;
}
