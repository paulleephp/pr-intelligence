/** R015 - risky outbound API calls (lib/diff/code.ts). */
import { describe, expect, it } from "vitest";
import { analyzeDiff } from "@/lib/diff/core";
import { code, codeRuleIds, file } from "./fixtures/rules";

describe("R015 - outbound network calls", () => {
  it.each([
    "+const res = await fetch(url);",
    "+const res = await window.fetch(url);",
    "+axios(config)",
    "+const { data } = await axios.get(url);",
    "+https.get(url, cb);",
    "+const res = await got.post(url);",
    "+const r = request(options);",
    "+window.location = nextUrl;",
    "+const s = document.createElement('script');",
    "+const res = await fetch (url);", // whitespace before paren
  ])("flags: %s", (patch) => {
    expect(code(patch).riskyApiCalls).toMatchObject({ ruleId: "R015", severity: "medium" });
  });

  it("puts the matched call in the message and the full line in evidence", () => {
    const finding = code("+  const { data } = await axios.get(url);").riskyApiCalls;

    expect(finding?.message).toContain('"axios.get("');
    expect(finding?.evidence).toBe("const { data } = await axios.get(url);");
  });

  it("ignores removed lines", () => {
    expect(codeRuleIds("-const res = await fetch(url);")).not.toContain("R015");
  });

  it.each([
    "+router.prefetch('/home');",
    "+refetch();",
    "+const r = createRequest(opts);",
    "+const fetcher = useFetcher();",
    "+const httpStatus = 200;",
  ])("does not flag look-alike identifiers: %s", (patch) => {
    expect(codeRuleIds(patch)).not.toContain("R015");
  });

  it("is reported through analyzeDiff into the aggregate", () => {
    const { aggregate } = analyzeDiff([file({ filename: "src/api.ts", patch: "@@ -1 +1 @@\n+await fetch(u);" })]);

    expect(aggregate.ruleCounts).toEqual([
      { ruleId: "R015", condition: "Risky API call introduced", severity: "medium", count: 1 },
    ]);
  });
});
