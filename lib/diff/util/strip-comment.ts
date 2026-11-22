const QUOTES = new Set(["'", '"', "`"]);
const LINE_COMMENT_STARTS = ["//", "#"];

const startsComment = (line: string, index: number): boolean => {
  const previous = index === 0 ? " " : line[index - 1];
  const atBoundary = /\s/.test(previous);
  return atBoundary && LINE_COMMENT_STARTS.some((marker) => line.startsWith(marker, index));
};

export const stripTrailingComment = (line: string): string => {
  let openQuote: string | null = null;
  for (let index = 0; index < line.length; index++) {
    const char = line[index];
    if (openQuote) {
      openQuote = char === openQuote && line[index - 1] !== "\\" ? null : openQuote;
      continue;
    }
    if (QUOTES.has(char)) {
      openQuote = char;
      continue;
    }
    if (startsComment(line, index)) {
      return line.slice(0, index);
    }
  }
  return line;
};
