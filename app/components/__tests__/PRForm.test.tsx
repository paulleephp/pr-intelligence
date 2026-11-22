import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { PRForm } from "../PRForm";

const PR_URL = "https://github.com/owner/repo/pull/123";

/** PRForm is controlled; wrap it with real state so typing behaves like the app. */
function Harness({
  initialUrl = "",
  loading = false,
  error = null,
  onAnalyze = vi.fn(),
}: {
  initialUrl?: string;
  loading?: boolean;
  error?: string | null;
  onAnalyze?: (url: string) => void;
}) {
  const [url, setUrl] = useState(initialUrl);
  return <PRForm url={url} setUrl={setUrl} loading={loading} error={error} onAnalyze={onAnalyze} />;
}

const input = () => screen.getByRole("textbox", { name: "GitHub pull request URL" });
const button = () => screen.getByRole("button");

describe("PRForm", () => {
  it("disables submit while the URL is empty", () => {
    render(<Harness />);

    expect(button()).toBeDisabled();
    expect(button()).toHaveTextContent("Analyze PR");
  });

  it("keeps submit disabled for whitespace-only input", async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.type(input(), "   ");

    expect(button()).toBeDisabled();
  });

  it("enables submit once a URL is typed", async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.type(input(), PR_URL);

    expect(input()).toHaveValue(PR_URL);
    expect(button()).toBeEnabled();
  });

  it("calls onAnalyze with the trimmed URL on click", async () => {
    const user = userEvent.setup();
    const onAnalyze = vi.fn();
    render(<Harness initialUrl={`  ${PR_URL}  `} onAnalyze={onAnalyze} />);

    await user.click(button());

    expect(onAnalyze).toHaveBeenCalledExactlyOnceWith(PR_URL);
  });

  it("submits on Enter", async () => {
    const user = userEvent.setup();
    const onAnalyze = vi.fn();
    render(<Harness onAnalyze={onAnalyze} />);

    await user.type(input(), `${PR_URL}{Enter}`);

    expect(onAnalyze).toHaveBeenCalledExactlyOnceWith(PR_URL);
  });

  it("does not submit on Enter when the URL is empty", async () => {
    const user = userEvent.setup();
    const onAnalyze = vi.fn();
    render(<Harness onAnalyze={onAnalyze} />);

    await user.type(input(), "{Enter}");

    expect(onAnalyze).not.toHaveBeenCalled();
  });

  it("shows a loading state and blocks input while analyzing", async () => {
    const user = userEvent.setup();
    const onAnalyze = vi.fn();
    render(<Harness initialUrl={PR_URL} loading onAnalyze={onAnalyze} />);

    expect(button()).toHaveTextContent("Analyzing...");
    expect(button()).toBeDisabled();
    expect(input()).toBeDisabled();

    await user.click(button());
    expect(onAnalyze).not.toHaveBeenCalled();
  });

  it("shows the error as an alert and marks the input invalid", () => {
    render(<Harness error="PR not found" />);

    expect(screen.getByRole("alert")).toHaveTextContent("PR not found");
    expect(input()).toHaveAttribute("aria-invalid", "true");
  });

  it("renders no alert when there is no error", () => {
    render(<Harness />);

    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(input()).toHaveAttribute("aria-invalid", "false");
  });
});
