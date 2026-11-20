import type { PatternCriteria, PatternDetail,  } from "@/types/diff/pattern";
import { SEVERITY_LEVELS } from "./patterns";

export type HighRiskPatterns = Record<PatternCriteria, Array<PatternDetail>>;

export const RULES: HighRiskPatterns = {
  AUTHENTICATION: [
    {
      pattern: "/auth/",
      ruleId: "A001",
      severity: SEVERITY_LEVELS.MEDIUM,
      description: "Authentication file modified",
    },
    {
      pattern: "/login/",
      ruleId: "A002",
      severity: SEVERITY_LEVELS.MEDIUM,
      description: "Login file modified",
    },
    {
      pattern: "/session/",
      ruleId: "A003",
      severity: SEVERITY_LEVELS.MEDIUM,
      description: "Session management file modified",
    },
  ],
  AUTHORIZATION: [
    {
      pattern: "/permission/",
      ruleId: "A004",
      severity: SEVERITY_LEVELS.MEDIUM,
      description: "Permission file modified",
    },
    {
      pattern: "/access-control/",
      ruleId: "A005",
      severity: SEVERITY_LEVELS.MEDIUM,
      description: "Access control file modified",
    },
    {
      pattern: "/rbac/",
      ruleId: "A006",
      severity: SEVERITY_LEVELS.MEDIUM,
      description: "RBAC file modified",
    },
  ],
  DATABASE: [
    {
      pattern: "/migration/",
      ruleId: "D001",
      severity: SEVERITY_LEVELS.MEDIUM,
      description: "Database migration modified",
    },
    {
      pattern: "/schema/",
      ruleId: "D002",
      severity: SEVERITY_LEVELS.MEDIUM,
      description: "Database schema modified",
    },
    {
      pattern: "/database/",
      ruleId: "D003",
      severity: SEVERITY_LEVELS.MEDIUM,
      description: "Database configuration modified",
    },
  ],
  SECURITY: [
    {
      pattern: "/security/",
      ruleId: "S001",
      severity: SEVERITY_LEVELS.MEDIUM,
      description: "Security file modified",
    },
    {
      pattern: "/crypto/",
      ruleId: "S002",
      severity: SEVERITY_LEVELS.MEDIUM,
      description: "Crypto file modified",
    },
    {
      pattern: "/encryption/",
      ruleId: "S003",
      severity: SEVERITY_LEVELS.MEDIUM,
      description: "Encryption file modified",
    },
  ],
  CONFIGURATION: [
    {
      pattern: ".env",
      ruleId: "C001",
      severity: SEVERITY_LEVELS.HIGH,
      description: ".env file modified",
    },
    {
      pattern: "*.config.*",
      ruleId: "C002",
      severity: SEVERITY_LEVELS.HIGH,
      description: "Configuration file modified",
    },
    {
      pattern: "Dockerfile",
      ruleId: "C003",
      severity: SEVERITY_LEVELS.HIGH,
      description: "Dockerfile modified",
    },
  ],
  DEPENDENCIES: [
    {
      pattern: "package.json",
      ruleId: "P001",
      severity: SEVERITY_LEVELS.LOW,
      description: "package.json modified",
    },
    {
      pattern: "package-lock.json",
      ruleId: "P002",
      severity: SEVERITY_LEVELS.LOW,
      description: "package-lock.json modified",
    },
    {
      pattern: ".npmrc",
      ruleId: "P003",
      severity: SEVERITY_LEVELS.LOW,
      description: ".npmrc modified",
    },
  ],
  CI_CD: [
    {
      pattern: ".github/workflows/**",
      ruleId: "I001",
      severity: SEVERITY_LEVELS.MEDIUM,
      description: "GitHub workflow modified",
    },
    {
      pattern: "Dockerfile",
      ruleId: "I002",
      severity: SEVERITY_LEVELS.MEDIUM,
      description: "Dockerfile modified",
    },
    {
      pattern: "docker-compose*",
      ruleId: "I003",
      severity: SEVERITY_LEVELS.MEDIUM,
      description: "docker-compose file modified",
    },
  ],
  INFRASTRUCTURE: [
    {
      pattern: "terraform/**",
      ruleId: "I004",
      severity: SEVERITY_LEVELS.MEDIUM,
      description: "Terraform file modified",
    },
    {
      pattern: "k8s/**",
      ruleId: "I005",
      severity: SEVERITY_LEVELS.MEDIUM,
      description: "Kubernetes file modified",
    },
    {
      pattern: "helm/**",
      ruleId: "I006",
      severity: SEVERITY_LEVELS.MEDIUM,
      description: "Helm file modified",
    },
  ],
};
