export const AUTH_PATTERNS = [
  "if (!user.hasPermission", 
  "if (user.isAdmin", 
  "hasPermission", 
  "permission validation",
];

export const PASSWORD_HASHING_PATTERNS = [
  "bcrypt", "bcryptjs", "argon2", "scrypt", "pbkdf2",
  "pbkdf2Sync(", "scryptSync("
];

export const CRYPTO_ALGO_PATTERNS = [
  "md5", "sha1", 
  "des", "3des",
  "ecb"
];

export const PROD_CONFIG_CHANGE_PATTERNS: readonly RegExp[] = [
  /\bNODE_ENV(?:\s*(?::|=(?!=))\s*|\s+)["'`]?prod(?:uction)?\b/i,
  /^\s*["']?(?:production|prod)["']?\s*:(?!:)/i,
  /\b(?:PROD|PRODUCTION)_[A-Z0-9_]+\s*(?::|=(?!=))/,
  /(?:^|\s)--prod(?:uction)?\b/,
];

const LOCATION_OBJECT = String.raw`(?:window|document|self|top)\.location`;
const SAFE_NAVIGATION_TARGET = String.raw`(["'\x60])(?:\/(?!\/)|\.\.?\/|[?#]|https?:\/\/)(?:(?!\$\{)[^"'\x60\\\n])*\1\s*(?:[;),]|\/\/|$)`;

export const UNSAFE_NAVIGATION_PATTERNS: readonly RegExp[] = [
  new RegExp(String.raw`(?<![\w.$])(?:${LOCATION_OBJECT}(?:\.href)?|location\.href)\s*=(?!=)(?!\s*${SAFE_NAVIGATION_TARGET})`),
  new RegExp(String.raw`(?<![\w.$])(?:${LOCATION_OBJECT}|location)\.(?:assign|replace)\s*\((?!\s*${SAFE_NAVIGATION_TARGET})`),
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
