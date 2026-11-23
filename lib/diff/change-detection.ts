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

const GLOBAL_PREFIX = String.raw`(?:(?:window|self|globalThis)\.)?`;
const LOCATION_OWNER = String.raw`(?:window|document|self|top|parent|globalThis)`;
const LOCATION_OBJECT = String.raw`${GLOBAL_PREFIX}${LOCATION_OWNER}\.location`;
const NOT_A_PROPERTY = String.raw`(?<![\w.$])`;

// A navigation target that can't run script: one string literal that is the whole value
// and points to a relative path or an http(s) URL, e.g. "/login", "./next", "?page=2",
// "https://example.com". "//host", "javascript:…", `${…}` and concatenation don't match.
const QUOTE = String.raw`(["'\x60])`;
const SAFE_URL_START = String.raw`(?:\/(?!\/)|\.\.?\/|[?#]|https?:\/\/)`;
const LITERAL_BODY = String.raw`(?:(?!\$\{)[^"'\x60\\\n])*`;
const CLOSING_QUOTE = String.raw`\1`;
const END_OF_VALUE = String.raw`\s*(?:[;),]|\/\/|$)`;
const SAFE_NAVIGATION_TARGET = `${QUOTE}${SAFE_URL_START}${LITERAL_BODY}${CLOSING_QUOTE}${END_OF_VALUE}`;
const UNSAFE_VALUE = String.raw`(?!\s*${SAFE_NAVIGATION_TARGET})`;

const LOCATION_ASSIGNMENT = new RegExp(
  String.raw`${NOT_A_PROPERTY}(?:${LOCATION_OBJECT}(?:\.href)?|location\.href)\s*=(?!=)${UNSAFE_VALUE}`,
);
const LOCATION_NAVIGATE_CALL = new RegExp(
  String.raw`${NOT_A_PROPERTY}(?:${LOCATION_OBJECT}|location)\.(?:assign|replace)\s*\(${UNSAFE_VALUE}`,
);

export const UNSAFE_NAVIGATION_PATTERNS: readonly RegExp[] = [LOCATION_ASSIGNMENT, LOCATION_NAVIGATE_CALL];

export const DANGEROUS_CODE_PATTERNS: readonly RegExp[] = [
  /\beval\s*\(/,
  /\bnew\s+Function\s*\(/,
  /\.(?:inner|outer)HTML\s*\+?=(?!=)/,
  /\bdangerouslySetInnerHTML\b/,
  /\bdocument\.write(?:ln)?\s*\(/,
  /\bchild_process\b/,
  /(?<![\w.])(?:exec|execSync|execFile|execFileSync|spawn|spawnSync)\s*\(/,
];
