import type { CategorizerArg } from "@/types/diff/categorize";
import type { Pattern } from "@/types/diff/pattern";
import type { CategoryAnalysis } from "../types/pr/metadata";
import { PRFileStatus } from "./constants/file";
import {
  AUTH_PATHS,
  CI_PATHS,
  INFRA_PATHS,
  MIGRATION_PATHS,
  POTENTIAL_CONFIG_CHANGES,
  SECURITY_PATHS,
  TEST_PATHS,
} from "./constants/paths";
import { RISK_RULES, type RiskRuleId } from "./util/risk-scoring";

const buildFinding = (ruleId: RiskRuleId, filename: string, message: string): Pattern => ({
  ruleId,
  severity: RISK_RULES[ruleId].severity,
  filename,
  message,
});

const getBasename = (filename: string): string => filename.split("/").pop() ?? filename;

const MIGRATION_MODIFIED_STATUSES: readonly string[] = [
  PRFileStatus.Modified,
  PRFileStatus.Renamed,
  PRFileStatus.Changed,
];
const MIGRATION_DELETED_STATUSES: readonly string[] = [PRFileStatus.Removed, PRFileStatus.Deleted];

export const getCategoryReport = ({
  filename: rawFilename,
  status,
}: CategorizerArg): CategoryAnalysis => {
  const filename = `/${rawFilename.toLowerCase()}`;

  const detections = [
    detectConfigChanges({ filename, status }),
    detectAuthChanges({ filename, status }),
    detectCIChanges({ filename, status }),
    detectSecurityChanges({ filename, status }),
    detectInfraChanges({ filename, status }),
    detectTestChanges({ filename, status }),
    detectMigrationChanges({ filename, status }),
  ];

  const category: Pattern[] = detections
    .filter((d): d is Pattern => !!d)
    .map((d) => ({ ...d, filename: rawFilename }));

  return {
    filename: rawFilename,
    category,
  };
};

export const detectConfigChanges = ({ filename, status }: CategorizerArg): Pattern | null => {
  if (
    (status === PRFileStatus.Modified || status === PRFileStatus.Removed) &&
    POTENTIAL_CONFIG_CHANGES.includes(getBasename(filename))
  ) {
    return buildFinding("R009", filename, "Config change detected");
  }

  return null;
};

export const detectAuthChanges = ({ filename, status }: CategorizerArg): Pattern | null => {
  if (
    (status === PRFileStatus.Modified || status === PRFileStatus.Removed) &&
    AUTH_PATHS.some((p) => filename.includes(p))
  ) {
    return buildFinding("R001", filename, "Potential auth change detected");
  }

  return null;
};

export const detectCIChanges = ({ filename, status }: CategorizerArg): Pattern | null => {
  if (status === PRFileStatus.Modified && CI_PATHS.some((p) => filename.includes(p))) {
    return buildFinding("R006", filename, "CI change detected");
  }

  return null;
};

export const detectSecurityChanges = ({ filename, status }: CategorizerArg): Pattern | null => {
  if (
    (status === PRFileStatus.Modified || status === PRFileStatus.Removed) &&
    SECURITY_PATHS.some((p) => filename.includes(p))
  ) {
    return buildFinding("R014", filename, "Security change detected");
  }

  return null;
};

export const detectInfraChanges = ({ filename, status }: CategorizerArg): Pattern | null => {
  if (
    (status === PRFileStatus.Modified || status === PRFileStatus.Removed) &&
    INFRA_PATHS.some((p) => filename.includes(p))
  ) {
    return buildFinding("R011", filename, "Infrastructure change detected");
  }

  return null;
};

export const detectTestChanges = ({ filename, status }: CategorizerArg): Pattern | null => {
  if (status === PRFileStatus.Removed && TEST_PATHS.some((p) => filename.includes(p))) {
    return buildFinding("R010", filename, "Test removal detected");
  }

  return null;
};

export const detectMigrationChanges = ({ filename, status }: CategorizerArg): Pattern | null => {
  if (!MIGRATION_PATHS.some((p) => filename.includes(p))) {
    return null;
  }
  if (MIGRATION_DELETED_STATUSES.includes(status)) {
    return buildFinding("R004", filename, "Database migration deleted");
  }
  if (status === PRFileStatus.Added) {
    return buildFinding("R003", filename, "Database migration added");
  }
  if (MIGRATION_MODIFIED_STATUSES.includes(status)) {
    return buildFinding("R003", filename, "Database migration modified");
  }

  return null;
};
