export const AUTH_PATTERNS = [
  // Removal of authentication/authorization checks
  "if (!user.hasPermission", 
  "if (user.isAdmin", 
  "hasPermission", 
  "authorization", 
  "auth check", 
  "permission validation",
];

export const PASSWORD_HASHING_PATTERNS = [
  // Password hashing patterns - check for weak or deprecated algorithms
  "bcrypt", "bcryptjs", "argon2", "scrypt", "pbkdf2",
  ".hash(", "hashSync(", "pbkdf2Sync(", "scryptSync("
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

export const RISKY_API_PATTERNS = [
  "fetch(",
  "axios(",
  "http(",
  "request(",
  "window.location",
  "document.createElement",
]
