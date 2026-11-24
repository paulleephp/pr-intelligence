import { describe, expect, it } from "vitest";
import { stripTrailingComment } from "@/lib/diff/util/strip-comment";

describe("stripTrailingComment", () => {
  it.each([
    ["a // comment", "a = 1 // x", "a = 1 "],
    ["a # comment", "a = 1 # x", "a = 1 "],
    ["a comment after a tab", "a = 1\t# x", "a = 1\t"],
    ["a whole-line // comment", "// TODO: fix", ""],
    ["a whole-line # comment", "# TODO: fix", ""],
  ])("strips %s", (_, line, expected) => {
    expect(stripTrailingComment(line)).toBe(expected);
  });

  describe("does not treat these as comments", () => {
    it.each([
      ["# inside double quotes", 'color = "#fff"'],
      ["# inside single quotes", "color = '#fff'"],
      ["// inside backticks", "const u = `https://x.com`"],
      ["an unquoted URL (no space before //)", "url: https://x.com/a"],
      ["// with no space before it", "a=1//x"],
      ["# with no space before it", "a=1#x"],
      ["an unterminated string", 'x = "abc // y'],
    ])("%s", (_, line) => {
      expect(stripTrailingComment(line)).toBe(line);
    });
  });

  it.each([
    ["after a quoted #", 'c = "#fff" # demo', 'c = "#fff" '],
    [
      "after a quoted URL with a fragment",
      'u = "https://x.com/#a"; // demo',
      'u = "https://x.com/#a"; ',
    ],
    ["after an escaped quote", "x = 'it\\'s' # c", "x = 'it\\'s' "],
    ["after a quoted // ", 'x = "a // b" // c', 'x = "a // b" '],
  ])("strips a real comment %s", (_, line, expected) => {
    expect(stripTrailingComment(line)).toBe(expected);
  });

  it("leaves a line with no comment unchanged", () => {
    expect(stripTrailingComment('const k = "abc";')).toBe('const k = "abc";');
  });
});
