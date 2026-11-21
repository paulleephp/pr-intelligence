const VERSION_SPEC = String.raw`[\^~><=]*\d+\.\d+[\w.+-]*`;
const PIP_OPERATOR = "(?:==|>=|<=|~=|!=|<|>)";

export const DEPENDENCY_LINE_PATTERNS: readonly RegExp[] = [
  new RegExp(String.raw`^\s*"((?:@[\w.-]+\/)?[\w.-]+)"\s*:\s*"${VERSION_SPEC}"\s*,?\s*$`),
  new RegExp(
    String.raw`^\s*([a-z0-9][\w.-]*)(?:\[[\w,-]+\])?\s*${PIP_OPERATOR}\s*\d[\w.*]*(?:\s*,\s*${PIP_OPERATOR}\s*\d[\w.*]*)*\s*(?:;.*)?(?:#.*)?$`,
    "i",
  ),
  /^\s*(?:require\s+)?([\w.-]+\.[a-z]{2,}\/[\w./-]+)\s+v\d+\.\d+\.\d+/,
  new RegExp(String.raw`^\s*([\w-]+)\s*=\s*(?:"${VERSION_SPEC}"|\{[^}]*\bversion\s*=)`),
  /^\s*gem\s+['"]([\w-]+)['"]/,
  /^\s*(?:implementation|api|compileOnly|runtimeOnly|testImplementation)\s*\(?\s*['"]([\w.-]+:[\w.-]+):[\w.$-]+['"]/,
];

export const IGNORED_DEPENDENCY_KEYS: readonly string[] = ["version", "node", "npm"];
