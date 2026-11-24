import type { BlastRadiusCardProps } from "@/types/ui/components";
import {
  describeFileCount,
  describeSpread,
  describeTests,
  isTestWarning,
  WARNING_TEXT_STYLE,
} from "./_lib/blast-radius";
import { LevelBadge } from "./blast-radius/LevelBadge";
import { MetricRow } from "./blast-radius/MetricRow";
import { ModuleList } from "./blast-radius/ModuleList";
import { WarningIcon } from "./icons";

export function BlastRadiusCard({ blastRadius }: BlastRadiusCardProps) {
  const { level, fileCount, spread, tests } = blastRadius;
  const testWarning = isTestWarning(tests);
  const testTone = testWarning ? WARNING_TEXT_STYLE : "text-zinc-200";

  return (
    <div>
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="text-sm text-zinc-500 uppercase tracking-wide">Blast radius</h3>
        <LevelBadge level={level} />
      </div>
      <dl className="divide-y divide-zinc-800/70 rounded-md border border-zinc-800 bg-zinc-950/40 text-sm">
        <MetricRow label="Files" level={fileCount.level}>
          {describeFileCount(fileCount)}
        </MetricRow>
        <MetricRow label="Modules" level={spread.level}>
          <div className="space-y-2">
            <p>{describeSpread(spread.modules)}</p>
            <ModuleList modules={spread.modules} />
          </div>
        </MetricRow>
        <MetricRow label="Tests">
          <p className={`flex items-start gap-1.5 ${testTone}`}>
            {testWarning && <WarningIcon className="mt-0.5 h-4 w-4 shrink-0" />}
            <span>{describeTests(tests)}</span>
          </p>
        </MetricRow>
      </dl>
    </div>
  );
}
