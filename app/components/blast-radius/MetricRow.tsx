import type { MetricRowProps } from "@/types/ui/components";
import { LevelBadge } from "./LevelBadge";

export function MetricRow({ label, level, children }: MetricRowProps) {
  return (
    <div className="grid grid-cols-[4.5rem_1fr] gap-3 px-3 py-2.5 sm:grid-cols-[5.5rem_1fr]">
      <dt className="text-xs text-zinc-500 uppercase tracking-wide leading-6">{label}</dt>
      <dd className="min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1 text-zinc-200 leading-6">{children}</div>
          {level && <LevelBadge level={level} />}
        </div>
      </dd>
    </div>
  );
}
