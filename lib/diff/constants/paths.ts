const SEGMENT_END = String.raw`(?=[/._-]|$)`;

const segment = (names: string): RegExp => new RegExp(String.raw`/(?:${names})${SEGMENT_END}`);
const directory = (names: string): RegExp => new RegExp(String.raw`/(?:${names})/`);

export const AUTH_PATHS: readonly RegExp[] = [
  segment(
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

export const SECURITY_PATHS: readonly RegExp[] = [segment("security|crypto|encryption")];

export const INFRA_PATHS: readonly RegExp[] = [directory("terraform|k8s|kubernetes|helm"), /\.tf$/];

export const TEST_PATHS: readonly RegExp[] = [
  directory("__tests__|tests?|e2e|fixtures?"),
  /\.(?:test|spec)\.[\w]+$/,
];

export const TEST_FILE_PATTERNS: readonly RegExp[] = [
  /\.(?:test|spec)\.[^/]+$/i,
  /(?:^|\/)(?:__tests__|tests?|e2e)\//i,
];

export const MIGRATION_PATHS: readonly RegExp[] = [directory("migrations?")];
