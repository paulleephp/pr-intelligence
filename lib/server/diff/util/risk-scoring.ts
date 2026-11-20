export const RISK_RULES = {
  R001: {
    condition: "Authentication files modified",
    severity: "medium" as const,
  },
  R002: {
    condition: "Authentication check potentially removed",
    severity: "high" as const,
  },
  R003: {
    condition: "Database migration modified",
    severity: "medium" as const,
  },
  R004: {
    condition: "Database migration deleted",
    severity: "high" as const,
  },
  R005: {
    condition: "Dependencies added or upgraded",
    severity: "low" as const,
  },
  R006: {
    condition: "CI/CD workflow modified",
    severity: "medium" as const,
  },
  R007: {
    condition: "Private key/api key pattern detected",
    severity: "critical" as const,
  },
  R008: {
    condition: "More than 500 lines changed",
    severity: "medium" as const,
  },
  R009: {
    condition: "Production configuration modified",
    severity: "high" as const,
  },
  R010: {
    condition: "Test files removed",
    severity: "medium" as const,
  },
} as const;
