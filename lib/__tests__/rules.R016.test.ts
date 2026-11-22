/** R016 - dangerous code execution / DOM sinks (lib/diff/code.ts). */
import { describe, expect, it } from "vitest";
import { analyzeDiff } from "@/lib/diff/core";
import { code, codeRuleIds, file } from "./fixtures/rules";

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
