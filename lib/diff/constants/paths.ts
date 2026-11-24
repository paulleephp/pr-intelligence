const KEYWORD_END = String.raw`(?=[/._\-0-9]|$|(?<=[a-z])[A-Z])`;

const anyCase = (names: string): string =>
  names.replace(/[a-z]/g, (letter) => `[${letter}${letter.toUpperCase()}]`);

const keywordSegment = (names: string): RegExp =>
  new RegExp(String.raw`/(?:${anyCase(names)})${KEYWORD_END}`);
const directory = (names: string): RegExp => new RegExp(String.raw`/(?:${names})/`);

export const AUTH_PATHS: readonly RegExp[] = [
  keywordSegment(
    "auth|authn|authz|authentication|authorization|oauth|sso|login|logout|sessions?|permissions?|access-control|rbac",
  ),
];

export const CI_PATHS: readonly RegExp[] = [
  /\/\.github\/workflows\//,
  /\/\.gitlab-ci\.ya?ml$/,
  /\/\.circleci\//,
  /\/jenkinsfile$/,
  /\/dockerfile(?:\.[\w-]+)?$/,
  /\/docker-compose(?:\.[\w-]+)?\.ya?ml$/,
];

export const CONFIG_FILE_PATTERNS: readonly RegExp[] = [
  /^\.env(?:\.[\w-]+)?$/,
  /^tsconfig(?:\.[\w-]+)?\.json$/,
  /^webpack\.config\.[cm]?[jt]s$/,
  /^next\.config\.[cm]?[jt]s$/,
  /^dockerfile(?:\.[\w-]+)?$/,
  /^\.npmrc$/,
];

export const SECURITY_PATHS: readonly RegExp[] = [
  keywordSegment("security|cryptography|crypto|encryption"),
];

export const INFRA_PATHS: readonly RegExp[] = [
  directory("terraform|k8s|kubernetes|helm"),
  /\.(?:tf|tfvars|tf\.json)$/,
  /\/charts\/[^/]+\/(?:chart\.yaml|values[^/]*\.ya?ml|templates\/.+\.(?:ya?ml|tpl|txt))$/,
];

export const TEST_PATHS: readonly RegExp[] = [
  directory("__tests__|tests?|e2e|fixtures?"),
  /\.(?:test|spec)\.[\w]+$/,
];

export const TEST_FILE_PATTERNS: readonly RegExp[] = [
  /\.(?:test|spec)\.[^/]+$/i,
  /(?:^|\/)(?:__tests__|tests?|e2e)\//i,
];

export const MIGRATION_PATHS: readonly RegExp[] = [directory("migrations?")];
