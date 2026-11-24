import type { ModuleListProps } from "@/types/ui/components";
import { SHOW_LESS_LABEL, splitModules } from "../_lib/blast-radius";

const CHIP_STYLE =
  "block max-w-full truncate rounded border border-zinc-800 bg-zinc-900/60 px-1.5 py-0.5 font-mono text-xs text-zinc-300";

const renderChips = (modules: readonly string[]) =>
  modules.map((name) => (
    <li key={name} className="min-w-0 max-w-full">
      <span className={CHIP_STYLE} title={name}>
        {name}
      </span>
    </li>
  ));

export function ModuleList({ modules }: ModuleListProps) {
  const { shown, hidden } = splitModules(modules);

  if (shown.length === 0) {
    return null;
  }

  return (
    <div className="space-y-1.5">
      <ul className="flex flex-wrap gap-1.5">{renderChips(shown)}</ul>
      {hidden.length > 0 && (
        <details className="group">
          <summary className="cursor-pointer text-xs text-zinc-400 hover:text-zinc-200 group-open:mb-1.5">
            <span className="group-open:hidden">+{hidden.length} more</span>
            <span className="hidden group-open:inline">{SHOW_LESS_LABEL}</span>
          </summary>
          <ul className="flex flex-wrap gap-1.5">{renderChips(hidden)}</ul>
        </details>
      )}
    </div>
  );
}
