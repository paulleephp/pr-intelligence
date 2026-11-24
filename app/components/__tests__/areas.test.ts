/**
 * app/components/_lib/areas.ts: buildAffectedAreas groups files under the area their findings map
 * to (AREA_BY_RULE). Inputs go through the real engine (buildAnalysis), so each row also checks
 * that its file really produces the rule it stands for.
 */
import { describe, expect, it } from "vitest";
import { RISK_RULES, type RiskRuleId } from "@/lib/diff/util/risk-scoring";
import type { Pattern } from "@/lib/types/diff/pattern";
import type { ChangedFile, PRAnalysisResponse } from "@/lib/types/pr/metadata";
import { AREA_BY_RULE, buildAffectedAreas } from "../_lib/areas";
import { UNKNOWN_STATUS } from "../_lib/file-display";
import { buildAnalysis, FILES, UNSCANNED } from "./fixtures";

const file = (filename: string, overrides: Partial<ChangedFile> = {}): ChangedFile => ({
  filename,
  status: "modified",
  additions: 1,
  deletions: 0,
  patch: "@@ -1 +1 @@\n+x",
  ...overrides,
});

const areasOf = (files: ChangedFile[]) => buildAffectedAreas(buildAnalysis(files));
const ruleIdsOf = (files: ChangedFile[]) =>
  buildAnalysis(files).analysis.aggregate.findings.map((f) => f.ruleId);
const withFindings = (response: PRAnalysisResponse, findings: Pattern[]): PRAnalysisResponse => ({
  ...response,
  analysis: { ...response.analysis, aggregate: { ...response.analysis.aggregate, findings } },
});

/**
 * One file per area rule, each producing only that area rule. Expected severities come from
 * RISK_RULES: the rule tests pin each rule's severity, and these check it reaches the area list.
 */
const MAPPING: [RiskRuleId, string, string, ChangedFile][] = [
  ["R001", "auth", "Auth", file("src/auth/login.ts")],
  ["R003", "database", "Database", file("db/migrations/002_users.sql", { status: "added" })],
  ["R004", "database", "Database", UNSCANNED.deletedMigration],
  ["R006", "cicd", "CI/CD", FILES.medium],
  ["R009", "configuration", "Configuration", file("tsconfig.json")],
  [
    "R010",
    "tests",
    "Tests",
    file("src/__tests__/format.test.ts", {
      status: "removed",
      additions: 0,
      deletions: 12,
      patch: "",
    }),
  ],
  ["R011", "infrastructure", "Infrastructure", file("infra/main.tf")],
  ["R014", "security", "Security", file("src/security/policy.ts")],
];

// R002, R007, R012, R013, R015 and R016 have no area yet. Their mapping was taken back out on
// 2026-11-24 until the orchestrator settles the wording and scope, so they have no rows here.
describe("buildAffectedAreas", () => {
  it.each(MAPPING)("maps %s to %s", (ruleId, area, label, changed) => {
    expect(ruleIdsOf([changed])).toContain(ruleId);
    expect(areasOf([changed])).toEqual([
      {
        area,
        label,
        files: [
          {
            filename: changed.filename,
            status: changed.status,
            severity: RISK_RULES[ruleId].severity,
          },
        ],
      },
    ]);
  });

  it("has a row above for every rule in AREA_BY_RULE", () => {
    expect(MAPPING.map(([ruleId]) => ruleId).sort()).toEqual(Object.keys(AREA_BY_RULE).sort());
  });

  it("lists a file under every area it has a finding for", () => {
    const dockerfile = file("Dockerfile", { patch: "@@ -1 +1 @@\n+RUN npm ci" }); // R006 + R009

    expect(
      areasOf([dockerfile]).map(({ area, files }) => [area, files.map((f) => f.filename)]),
    ).toEqual([
      ["cicd", ["Dockerfile"]],
      ["configuration", ["Dockerfile"]],
    ]);
  });

  it("lists a file once in an area, even when two of its findings map there", () => {
    const dockerfile = file("Dockerfile", { patch: "@@ -1 +1 @@\n+ENV NODE_ENV=production" });

    expect(ruleIdsOf([dockerfile]).filter((id) => id === "R009")).toHaveLength(2); // path rule + content rule
    expect(
      areasOf([dockerfile]).find((group) => group.area === "configuration")?.files,
    ).toHaveLength(1);
  });

  // Changed 2026-11-24 (14ea6e0): a file's severity in an area comes from that area's findings
  // only. Before, every area showed the file's overall severity.
  it("lists a file in both auth/ and security/ under both, each with that area's severity", () => {
    const tokens = file("src/auth/security/tokens.ts"); // R001 medium + R014 high

    expect(
      areasOf([tokens]).map(({ area, files }) => [area, files.map((f) => f.severity)]),
    ).toEqual([
      ["auth", ["medium"]],
      ["security", ["high"]],
    ]);
  });

  it("leaves findings from rules outside the area out of the file's severity there", () => {
    const authHash = file("src/auth/hash.ts", { patch: "@@ -1 +1 @@\n+const d = md5(input);" }); // R001 medium + R012 high

    expect(areasOf([authHash]).find((group) => group.area === "auth")?.files).toEqual([
      { filename: "src/auth/hash.ts", status: "modified", severity: "medium" },
    ]);
  });

  // R003 and R004 can't both fire on one file, and no other area has two rules with different
  // severities, so the engine can't produce this yet. The second finding is added by hand.
  it.each(["before", "after"])(
    "keeps the highest severity when a lower finding in the same area comes %s it",
    (position) => {
      const analysis = buildAnalysis([UNSCANNED.deletedMigration]); // R004 high
      const lower: Pattern = {
        ruleId: "R003",
        severity: "medium",
        filename: UNSCANNED.deletedMigration.filename,
        message: "Database migration modified",
      };
      const { findings } = analysis.analysis.aggregate;

      expect(
        buildAffectedAreas(
          withFindings(
            analysis,
            position === "before" ? [lower, ...findings] : [...findings, lower],
          ),
        )[0].files,
      ).toEqual([{ filename: "db/migrations/001_init.sql", status: "removed", severity: "high" }]);
    },
  );

  it("shows status unknown for a finding on a file missing from changedFiles", () => {
    const analysis = { ...buildAnalysis([FILES.medium]), changedFiles: [] };

    expect(buildAffectedAreas(analysis)[0].files[0].status).toBe(UNKNOWN_STATUS);
  });

  it("orders areas auth, database, CI/CD, configuration, tests, infrastructure, security", () => {
    const oneEach = MAPPING.map(([, , , changed]) => changed).reverse();

    expect(areasOf(oneEach).map((group) => group.area)).toEqual([
      "auth",
      "database",
      "cicd",
      "configuration",
      "tests",
      "infrastructure",
      "security",
    ]);
  });

  it("sorts the files in an area by severity, then by name", () => {
    const deleted = { ...UNSCANNED.deletedMigration, filename: "db/migrations/009_old.sql" }; // R004 high
    const added = file("db/migrations/003_b.sql", { status: "added" }); // R003 medium
    const modified = file("db/migrations/002_a.sql"); // R003 medium
    const [database] = areasOf([added, modified, deleted]);

    expect(database.files.map((f) => [f.filename, f.severity])).toEqual([
      ["db/migrations/009_old.sql", "high"],
      ["db/migrations/002_a.sql", "medium"],
      ["db/migrations/003_b.sql", "medium"],
    ]);
  });

  it.each<[string, ChangedFile[]]>([
    ["a PR with no files", []],
    ["only a dependency change (R005 has no area, decided 2026-11-23)", [FILES.low]],
    ["no findings at all", [FILES.clean, UNSCANNED.binary, UNSCANNED.noPatch]],
    [
      "only an unchanged file in an auth folder",
      [{ ...UNSCANNED.unchanged, filename: "src/auth/same.ts" }],
    ],
  ])("returns no areas for %s", (_, files) => {
    expect(areasOf(files)).toEqual([]);
  });

  // SPRINT4.md "R018": not mapped to an Affected Area.
  it("returns no areas for a script whose only change is its mode (R018)", () => {
    const chmod = file("scripts/deploy.sh", { additions: 0, patch: "" });

    expect(ruleIdsOf([chmod])).toEqual(["R018"]);
    expect(areasOf([chmod])).toEqual([]);
  });
});
