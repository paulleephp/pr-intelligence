/**
 * R007 - secrets: which files count an unquoted *_secret value as a literal (config files,
 * Dockerfiles, shell scripts and .envrc), and which values are references rather than secrets.
 * Code: getSecretFileKind in lib/diff/secret.ts. The rest of R007 is in rules.R007.*.test.ts.
 */
import { describe, expect, it } from "vitest";
import { secretFindings } from "./fixtures/rules";

describe("R007 - catch-all *_secret rule (GENERIC_SECRET)", () => {
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
      // biome-ignore lint/suspicious/noTemplateCurlyInString: config text containing a ${VAR} reference.
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
      // biome-ignore lint/suspicious/noTemplateCurlyInString: Dockerfile text containing a ${VAR} reference.
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
      // biome-ignore lint/suspicious/noTemplateCurlyInString: shell text containing a ${VAR} reference.
      [".envrc", "export CLIENT_SECRET=${VAULT_CLIENT_SECRET}"],
    ])("does not flag an unquoted reference in %s: %s", (filename, line) => {
      expect(secretFindings(line, filename)).toEqual([]);
    });
  });
});
