import { PR_URL_REGEX } from "./constants";

export interface ParsedPRUrl {
  owner: string;
  repo: string;
  prNumber: number;
}

export function parsePRUrl(url: string): ParsedPRUrl | null {
  try {
    const match = url.match(PR_URL_REGEX);
    if (!match) return null;

    const [, owner, repo, prNumberStr] = match;
    return {
      owner,
      repo,
      prNumber: parseInt(prNumberStr, 10),
    };
  } catch (error) {
    console.error("Failed to parse PR URL:", error);
    return null;
  }
}
