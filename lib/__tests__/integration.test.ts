import { describe, expect, it } from "vitest";
import { ERROR_MESSAGES } from "@/lib/constants";
import { parsePRUrl } from "@/lib/url";

describe("Integration Tests", () => {
  describe("URL Parsing and Constants", () => {
    it("should correctly parse valid PR URL and verify structure", () => {
      const url = "https://github.com/vercel/next.js/pull/54321";
      const parsed = parsePRUrl(url);

      expect(parsed).not.toBeNull();
      expect(parsed?.owner).toBe("vercel");
      expect(parsed?.repo).toBe("next.js");
      expect(parsed?.prNumber).toBe(54321);
    });

    it("should handle error constants for invalid URL", () => {
      const url = "invalid-url";
      const parsed = parsePRUrl(url);

      expect(parsed).toBeNull();
      expect(ERROR_MESSAGES.INVALID_PR_URL).toBeTruthy();
    });

    it("should match PR number as numeric value", () => {
      const url = "https://github.com/a/b/pull/9999";
      const parsed = parsePRUrl(url);

      expect(parsed?.prNumber).toBe(9999);
      expect(typeof parsed?.prNumber).toBe("number");
    });
  });

  describe("Error Message Constants", () => {
    it("should have all required error messages", () => {
      expect(ERROR_MESSAGES.NO_PR_URL).toBeTruthy();
      expect(ERROR_MESSAGES.INVALID_PR_URL).toBeTruthy();
      expect(ERROR_MESSAGES.INTERNAL_ERROR).toBeTruthy();
      expect(ERROR_MESSAGES.POST_EXPECTED).toBeTruthy();
    });

    it("should provide helpful error messages", () => {
      expect(typeof ERROR_MESSAGES.INVALID_PR_URL).toBe("string");
      expect(ERROR_MESSAGES.INVALID_PR_URL).toBeTruthy();
    });
  });

  describe("Data Transformation Pipeline", () => {
    it("should handle PR URLs across different formats", () => {
      const testCases = [
        {
          url: "https://github.com/owner/repo/pull/1",
          expectedNumber: 1,
        },
        {
          url: "https://github.com/owner/repo/pull/12345",
          expectedNumber: 12345,
        },
        {
          url: "https://github.com/owner-name/repo-name/pull/999",
          expectedNumber: 999,
        },
        {
          url: "https://github.com/owner_name/repo_name/pull/777",
          expectedNumber: 777,
        },
      ];

      testCases.forEach(({ url, expectedNumber }) => {
        const parsed = parsePRUrl(url);

        expect(parsed).not.toBeNull();
        expect(parsed?.prNumber).toBe(expectedNumber);
      });
    });

    it("should reject invalid formats consistently", () => {
      const invalidUrls = [
        "https://github.com/owner/repo",
        "https://github.com/owner/repo/issues/123",
        "https://gitlab.com/owner/repo/pull/123",
        "",
        "not-a-url",
      ];

      invalidUrls.forEach((url) => {
        const parsed = parsePRUrl(url);

        expect(parsed).toBeNull();
      });
    });
  });
});
