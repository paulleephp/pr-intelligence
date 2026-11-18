import type { PatternSeverity } from "@/types/diff/pattern";

export const SEVERITY_SCORES: Record<PatternSeverity, number> = {
  low: 10,
  medium: 25,
  high: 60,
  critical: 85,
};

//@ move to frontend constant?
export const SEVERITY_LABELS: Record<PatternSeverity, string> = {
  low: "Low Risk",
  medium: "Medium Risk",
  high: "High Risk",
  critical: "Critical Risk",
} as const;

export enum SEVERITY_LEVELS {
  LOW = "low",
  MEDIUM = "medium",
  HIGH = "high",
}

export const HIGH_PRIORITY_FILES: Array<string> = [
  "package.json",
  "package-lock.json",
  ".npmrc",
  ".env",
  "tsconfig.json",
  "Dockerfile",
  "docker-compose.yml",
  "webpack.config.js",
] as const;

export const LOW_RISK_PATTERNS = ["TODO", "FIXME", "EXAMPLE", "DEMO", "MOCK", "TEST"];

export const API_KEY_PATTERNS = [
  "api_key",
  "apikey",
  "api.key",
  "github_token",
  "github.token",
  "apisecret",
  "api_secret",
  "api.secret",
];

export const PASSWORD_PATTERNS = [
  "password",
  "db_password",
  "db.password",
  "database_password",
  "database.password",
  "secret_key",
  "secret.key",
];

export const SSH_PATTERNS = [
  "ssh",
  "private_key",
  "private.key",
  "openssh",
  "ssh-rsa",
  "ssh-ed25519",
];
