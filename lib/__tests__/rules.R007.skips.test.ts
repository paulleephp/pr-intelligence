/**
 * R007 - secrets: what R007 deliberately skips. Lines with a low-risk word (LOW_RISK_LINE: test,
 * mock, demo, example, todo, fixme) outside a trailing comment, and files in test paths
 * (isTestPath). Code: lib/diff/secret.ts. The rest of R007 is in rules.R007.*.test.ts.
 */
import { describe, expect, it } from "vitest";
import { codeRuleIds, FAKE, FIXTURE_PATHS, secretFindings } from "./fixtures/rules";

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
