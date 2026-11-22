export const AUTH_PATTERNS = [
  // Removal of authentication/authorization checks
  "if (!user.hasPermission", 
  "if (user.isAdmin", 
  "hasPermission", 
  "permission validation",
];

export const PASSWORD_HASHING_PATTERNS = [
  // Password hashing patterns - check for weak or deprecated algorithms
  "bcrypt", "bcryptjs", "argon2", "scrypt", "pbkdf2",
  "pbkdf2Sync(", "scryptSync("
];

export const CRYPTO_ALGO_PATTERNS = [
  // Crypto algorithm patterns - check for weak or deprecated algorithms
  "md5", "sha1", 
  "des", "3des",
  "ecb" // ECB mode is insecure without proper padding
];


export const PROD_CONFIG_CHANGE_PATTERNS = [
  "production",
  "prod",
  "NODE_ENV"
]

export const RISKY_API_PATTERNS: readonly RegExp[] = [
  /(?<![\w.])fetch\s*\(/i,
  /\bwindow\.fetch\s*\(/i,
  /\baxios(?:\.\w+)?\s*\(/i,
  /\bhttps?(?:\.\w+)?\s*\(/i,
  /\bgot(?:\.\w+)?\s*\(/i,
  /(?<![\w.])request\s*\(/i,
  /\bwindow\.location\b/i,
  /\bdocument\.createElement\b/i,
];

export const DANGEROUS_CODE_PATTERNS: readonly RegExp[] = [
  /\beval\s*\(/,
  /\bnew\s+Function\s*\(/,
  /\.(?:inner|outer)HTML\s*\+?=(?!=)/,
  /\bdangerouslySetInnerHTML\b/,
  /\bdocument\.write(?:ln)?\s*\(/,
  /\bchild_process\b/,
  /(?<![\w.])(?:exec|execSync|execFile|execFileSync|spawn|spawnSync)\s*\(/,
];
