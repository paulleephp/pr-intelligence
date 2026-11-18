const AUTH_PATTERNS = [
  "if (!user.hasPermission",
  "user.hasPermission",
  "if (user.isAdmin",
  "hasPermission",
  "authorization",
  "auth check",
  "permission validation",
];

const MIGRATION_UPDATE_PATTERNS = [
  "migration",
  "schema",
  "database"
];

const PROD_CONFIG_CHANGE_PATTERNS = [
  "production",
  "prod",
  "NODE_ENV"
]

const TEST_FILE_REMOVAL = [
  ".test",
  ".spec"
]

const RISKY_API_PATTERNS = [
  "fetch(",
  "axios(",
  "http(",
  "request(",
  "window.location",
  "document.createElement",
]


// @NOTE given those patterns, do analysis like the
