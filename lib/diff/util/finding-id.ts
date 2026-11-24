import type { Pattern } from "@/types/diff/pattern";

export const withLine = (pattern: Pattern, line: number | undefined): Pattern =>
  line ? { ...pattern, line } : pattern;

export const buildFindingId = ({ ruleId, filename, line }: Pattern): string =>
  line ? `${ruleId}:${filename}:${line}` : `${ruleId}:${filename}`;

export const withFindingId = (pattern: Pattern): Pattern => ({
  ...pattern,
  id: buildFindingId(pattern),
});
