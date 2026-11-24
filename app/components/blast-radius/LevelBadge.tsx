import type { LevelBadgeProps } from "@/types/ui/components";
import { BLAST_RADIUS_LEVEL_LABELS, LEVEL_BADGE_STYLE } from "../_lib/blast-radius";

export function LevelBadge({ level }: LevelBadgeProps) {
  return (
    <span
      className={`inline-flex shrink-0 items-center whitespace-nowrap rounded-full border px-2.5 py-0.5 font-medium text-xs ${LEVEL_BADGE_STYLE}`}
    >
      {BLAST_RADIUS_LEVEL_LABELS[level]}
    </span>
  );
}
