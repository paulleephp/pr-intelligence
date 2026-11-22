/** R016 - dangerous code execution / DOM sinks (lib/diff/code.ts). */
import { describe, expect, it } from "vitest";
import { analyzeDiff } from "@/lib/diff/core";
import { analyzedRuleIds, code, codeRuleIds, file } from "./fixtures/rules";

describe("R016 - dangerous code execution / DOM sinks", () => {
  it.each([
    "+eval(userInput);",
    "+const fn = new Function('a', body);",
    "+el.innerHTML = html;",
    "+el.innerHTML += row;",
    "+el.outerHTML = html;",
    "+<div dangerouslySetInnerHTML={{ __html: html }} />",
    "+document.write(markup);",
    "+document.writeln(markup);",
    "+import { exec } from 'child_process';",
    // biome-ignore lint/suspicious/noTemplateCurlyInString: diff text containing a JS template literal.
    "+exec(`rm -rf ${dir}`);",
    "+const out = execSync(cmd);",
    "+spawn('sh', ['-c', cmd]);",
  ])("flags: %s", (patch) => {
    expect(code(patch).dangerousCodeCalls).toMatchObject({ ruleId: "R016", severity: "high" });
  });

  it.each([
    "+const m = regex.exec(str);", // RegExp.prototype.exec
    "+const html = el.innerHTML;", // read, not write
    "+const result = evaluate(expr);",
    "+const era = 'medieval(ish)';",
    "+const fn = new function () {};", // lowercase - not the Function constructor
    "-eval(userInput);", // removed line
  ])("does not flag: %s", (patch) => {
    expect(codeRuleIds(patch)).not.toContain("R016");
  });

  it("is independent of R015 - a line can trigger both", () => {
    expect(codeRuleIds("+fetch(url).then((r) => r.text()).then((t) => eval(t));")).toEqual(["R015", "R016"]);
  });

  it("raises the overall PR severity to high", () => {
    const { aggregate } = analyzeDiff([file({ filename: "src/a.ts", patch: "@@ -1 +1 @@\n+eval(x);" })]);

    expect(aggregate.ruleCounts).toEqual([
      { ruleId: "R016", condition: "Dangerous code execution or DOM sink introduced", severity: "high", count: 1 },
    ]);
    expect(aggregate.overallSeverity).toBe("high");
  });

  it.each(['+if (el.innerHTML === "") {', '+if (el.outerHTML == prev) {'])(
    "does not flag an innerHTML/outerHTML comparison: %s",
    (patch) => {
      expect(codeRuleIds(patch)).not.toContain("R016");
    },
  );
});

// Decision (2026-11-23): .vue, .svelte and .astro files aren't JS/TS, so the code-pattern rules skip
// them (rules.js-ts-scope.test.ts). They should still be scanned for HTML injection, the innerHTML
// part of R016. Nothing else needs testing for these files.
describe("R016 - HTML injection in Vue / Svelte / Astro files", () => {
  // KNOWN GAP: agreed, not implemented yet. The JS/TS-only gate skips these files entirely.
  it.fails.each([
    ["src/components/Card.vue", "+    el.innerHTML = html;"],
    ["src/lib/Card.svelte", "+  node.outerHTML = markup;"],
    ["src/pages/post.astro", "+  document.write(markup);"],
  ])("flags a DOM sink in a <script> block of %s: %s", (filename, patch) => {
    expect(analyzedRuleIds(filename, `@@ -1 +1 @@\n${patch}`)).toContain("R016");
  });

  // KNOWN GAP: each framework's own "set innerHTML" syntax. Needs new patterns as well as the gate change.
  it.fails.each([
    ["src/components/Card.vue", '+  <div v-html="body"></div>'],
    ["src/lib/Card.svelte", "+  <div>{@html body}</div>"],
    ["src/pages/post.astro", "+  <article set:html={body} />"],
  ])("flags the framework's raw-HTML syntax in %s: %s", (filename, patch) => {
    expect(analyzedRuleIds(filename, `@@ -1 +1 @@\n${patch}`)).toContain("R016");
  });
});
