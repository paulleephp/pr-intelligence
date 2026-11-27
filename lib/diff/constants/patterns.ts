import type { PatternSeverity } from "@/types/diff/pattern";

export const SEVERITY_SCORES: Record<PatternSeverity, number> = {
  low: 10,
  medium: 25,
  high: 60,
  critical: 85,
};

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
  "ssh_private_key",
  "sshprivatekey",
  "ssh_key",
  "sshkey",
  "ssh_passphrase",
  "sshpassphrase",
  "private_key",
  "private.key",
];
