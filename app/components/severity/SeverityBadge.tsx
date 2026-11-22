import type { SeverityBadgeProps } from "@/types/ui/components";
import { SEVERITY_STYLES } from "../_lib/severity";

export function SeverityBadge({ severity, label }: SeverityBadgeProps) {
  const style = SEVERITY_STYLES[severity];

  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-0.5 font-medium text-xs ${style.badge}`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${severity === "critical" ? "bg-white" : style.dot}`}
      />
      {label ?? style.label}
    </span>
  );
}
