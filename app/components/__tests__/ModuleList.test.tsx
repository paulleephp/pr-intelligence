/**
 * app/components/blast-radius/ModuleList.tsx: the module chips in the blast radius card. The
 * first six show as chips; the rest sit in a <details> behind "+N more".
 */
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { ModuleList } from "../blast-radius/ModuleList";
import { chipNames, modulesNamed } from "./blast-radius-utils";

const renderList = (count: number) => {
  const modules = modulesNamed(count);
  const { container } = render(<ModuleList modules={modules} />);
  return { modules, container, details: container.querySelector("details") };
};

describe("ModuleList", () => {
  it("renders nothing when there are no modules", () => {
    const { container } = renderList(0);

    expect(container).toBeEmptyDOMElement();
  });

  it("shows six modules as chips, each titled with its full name, and no '+N more'", () => {
    const { modules, container, details } = renderList(6);

    expect(chipNames(container)).toEqual(modules);
    for (const name of modules) {
      expect(screen.getByText(name)).toHaveAttribute("title", name);
    }
    expect(screen.queryByText(/more$/)).toBeNull();
    expect(details).toBeNull();
  });

  // happy-dom has no layout, so the class stands in for "a long module name can't widen the card"
  // (S4-T2) until there's a browser test. The full name stays in the title.
  it("truncates every chip, in the preview and behind '+N more'", () => {
    const { modules } = renderList(8);

    for (const name of modules) {
      expect(screen.getByText(name)).toHaveClass("truncate");
    }
  });

  it.each<[number, string]>([
    [7, "+1 more"],
    [10, "+4 more"],
  ])("shows the first six of %i modules and puts the rest behind %j", (count, label) => {
    const { modules, details } = renderList(count);
    const [preview] = screen.getAllByRole("list");
    const rest = details as HTMLDetailsElement;

    expect(chipNames(preview)).toEqual(modules.slice(0, 6));
    expect(rest.open).toBe(false);
    expect(within(rest.querySelector("summary") as HTMLElement).getByText(label)).toBeTruthy();
    expect(chipNames(rest)).toEqual(modules.slice(6));
    for (const name of modules.slice(6)) {
      expect(within(rest).getByText(name)).toHaveAttribute("title", name);
    }
  });

  it("opens the rest of the list from the summary, and closes it again", async () => {
    const user = userEvent.setup();
    const rest = renderList(8).details as HTMLDetailsElement;
    const summary = rest.querySelector("summary") as HTMLElement;

    await user.click(summary);
    expect(rest.open).toBe(true);
    await user.click(summary);
    expect(rest.open).toBe(false);
  });

  // happy-dom doesn't apply Tailwind, so both labels are always in the DOM. These classes are
  // what swaps "+N more" for "Show less" while the list is open.
  it("swaps '+N more' for 'Show less' with the details' open state", () => {
    const rest = renderList(8).details as HTMLDetailsElement;
    const summary = within(rest.querySelector("summary") as HTMLElement);

    expect(rest).toHaveClass("group");
    expect(summary.getByText("+2 more")).toHaveClass("group-open:hidden");
    expect(summary.getByText("Show less")).toHaveClass("hidden", "group-open:inline");
  });
});
