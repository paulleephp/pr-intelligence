import { describe, it, expect } from "vitest";
import { parsePRUrl } from "@/lib/url";

describe("parsePRUrl", () => {
  describe("valid URLs", () => {
    it("should parse valid GitHub PR URL", () => {
      const url = "https://github.com/vercel/next.js/pull/12345";
      const result = parsePRUrl(url);

      expect(result).not.toBeNull();
      expect(result?.owner).toBe("vercel");
      expect(result?.repo).toBe("next.js");
      expect(result?.prNumber).toBe(12345);
    });

    it("should handle URLs with query parameters", () => {
      const url =
        "https://github.com/owner/repo/pull/999?files=1&sort=modified";
      const result = parsePRUrl(url);

      expect(result).not.toBeNull();
      expect(result?.owner).toBe("owner");
      expect(result?.repo).toBe("repo");
      expect(result?.prNumber).toBe(999);
    });

    it("should handle numeric PR numbers correctly", () => {
      const url = "https://github.com/a/b/pull/1";
      const result = parsePRUrl(url);

      expect(result?.prNumber).toBe(1);
    });

    it("should handle large PR numbers", () => {
      const url = "https://github.com/a/b/pull/999999";
      const result = parsePRUrl(url);

      expect(result?.prNumber).toBe(999999);
    });
  });

  describe("invalid URLs", () => {
    it("should return null for non-GitHub URLs", () => {
      const url = "https://gitlab.com/owner/repo/pull/123";
      const result = parsePRUrl(url);

      expect(result).toBeNull();
    });

    it("should return null for missing PR number", () => {
      const url = "https://github.com/owner/repo";
      const result = parsePRUrl(url);

      expect(result).toBeNull();
    });

    it("should return null for malformed URLs", () => {
      const url = "not a url";
      const result = parsePRUrl(url);

      expect(result).toBeNull();
    });

    it("should return null for empty string", () => {
      const url = "";
      const result = parsePRUrl(url);

      expect(result).toBeNull();
    });

    it("should return null for GitHub URL without pull", () => {
      const url = "https://github.com/owner/repo/issues/123";
      const result = parsePRUrl(url);

      expect(result).toBeNull();
    });

    it("should return null for non-numeric PR number", () => {
      const url = "https://github.com/owner/repo/pull/abc";
      const result = parsePRUrl(url);

      expect(result).toBeNull();
    });
  });

  describe("edge cases", () => {
    it("should handle hyphens in owner and repo names", () => {
      const url = "https://github.com/owner-name/repo-name/pull/123";
      const result = parsePRUrl(url);

      expect(result?.owner).toBe("owner-name");
      expect(result?.repo).toBe("repo-name");
    });

    it("should handle underscores in owner and repo names", () => {
      const url = "https://github.com/owner_name/repo_name/pull/456";
      const result = parsePRUrl(url);

      expect(result?.owner).toBe("owner_name");
      expect(result?.repo).toBe("repo_name");
    });

    it("should handle dots in repo names", () => {
      const url = "https://github.com/owner/repo.js/pull/789";
      const result = parsePRUrl(url);

      expect(result?.repo).toBe("repo.js");
    });
  });
});
