import type { CategorizerArg } from "@/types/diff/categorize";
import type { Pattern } from "@/types/diff/pattern";
import type { CategoryAnalysis } from "@/types/pr/metadata";
import { PRFileStatus } from "./constants/file";
import {
  AUTH_PATHS,
  CI_PATHS,
  CONFIG_FILE_PATTERNS,
  INFRA_PATHS,
  MIGRATION_PATHS,
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
const DELETED_STATUSES: readonly string[] = [PRFileStatus.Removed, PRFileStatus.Deleted];
const CHANGED_STATUSES: readonly string[] = [
  PRFileStatus.Added,
  ...MIGRATION_MODIFIED_STATUSES,
  ...DELETED_STATUSES,
];

const matchesAny = (filename: string, patterns: readonly RegExp[]): boolean =>
  patterns.some((pattern) => pattern.test(filename));

const isChanged = (status: string): boolean => CHANGED_STATUSES.includes(status);

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

export const detectConfigChanges = ({ filename, status }: CategorizerArg): Pattern | null =>
  isChanged(status) && matchesAny(getBasename(filename), CONFIG_FILE_PATTERNS)
    ? buildFinding("R009", filename, "Config change detected")
    : null;

export const detectAuthChanges = ({ filename, status }: CategorizerArg): Pattern | null =>
  isChanged(status) && matchesAny(filename, AUTH_PATHS)
    ? buildFinding("R001", filename, "Potential auth change detected")
    : null;

export const detectCIChanges = ({ filename, status }: CategorizerArg): Pattern | null =>
  isChanged(status) && matchesAny(filename, CI_PATHS)
    ? buildFinding("R006", filename, "CI change detected")
    : null;

export const detectSecurityChanges = ({ filename, status }: CategorizerArg): Pattern | null =>
  isChanged(status) && matchesAny(filename, SECURITY_PATHS)
    ? buildFinding("R014", filename, "Security change detected")
    : null;

export const detectInfraChanges = ({ filename, status }: CategorizerArg): Pattern | null =>
  isChanged(status) && matchesAny(filename, INFRA_PATHS)
    ? buildFinding("R011", filename, "Infrastructure change detected")
    : null;

export const detectTestChanges = ({ filename, status }: CategorizerArg): Pattern | null =>
  DELETED_STATUSES.includes(status) && matchesAny(filename, TEST_PATHS)
    ? buildFinding("R010", filename, "Test removal detected")
    : null;

export const detectMigrationChanges = ({ filename, status }: CategorizerArg): Pattern | null => {
  if (!matchesAny(filename, MIGRATION_PATHS)) {
    return null;
  }
  if (DELETED_STATUSES.includes(status)) {
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
