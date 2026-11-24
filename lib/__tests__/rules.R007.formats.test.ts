/**
 * R007 - secrets: what counts as a secret (well-known variable names, token values, private key
 * headers) and how findings are de-duplicated. Code: lib/diff/secret.ts and
 * lib/diff/constants/secret.ts. The rest of R007 is in rules.R007.*.test.ts.
 */
import { describe, expect, it } from "vitest";
import { analyzeDiff } from "@/lib/diff/core";
import { getSecretsReport } from "@/lib/diff/secret";
import { parsePatch } from "@/lib/diff/util/parse-patch";
import { FAKE, file, secretFindings } from "./fixtures/rules";

describe("R007 - secret de-duplication", () => {
  const secrets = (patch: string) => {
    const r = getSecretsReport({
      hunks: parsePatch(`@@ -1 +1 @@\n${patch}`),
      filename: "src/a.ts",
    });
    return [r.secret, r.apiKey, r.password, r.ssh].filter((p) => p !== null);
  };

  it("reports a single added line once, even if several secret scans match it", () => {
    const findings = secrets('+const github_token = "abc";');

    expect(findings).toHaveLength(1);
    expect(findings[0]).toMatchObject({ ruleId: "R007", severity: "critical" });
  });

  it("still reports separate lines that match different scans", () => {
    expect(secrets('+const github_token = "abc";\n+const db_password = "hunter2";')).toHaveLength(
      2,
    );
  });

  it("counts one finding for one secret line in the aggregate", () => {
    const { aggregate } = analyzeDiff([
      file({ filename: "src/config.ts", patch: '@@ -1 +1 @@\n+const github_token = "abc";' }),
    ]);

    expect(aggregate.totalFindings).toBe(1);
    expect(aggregate.severityCounts.critical).toBe(1);
  });
});

describe("R007 - secret formats", () => {
  describe("well-known variable names", () => {
    it.each([
      ["AWS_SECRET_ACCESS_KEY", `AWS_SECRET_ACCESS_KEY=${FAKE.awsSecret}`, "AWS_SECRET"],
      [
        "AWS_ACCESS_KEY_ID (19-char value, so only the name matches)",
        "AWS_ACCESS_KEY_ID=AKIAIOSFODNN7XAMPL3",
        "AWS_ACCESS_KEY",
      ],
      ["SLACK_BOT_TOKEN with no value", "SLACK_BOT_TOKEN=", "SLACK_TOKEN"],
      ["SLACK_BOT_TOKEN with a token", `SLACK_BOT_TOKEN=${FAKE.slackBot}`, "SLACK_TOKEN"],
      ["STRIPE_SECRET_KEY", `STRIPE_SECRET_KEY=${FAKE.stripeLive}`, "STRIPE_SECRET"],
      ["JWT_SECRET_KEY", "JWT_SECRET_KEY=s3cr3tvalue", "JWT_SECRET"],
      [
        "github_token inside an object literal",
        "const latestToken = { github_token: 'ghp_abc' }",
        "GITHUB_TOKEN",
      ],
    ])("flags %s", (_, line, name) => {
      const findings = secretFindings(line, "deploy/app.env");

      expect(findings).toHaveLength(1);
      expect(findings[0]).toMatchObject({
        severity: "critical",
        message: expect.stringContaining(name),
      });
    });
  });

  describe("token values with no telltale variable name", () => {
    it.each([
      ["AWS access key (AKIA)", FAKE.awsAccessKey, "AWS_ACCESS_KEY"],
      ["AWS temporary key (ASIA)", FAKE.awsSessionKey, "AWS_ACCESS_KEY"],
      ["GitHub classic token (ghp_)", FAKE.ghp, "GITHUB_TOKEN"],
      ["GitHub fine-grained token (github_pat_)", FAKE.githubPat, "GITHUB_TOKEN"],
      ["Slack bot token (xoxb-)", FAKE.slackBot, "SLACK_TOKEN"],
      ["Stripe live key (sk_live_)", FAKE.stripeLive, "STRIPE_SECRET"],
    ])("flags a bare %s", (_, value, name) => {
      const findings = secretFindings(`const k = "${value}";`);

      expect(findings).toHaveLength(1);
      expect(findings[0].message).toContain(name);
    });

    it("does not flag an AKIA string that is too short to be an AWS key", () => {
      expect(secretFindings('const k = "AKIAIOSFODNN7XAMPL3";')).toEqual([]);
    });

    it("flags a token value even on a line with a low-risk word", () => {
      expect(secretFindings(`const testToken = "${FAKE.ghp}"; // test`)).toHaveLength(1);
    });
  });

  describe("private key headers", () => {
    it.each(["RSA ", "", "EC ", "OPENSSH ", "DSA ", "ENCRYPTED "])(
      "flags -----BEGIN %sPRIVATE KEY-----",
      (kind) => {
        const findings = secretFindings(FAKE.privateKey(kind), "keys/id.pem");

        expect(findings).toHaveLength(1);
        expect(findings[0].message).toContain("PRIVATE_KEY");
      },
    );

    it("does not flag a public key header", () => {
      expect(secretFindings("-----BEGIN PUBLIC KEY-----", "keys/id.pub")).toEqual([]);
    });
  });
});
