export const AUTH_PATHS = [
  "/auth",
  "/login",
  "/session",
  "/permission",
  "/access-control",
  "/rbac",
];

export const CI_PATHS = [".github/workflows/", "dockerfile", "docker-compose"];

export const POTENTIAL_CONFIG_CHANGES = [
  ".env",
  ".config",
  "tsconfig.json",
  "dockerfile",
  "tsconfig",
  ".npmrc",
  "webpack.config",
];

export const SECURITY_PATHS = ["/security", "/crypto", "/encryption"];

export const INFRA_PATHS = ["terraform/", "k8s/", "helm/"];

export const TEST_PATHS = ["__tests__/", "/test/", "/tests/", ".test.", ".spec.", "e2e/"];

export const MIGRATION_PATHS = ["/migrations/", "/migration/", "/migrate/", "/alembic/versions/"];
