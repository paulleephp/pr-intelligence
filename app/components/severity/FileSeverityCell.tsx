import type { ChangedFileRow } from "@/types/ui/report";
import {
  NOT_SCANNED_BADGE,
  NOT_SCANNED_HINT,
  NOT_SCANNED_LABEL,
  UNSCANNED_REASON_LABELS,
} from "../_lib/file-display";
import { SeverityBadge } from "./SeverityBadge";

interface FileSeverityCellProps {
  row: ChangedFileRow;
}

export function FileSeverityCell({ row }: FileSeverityCellProps) {
  const { severity, unscannedReason } = row;
  const reason = unscannedReason ? UNSCANNED_REASON_LABELS[unscannedReason] : null;

  if (!reason) return <SeverityBadge severity={severity} />;

  if (severity === "none") {
    return (
      <span
        title={reason}
        className={`inline-flex whitespace-nowrap rounded-full border px-2.5 py-0.5 text-xs ${NOT_SCANNED_BADGE}`}
      >
        {NOT_SCANNED_LABEL}
      </span>
    );
  }

  return (
    <span className="inline-flex flex-col items-start gap-0.5">
      <SeverityBadge severity={severity} />
      <span title={reason} className="text-[11px] text-zinc-500">
        {NOT_SCANNED_HINT}
      </span>
    </span>
  );
}
