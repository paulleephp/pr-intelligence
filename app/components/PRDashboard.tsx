import type { PRDashboardProps } from "@/types/ui/components";
import type { SeverityCountMap } from "@/types/ui/report";
import { NOT_SCANNED_LABEL } from "./_lib/file-display";
import { FILE_SEVERITY_ORDER, SEVERITY_STYLES } from "./_lib/severity";
import { StatTile } from "./report/StatTile";

const formatSigned = (value: number): string => (value > 0 ? `+${value}` : `${value}`);

export function PRDashboard({ analysis }: PRDashboardProps) {
  const summary = analysis.prChangeSummary;
  const { unscannedFiles, aggregate } = analysis.analysis;
  const { fileSeverityCounts, fileSeverity } = aggregate;
  const flaggedFiles = Object.values(fileSeverityCounts).reduce((sum, n) => sum + n, 0);
  const unscannedCount = unscannedFiles.length;
  const unscannedUnflagged = unscannedFiles.filter((f) => !fileSeverity[f.filename]).length;
  const cleanFiles = Math.max(summary.filesChanged - flaggedFiles - unscannedUnflagged, 0);
  const filesBySeverity: SeverityCountMap = { ...fileSeverityCounts, none: cleanFiles };
  const maxFiles = Math.max(...Object.values(filesBySeverity).map((n) => n ?? 0), 1);

  const netLines = summary.totalLinesAdded - summary.totalLinesRemoved;
  const totalLines = summary.totalLinesAdded + summary.totalLinesRemoved;
  const filesModified = Math.max(
    summary.filesChanged - summary.filesAdded - summary.filesRemoved,
    0,
  );
  const avgLinesPerFile = summary.filesChanged ? Math.round(totalLines / summary.filesChanged) : 0;

  return (
    <section className="grid gap-8 rounded-lg border border-zinc-800 bg-zinc-900/30 p-6 backdrop-blur-sm lg:grid-cols-2">
      <div>
        <h2 className="mb-4 font-semibold text-cyan-300 text-lg">Files by severity</h2>
        <ul className="space-y-3">
          {FILE_SEVERITY_ORDER.map((level) => {
            const count = filesBySeverity[level] ?? 0;
            const style = SEVERITY_STYLES[level];
            const width = `${(count / maxFiles) * 100}%`;
            return (
              <li key={level} className="grid grid-cols-[5rem_1fr_2.5rem] items-center gap-3">
                <span className={`text-sm ${style.text}`}>{style.label}</span>
                <div className="h-2.5 overflow-hidden rounded-full bg-zinc-800">
                  <div className={`h-full rounded-full ${style.bar}`} style={{ width }} />
                </div>
                <span className="text-right font-semibold text-sm text-white tabular-nums">
                  {count}
                </span>
              </li>
            );
          })}
        </ul>
        {unscannedCount > 0 && (
          <p className="mt-3 text-sm text-zinc-500">
            {NOT_SCANNED_LABEL}: {unscannedCount} {unscannedCount === 1 ? "file" : "files"} (binary
            or no diff)
          </p>
        )}
      </div>

      <div>
        <h2 className="mb-4 font-semibold text-cyan-300 text-lg">Line changes</h2>
        <div className="grid grid-cols-2 gap-3">
          <StatTile label="Added" value={`+${summary.totalLinesAdded}`} tone="text-emerald-400" />
          <StatTile label="Removed" value={`−${summary.totalLinesRemoved}`} tone="text-red-400" />
          <StatTile label="Net" value={formatSigned(netLines)} />
          <StatTile label="Avg / file" value={avgLinesPerFile} hint={`${totalLines} total`} />
        </div>
        <p className="mt-3 text-sm text-zinc-500">
          {summary.filesAdded} added · {filesModified} modified · {summary.filesRemoved} removed
        </p>
      </div>
    </section>
  );
}
