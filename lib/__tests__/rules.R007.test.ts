/** R007 - secrets (lib/diff/secret.ts, lib/diff/constants/secret.ts). */
import { describe, expect, it } from "vitest";
import { analyzeDiff } from "@/lib/diff/core";
import { getSecretsReport } from "@/lib/diff/secret";
import { parsePatch } from "@/lib/diff/util/parse-patch";
import { codeRuleIds, FAKE, file, FIXTURE_PATHS, secretFindings } from "./fixtures/rules";

describe("R007 - secret de-duplication", () => {
  const secrets = (patch: string) => {
    const r = getSecretsReport({ hunks: parsePatch(`@@ -1 +1 @@\n${patch}`), filename: "src/a.ts" });
    return [r.secret, r.apiKey, r.password, r.ssh].filter((p) => p !== null);
  };

  it("reports a single added line once, even if several secret scans match it", () => {
    const findings = secrets('+const github_token = "abc";');

    expect(findings).toHaveLength(1);
    expect(findings[0]).toMatchObject({ ruleId: "R007", severity: "critical" });
  });

  it("still reports separate lines that match different scans", () => {
    expect(secrets('+const github_token = "abc";\n+const db_password = "hunter2";')).toHaveLength(2);
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
      ["AWS_ACCESS_KEY_ID (19-char value, so only the name matches)", "AWS_ACCESS_KEY_ID=AKIAIOSFODNN7XAMPL3", "AWS_ACCESS_KEY"],
      ["SLACK_BOT_TOKEN with no value", "SLACK_BOT_TOKEN=", "SLACK_TOKEN"],
      ["SLACK_BOT_TOKEN with a token", `SLACK_BOT_TOKEN=${FAKE.slackBot}`, "SLACK_TOKEN"],
      ["STRIPE_SECRET_KEY", `STRIPE_SECRET_KEY=${FAKE.stripeLive}`, "STRIPE_SECRET"],
      ["JWT_SECRET_KEY", "JWT_SECRET_KEY=s3cr3tvalue", "JWT_SECRET"],
      ["github_token inside an object literal", "const latestToken = { github_token: 'ghp_abc' }", "GITHUB_TOKEN"],
    ])("flags %s", (_, line, name) => {
      const findings = secretFindings(line, "deploy/app.env");

      expect(findings).toHaveLength(1);
      expect(findings[0]).toMatchObject({ severity: "critical", message: expect.stringContaining(name) });
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
    it.each(["RSA ", "", "EC ", "OPENSSH ", "DSA ", "ENCRYPTED "])("flags -----BEGIN %sPRIVATE KEY-----", (kind) => {
      const findings = secretFindings(FAKE.privateKey(kind), "keys/id.pem");

      expect(findings).toHaveLength(1);
      expect(findings[0].message).toContain("PRIVATE_KEY");
    });

    it("does not flag a public key header", () => {
      expect(secretFindings("-----BEGIN PUBLIC KEY-----", "keys/id.pub")).toEqual([]);
    });
  });
});

describe("R007 - low-risk line filter (test / mock / demo / example / todo / fixme)", () => {
  describe("only whole words count, not substrings", () => {
    it.each([
      ["latestToken (contains 'test')", "const latestToken = { github_token: 'abc' }"],
      ["contestApiKey (contains 'test')", 'const contestApiKey = "abc123def456";'],
      ["attestation_api_key (contains 'test')", 'attestation_api_key = "abc123def456"'],
      ["demographics_password (contains 'demo')", 'demographics_password = "hunter2"'],
    ])("still flags %s", (_, line) => {
      expect(secretFindings(line)).toHaveLength(1);
    });
  });

  describe("placeholder values are still skipped", () => {
    it.each([
      ['password = "test"'],
      ['api_key = "example"'],
      ['github_token = "mock"'],
      ["db_password: demo"],
      ['mock_api_key = "abc123"'],
    ])("skips %s", (line) => {
      expect(secretFindings(line)).toEqual([]);
    });
  });

  // The filter only looks at the code before a trailing comment (lib/diff/util/strip-comment.ts).
  it.each([
    ['password = "hunter2" // TODO rotate'],
    ['api_key = "a1b2c3d4e5f6" // FIXME move to env'],
    ['db_password = "Pr0dPa55!" # demo account'],
  ])("flags a real secret with a low-risk word only in a comment: %s", (line) => {
    expect(secretFindings(line)).toHaveLength(1);
  });

  it("flags a generic *_secret assignment such as attestation_secret", () => {
    expect(secretFindings("attestation_secret: abc123def456", "config/app.yml")).toHaveLength(1);
  });
});

describe("R007 - catch-all *_secret rule (GENERIC_SECRET)", () => {
  it.each([
    ['client_secret = "abcd1234"'],
    ['webhook.secret = "whsec_1234"'],
    ['secret = "abcd"'],
    ["secret: 'abcd1234',"],
    ["secret = `abcd1234`"],
  ])("flags a quoted value in code: %s", (line) => {
    const findings = secretFindings(line);

    expect(findings).toHaveLength(1);
    expect(findings[0]).toMatchObject({ severity: "critical", message: expect.stringContaining("SECRET") });
  });

  // Unquoted values are normal in config files, so they count as literals there.
  it.each([
    ["config/app.env", "CLIENT_SECRET=abcd1234"],
    ["config/app.env", "CLIENT_SECRET=abcd1234 # rotate"],
    ["config/app.yml", "attestation_secret: abc123def456"],
    ["config/app.yml", "  client_secret: abcd1234"],
    ["config/secrets.yaml", "secret_key_base: abcd1234"],
  ])("flags an unquoted value in %s: %s", (filename, line) => {
    expect(secretFindings(line, filename)).toHaveLength(1);
  });

  // Regression: in a code file an unquoted value is a variable, not a literal. These used to be
  // flagged as critical secrets.
  it.each([
    ["src/oauth.ts", "const params = { client_id: clientId, client_secret: clientSecret };"],
    ["src/oauth.ts", "  client_secret: clientSecret,"],
    ["src/client.ts", "this.client_secret = client_secret;"],
    ["src/a.js", "const secret = token;"],
  ])("does not flag a variable passed as the value in %s: %s", (filename, line) => {
    expect(secretFindings(line, filename)).toEqual([]);
  });

  describe("which files allow unquoted values", () => {
    const BARE = "CLIENT_SECRET=abcd1234";

    it.each([
      ".env",
      ".env.production",
      "deploy/.env.local",
      "config/prod.env",
      "config/app.yml",
      "config/app.yaml",
      "setup.ini",
      "pyproject.toml",
      "nginx/site.conf",
      "setup.cfg",
      "infra/prod.tfvars",
      "Config/App.YML",
    ])("flags an unquoted value in %s", (filename) => {
      expect(secretFindings(BARE, filename)).toHaveLength(1);
    });

    it.each(["src/a.ts", "src/a.tsx", "src/a.js", "src/env.ts", "src/yml.ts"])(
      "does not flag an unquoted value in %s",
      (filename) => {
        expect(secretFindings(BARE, filename)).toEqual([]);
      },
    );

    it.each(["src/a.ts", "src/a.js", "config/app.json"])("still flags a quoted value in %s", (filename) => {
      expect(secretFindings('"client_secret": "abcd1234"', filename)).toHaveLength(1);
    });

    it.each([
      ["an env lookup", "CLIENT_SECRET: ${VAULT_SECRET}"],
      ["a dotted reference", "client_secret: settings.oauth.secret"],
      ["a value shorter than 4 characters", "CLIENT_SECRET=abc"],
      ["an empty value", "CLIENT_SECRET="],
      ["a boolean", "use_secret: true"],
    ])("does not flag %s in a config file", (_, line) => {
      expect(secretFindings(line, "config/app.yml")).toEqual([]);
    });
  });

  // Decision (2026-11-22): Dockerfiles also allow unquoted values.
  describe("Dockerfile", () => {
    it.each([
      ["Dockerfile", "ENV CLIENT_SECRET=abcd1234"],
      ["Dockerfile", "ARG CLIENT_SECRET=abcd1234"],
      ["Dockerfile.prod", "ENV CLIENT_SECRET=abcd1234"],
      ["docker/Dockerfile.dev", "ENV CLIENT_SECRET=abcd1234"],
    ])("flags an unquoted value in %s: %s", (filename, line) => {
      expect(secretFindings(line, filename)).toHaveLength(1);
    });

    // Unquoted values are allowed here, so a value read from a variable must not count.
    it.each([
      ["Dockerfile", "ENV CLIENT_SECRET=${CLIENT_SECRET}"],
      ["Dockerfile", "ENV CLIENT_SECRET=$CLIENT_SECRET"],
      ["Dockerfile", "ARG CLIENT_SECRET"],
    ])("does not flag a value read from elsewhere in %s: %s", (filename, line) => {
      expect(secretFindings(line, filename)).toEqual([]);
    });
  });

  it.each(["docs/dockerfile-guide.md", "src/envrc.ts", "src/dockerfile.ts"])(
    "keeps lookalike filename %s quotes-only",
    (filename) => {
      expect(secretFindings("CLIENT_SECRET=abcd1234", filename)).toEqual([]);
    },
  );

  // Regression: plain `$VAR` (not only `${VAR}`) is a reference in config files. It used to be
  // flagged as critical (Docker Compose and .env files use $VAR).
  it.each([
    ["docker-compose.yml", "      CLIENT_SECRET: $VAULT_SECRET"],
    ["docker-compose.yml", '      CLIENT_SECRET: "$VAULT_SECRET"'],
    ["config/app.env", "CLIENT_SECRET=$VAULT_SECRET"],
  ])("does not flag a $VAR value in %s: %s", (filename, line) => {
    expect(secretFindings(line, filename)).toEqual([]);
  });

  // Decision (2026-11-22, confirmed again after the shell kind was removed): shell scripts and
  // .envrc (direnv) are config/deploy files of a JS/TS repo, so they stay in scope for secrets.
  describe("shell scripts and .envrc", () => {
    // Regression: the shell file kind was briefly removed, so these files were checked like JS/TS
    // code. Unquoted secrets were missed, and `"$VAR"` / backtick values were flagged as critical.
    it.each([
      ["scripts/deploy.sh", "export CLIENT_SECRET=abcd1234"],
      ["scripts/deploy.sh", "CLIENT_SECRET=abcd1234"],
      ["scripts/deploy.bash", "CLIENT_SECRET=abcd1234"],
      ["scripts/deploy.zsh", "CLIENT_SECRET=abcd1234"],
      [".envrc", "export CLIENT_SECRET=abcd1234"],
      [".envrc", "CLIENT_SECRET=abcd1234"],
      ["services/api/.envrc", "export CLIENT_SECRET=abcd1234"],
    ])("flags an unquoted value in %s: %s", (filename, line) => {
      expect(secretFindings(line, filename)).toHaveLength(1);
    });

    it.each([
      ["scripts/deploy.sh", 'export CLIENT_SECRET="$VAULT_SECRET"'],
      [".envrc", "export CLIENT_SECRET=`vault read -field=value secret/app`"],
      ["scripts/deploy.sh", "export CLIENT_SECRET=`cat /run/secrets/client`"],
    ])("does not flag a value read from a variable or command in %s: %s", (filename, line) => {
      expect(secretFindings(line, filename)).toEqual([]);
    });

    // Unquoted values are flagged here, so an unquoted reference must not count.
    it.each([
      ["scripts/deploy.sh", "export CLIENT_SECRET=$VAULT_SECRET"],
      [".envrc", "export CLIENT_SECRET=$VAULT_CLIENT_SECRET"],
      [".envrc", "export CLIENT_SECRET=$(vault read -field=value secret/app)"],
      [".envrc", "export CLIENT_SECRET=${VAULT_CLIENT_SECRET}"],
    ])("does not flag an unquoted reference in %s: %s", (filename, line) => {
      expect(secretFindings(line, filename)).toEqual([]);
    });
  });

  // Regression: in JS/TS a `$` inside quotes is plain text (only `${...}` reads a variable), so a
  // secret starting with `$` is a literal. The `$VAR` exclusion briefly applied here too and missed it.
  it.each([
    ["src/a.ts", 'const client_secret = "$uperS3cretValue";'],
    ["src/a.js", "const client_secret = '$uperS3cretValue';"],
    ["src/config.ts", '  client_secret: "$uperS3cretValue",'],
  ])("flags a quoted literal starting with $ in %s: %s", (filename, line) => {
    expect(secretFindings(line, filename)).toHaveLength(1);
  });

  it.each([
    ["jwt_secret", 'jwt_secret = "abcd1234"', "JWT_SECRET"],
    ["aws_secret", 'aws_secret = "abcd1234"', "AWS_SECRET"],
  ])("lets the specific rule name %s win over GENERIC_SECRET", (_, line, name) => {
    expect(secretFindings(line)[0].message).toContain(name);
  });

  describe("does not flag", () => {
    it.each([
      ["a value shorter than 4 characters", 'secret = "abc"'],
      ["an empty value", 'secret = ""'],
      ["an env lookup (process.env)", "secret: process.env.X"],
      ["a template variable", "secret: ${VAR}"],
      ["true", "secret: true"],
      ["null", "secret: null"],
      ["a TypeScript primitive annotation", "secret: string"],
      ["an optional TypeScript annotation", "secret?: string;"],
      ["a camelCase boolean", "isSecret = true"],
      ["a longer word starting with secret", 'secretary: "Jane Doe"'],
      ["a comparison", 'if (secret == "abcd") {}'],
    ])("%s", (_, line) => {
      expect(secretFindings(line)).toEqual([]);
    });
  });

  // Regression: a bare value used to count as a literal, so function calls and `await` matched.
  it.each([
    ["const secret = getSecret();"],
    ['const client_secret = await vault.read("app");'],
    ["webhook.secret = loadSecret(config);"],
    ["const secret = new Vault();"],
    ["client_secret: config.oauth.secret,"],
    ["secret: `${prefix}-abcd`"],
  ])("does not flag a secret read from code: %s", (line) => {
    expect(secretFindings(line)).toEqual([]);
  });
});

describe("R007 - low-risk filter and trailing comments", () => {
  it("still skips a line that is entirely a comment", () => {
    expect(secretFindings('// TODO: client_secret = "abcd1234"')).toEqual([]);
  });

  it("still skips a low-risk word in the code part", () => {
    expect(secretFindings('const mock_secret = "abcd1234"; // real one is in vault')).toEqual([]);
  });

  it("flags a secret whose only low-risk word is in a trailing comment", () => {
    expect(secretFindings('client_secret = "abcd1234" // test fixture')).toHaveLength(1);
  });

  it("does not mistake a quoted # for a comment", () => {
    expect(secretFindings('api_key = "abc#123def" # demo')).toHaveLength(1);
  });
});

// Decisions (2026-11-22): secrets in test paths are fine, because fixtures and tests hold many mock
// keys. Fixture folders (fixture/ or fixtures/, anywhere) count as test paths.
describe("R007 - test paths are ignored", () => {
  it.each([
    "src/__tests__/client.test.ts",
    "test/fixtures.ts",
    "tests/helpers/keys.ts",
    "e2e/login.ts",
    "src/api.test.ts",
    "src/api.spec.tsx",
    ...FIXTURE_PATHS,
  ])("does not report secrets in %s", (filename) => {
    expect(secretFindings(`const t = "${FAKE.ghp}"; const github_token = "abc";`, filename)).toEqual([]);
  });

  // A "test" comment doesn't hide a secret, but a test path does.
  it.each(["src/__tests__/client.test.ts", "src/fixtures/keys.ts"])(
    'does not report client_secret = "…" // test fixture in %s',
    (filename) => {
      expect(secretFindings('client_secret = "abcd1234" // test fixture', filename)).toEqual([]);
    },
  );

  it("still reports the same 'test fixture' line outside a test path", () => {
    expect(secretFindings('client_secret = "abcd1234" // test fixture', "src/config.ts")).toHaveLength(1);
  });

  // Fixtures also count as tests for file type and R010 (shared TEST_PATHS): see rules.R010.test.ts.

  it.each(["src/latest/config.ts", "src/contest.ts", "src/attestation/keys.ts", "src/testimonials.ts"])(
    "still reports secrets in a non-test path that contains 'test': %s",
    (filename) => {
      expect(secretFindings(`const t = "${FAKE.ghp}";`, filename)).toHaveLength(1);
    },
  );

  it("still applies the other code rules in test files", () => {
    expect(codeRuleIds("+eval(userInput);", "src/__tests__/a.test.ts")).toContain("R016");
  });
});
