import type { PatternSeverity } from "@/lib/types/diff/pattern";
import type { FileSeverity, SeverityStyle } from "@/types/ui/report";

export const SEVERITY_ORDER: readonly PatternSeverity[] = ["critical", "high", "medium", "low"];

export const FILE_SEVERITY_ORDER: readonly FileSeverity[] = [...SEVERITY_ORDER, "none"];

export const SEVERITY_STYLES: Record<FileSeverity, SeverityStyle> = {
  critical: {
    label: "Critical",
    badge: "border-red-500 bg-red-600 text-white",
    dot: "bg-red-500",
    bar: "bg-red-500",
    text: "text-red-500",
  },
  high: {
    label: "High",
    badge: "border-orange-500/40 bg-orange-500/15 text-orange-300",
    dot: "bg-orange-400",
    bar: "bg-orange-400",
    text: "text-orange-300",
  },
  medium: {
    label: "Medium",
    badge: "border-yellow-500/40 bg-yellow-500/15 text-yellow-300",
    dot: "bg-yellow-400",
    bar: "bg-yellow-400",
    text: "text-yellow-300",
  },
  low: {
    label: "Low",
    badge: "border-sky-500/40 bg-sky-500/15 text-sky-300",
    dot: "bg-sky-400",
    bar: "bg-sky-400",
    text: "text-sky-300",
  },
  none: {
    label: "None",
    badge: "border-zinc-700 bg-zinc-800/60 text-zinc-400",
    dot: "bg-zinc-600",
    bar: "bg-zinc-700",
    text: "text-zinc-400",
  },
};

export const severityRank = (severity: FileSeverity): number =>
  FILE_SEVERITY_ORDER.indexOf(severity);
