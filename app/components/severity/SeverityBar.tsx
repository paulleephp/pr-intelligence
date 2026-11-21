import type { FileSeverity, SeverityCountMap } from "@/types/ui/report";
import { SEVERITY_STYLES } from "../_lib/severity";

interface SeverityBarProps {
  counts: SeverityCountMap;
  order: readonly FileSeverity[];
  ariaLabel: string;
}

export function SeverityBar({ counts, order, ariaLabel }: SeverityBarProps) {
  const total = order.reduce((sum, level) => sum + (counts[level] ?? 0), 0);
  const segments = order.filter((level) => (counts[level] ?? 0) > 0);

  return (
    <div className="space-y-3">
      <div
        role="img"
        aria-label={ariaLabel}
        className="flex h-2.5 w-full gap-0.5 overflow-hidden rounded-full bg-zinc-800"
      >
        {segments.map((level) => (
          <div
            key={level}
            className={SEVERITY_STYLES[level].bar}
            style={{ width: `${((counts[level] ?? 0) / total) * 100}%` }}
          />
        ))}
      </div>
      <ul className="flex flex-wrap gap-x-5 gap-y-2">
        {order.map((level) => {
          const count = counts[level] ?? 0;
          const style = SEVERITY_STYLES[level];
          return (
            <li
              key={level}
              className={`flex items-center gap-2 text-sm ${count ? "" : "opacity-40"}`}
            >
              <span className={`h-2.5 w-2.5 rounded-full ${style.dot}`} />
              <span className="text-zinc-400">{style.label}</span>
              <span
                className={`font-semibold tabular-nums ${count ? style.text : "text-zinc-500"}`}
              >
                {count}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
