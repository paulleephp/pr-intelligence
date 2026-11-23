/** R015 - unsafe navigation: a write to window.location from a dynamic value (lib/diff/code.ts). */
import { describe, expect, it } from "vitest";
import { analyzeDiff } from "@/lib/diff/core";
import { code, codeRuleIds, file } from "./fixtures/rules";

// Scope decision (2026-11-23, SPRINT3-TASKS T4): R015 used to flag every fetch/axios/HTTP call and
// document.createElement. Whether those are safe depends on guards a diff can't show, so R015 now
// only flags writes to location, where a javascript: URL runs code in the user's browser.
describe("R015 - unsafe navigation", () => {
  it.each([
    '+window.location.href = params.get("next");',
    "+location.assign(url);",
    '+window.location = "javascript:alert(1)";',
    // biome-ignore lint/suspicious/noTemplateCurlyInString: diff text containing a JS template literal.
    "+window.location.href = `/users/${id}`;",
    "+window.location = nextUrl;",
    "+window.location.href=next;",
    "+document.location.href = next;",
    "+self.location = next;",
    "+top.location.href = next;",
    "+window.location.assign(next);",
    "+window.location.replace(next);",
    "+location.replace(next);",
    "+location.href = next;",
    "+window.top.location = next;",
    "+parent.location.href = next;",
    "+globalThis.location.href = next;",
    "+window.parent.location.assign(next);",
    '+window.location.href = "//evil.com";', // protocol-relative: goes to another site
    String.raw`+window.location.href = "/\\evil.com";`, // browsers read /\ as // too
    '+window.location.href = "/x" + q;',
    '+window.location.href = "https://example.com/" + path;',
  ])("flags: %s", (patch) => {
    expect(code(patch).unsafeNavigation).toMatchObject({ ruleId: "R015", severity: "high" });
  });

  it.each([
    '+window.location.href = "/login";',
    '+location.href = "/login";',
    '+window.location.href = "/login"; // after sign-out',
    "+window.location.href = `/static`;",
    '+window.location.href = "./next";',
    '+window.location.href = "../up";',
    '+window.location.href = "?page=2";',
    '+window.location.href = "#top";',
    '+window.location.assign("https://example.com");',
  ])("does not flag a fixed relative or http(s) target: %s", (patch) => {
    expect(codeRuleIds(patch)).not.toContain("R015");
  });

  it.each([
    '+if (window.location.pathname === "/") {',
    "+if (window.location.href == prev) {",
    "+if (window.location !== prev) {",
    "+const { search } = window.location;",
    "+window.location.reload();",
  ])("does not flag a read or comparison: %s", (patch) => {
    expect(codeRuleIds(patch)).not.toContain("R015");
  });

  it.each([
    "+router.location.replace(x);",
    "+this.location.assign(x);",
    "+router.location.href = x;",
    "+foo.parent.location = x;",
  ])("does not flag another object's location: %s", (patch) => {
    expect(codeRuleIds(patch)).not.toContain("R015");
  });

  it("does not flag appending to the current URL with +=", () => {
    expect(codeRuleIds("+window.location.href += x;")).not.toContain("R015");
  });

  // Decided 2026-11-23: a bare `location = …` is left out, because `location` is often a local variable.
  it("does not flag an assignment to a bare location", () => {
    expect(codeRuleIds("+location = next;")).not.toContain("R015");
  });

  // These were R015 before the 2026-11-23 scope change.
  it.each([
    "+const res = await fetch(url);",
    "+const { data } = await axios.get(url);",
    "+https.get(url, cb);",
    "+const r = request(options);",
    '+const el = document.createElement("div");',
  ])("no longer flags network calls or createElement: %s", (patch) => {
    expect(codeRuleIds(patch)).not.toContain("R015");
  });

  it("leaves eval( to R016", () => {
    expect(codeRuleIds("+eval(x);")).toEqual(["R016"]);
  });

  it("ignores removed lines", () => {
    expect(codeRuleIds("-window.location.href = next;")).not.toContain("R015");
  });

  it("puts the matched write in the message and the full line in evidence", () => {
    const finding = code('+  window.location.href = params.get("next");').unsafeNavigation;

    expect(finding?.message).toBe(
      'Unsafe navigation: window.location assigned from a dynamic value in src/a.ts: "window.location.href ="',
    );
    expect(finding?.evidence).toBe('window.location.href = params.get("next");');
  });

  it("is reported through analyzeDiff into the aggregate as high", () => {
    const { aggregate } = analyzeDiff([
      file({ filename: "src/nav.ts", patch: "@@ -1 +1 @@\n+window.location.href = next;" }),
    ]);

    expect(aggregate.ruleCounts).toEqual([
      {
        ruleId: "R015",
        condition: "Unsafe navigation: window.location assigned from a dynamic value",
        severity: "high",
        count: 1,
      },
    ]);
    expect(aggregate.overallSeverity).toBe("high");
  });
});
