/**
 * Integration test: real PRAnalyzer -> PRForm -> usePRReport -> lib/api -> PRResults.
 * Only the network (global fetch) is stubbed; it returns what the API routes would return,
 * with the analysis produced by the real deterministic engine.
 */
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mockPRMetadataSuccess } from "@/app/__tests__/fixtures";
import { PRAnalyzer } from "../PRAnalyzer";
import { buildAnalysis, FILES } from "./fixtures";

const PR_URL = "https://github.com/owner/repo/pull/123";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

const mockFetch = vi.fn<typeof fetch>();

const routeTo = (responses: { metadata: () => Response; analysis: () => Response }) =>
  mockFetch.mockImplementation(async (input) => {
    const path = String(input).split("?")[0];
    return path === "/api/pr/analysis" ? responses.analysis() : responses.metadata();
  });

const submit = async (url = PR_URL) => {
  const user = userEvent.setup();
  await user.type(screen.getByRole("textbox", { name: "GitHub pull request URL" }), url);
  await user.click(screen.getByRole("button", { name: "Analyze PR" }));
};

beforeEach(() => {
  vi.stubGlobal("fetch", mockFetch);
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  mockFetch.mockReset();
});

describe("PRAnalyzer (integration)", () => {
  it("analyzes a PR and renders the full report", async () => {
    routeTo({
      metadata: () => json(mockPRMetadataSuccess),
      analysis: () => json(buildAnalysis([FILES.high, FILES.clean])),
    });
    render(<PRAnalyzer />);

    await submit();

    expect(await screen.findByRole("heading", { name: "Test PR" })).toBeInTheDocument();
    expect(screen.getByText("Overall risk").nextElementSibling).toHaveTextContent("High");
    expect(screen.getByRole("heading", { name: "Changed files (2)" })).toBeInTheDocument();
    const firstRow = screen.getAllByRole("row")[1];
    expect(within(firstRow).getAllByRole("cell")[0]).toHaveTextContent("src/hash.ts");
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it("shows the API's error message and no report when the PR is not found", async () => {
    routeTo({
      metadata: () => json({ error: "PR not found. Please verify the PR number is correct." }, 404),
      analysis: () => json({ error: "PR not found. Please verify the PR number is correct." }, 404),
    });
    render(<PRAnalyzer />);

    await submit();

    expect(await screen.findByRole("alert")).toHaveTextContent("PR not found");
    expect(screen.queryByRole("heading", { name: "Test PR" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Analyze PR" })).toBeEnabled();
  });

  it("shows a friendly message when the server returns an unexpected shape", async () => {
    routeTo({
      metadata: () => json(mockPRMetadataSuccess),
      analysis: () => json({ something: "else" }),
    });
    render(<PRAnalyzer />);

    await submit();

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "The server returned data in an unexpected format.",
    );
  });

  it("clears a previous error after a successful retry", async () => {
    routeTo({
      metadata: () => json({ error: "GitHub rate limit exceeded" }, 429),
      analysis: () => json(buildAnalysis([])),
    });
    render(<PRAnalyzer />);
    await submit();
    expect(await screen.findByRole("alert")).toHaveTextContent("rate limit");

    routeTo({
      metadata: () => json(mockPRMetadataSuccess),
      analysis: () => json(buildAnalysis([FILES.clean])),
    });
    await userEvent.setup().click(screen.getByRole("button", { name: "Analyze PR" }));

    expect(await screen.findByRole("heading", { name: "Test PR" })).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.getByText("Overall risk").nextElementSibling).toHaveTextContent("No risks");
  });
});
