import type { PRAnalysisResponse } from "@/lib/types/pr/metadata";
import type { ChangedFileRow } from "@/types/ui/report";
import { DEFAULT_STATUS_STYLE, FILE_TYPE_LABELS, STATUS_STYLES } from "./_lib/file-display";
import { severityRank } from "./_lib/severity";
import { FileSeverityCell } from "./severity/FileSeverityCell";

interface ChangedFilesTableProps {
  analysis: PRAnalysisResponse;
}

const FALLBACK_TYPE = "backend";

const toRows = ({ changedFiles, analysis }: PRAnalysisResponse): ChangedFileRow[] => {
  const unscanned = new Map(analysis.unscannedFiles.map((f) => [f.filename, f.reason]));
  const rows: ChangedFileRow[] = changedFiles.map(({ filename, status, additions, deletions }) => ({
    filename,
    status,
    additions,
    deletions,
    type: analysis.fileTypes[filename] ?? FALLBACK_TYPE,
    severity: analysis.aggregate.fileSeverity[filename] ?? "none",
    unscannedReason: unscanned.get(filename) ?? null,
  }));
  return rows.sort(
    (a, b) =>
      severityRank(a.severity) - severityRank(b.severity) || a.filename.localeCompare(b.filename),
  );
};

export function ChangedFilesTable({ analysis }: ChangedFilesTableProps) {
  const rows = toRows(analysis);

  return (
    <section className="rounded-lg border border-zinc-800 bg-zinc-900/30 p-6 backdrop-blur-sm">
      <h2 className="mb-4 font-semibold text-cyan-300 text-lg">Changed files ({rows.length})</h2>

      {rows.length === 0 ? (
        <p className="py-8 text-center text-zinc-500">No changed files found</p>
      ) : (
        <div className="-mx-6 overflow-x-auto px-6">
          <table className="w-full min-w-[36rem] text-left text-sm">
            <thead className="border-zinc-800 border-b text-xs text-zinc-500 uppercase tracking-wide">
              <tr>
                <th scope="col" className="py-2 pr-4 font-medium">
                  File
                </th>
                <th scope="col" className="py-2 pr-4 font-medium">
                  Type
                </th>
                <th scope="col" className="py-2 pr-4 font-medium">
                  Status
                </th>
                <th scope="col" className="py-2 pr-4 text-right font-medium">
                  Lines
                </th>
                <th scope="col" className="py-2 font-medium">
                  Severity
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/70">
              {rows.map((row) => (
                <tr key={row.filename} className="hover:bg-zinc-800/30">
                  <td className="max-w-[18rem] py-2.5 pr-4">
                    <span className="block truncate font-mono text-zinc-200" title={row.filename}>
                      {row.filename}
                    </span>
                  </td>
                  <td className="py-2.5 pr-4 text-zinc-400">{FILE_TYPE_LABELS[row.type]}</td>
                  <td className="py-2.5 pr-4">
                    <span
                      className={`rounded border px-2 py-0.5 text-xs ${STATUS_STYLES[row.status] ?? DEFAULT_STATUS_STYLE}`}
                    >
                      {row.status}
                    </span>
                  </td>
                  <td className="whitespace-nowrap py-2.5 pr-4 text-right font-mono text-xs tabular-nums">
                    <span className="text-emerald-400">+{row.additions}</span>{" "}
                    <span className="text-red-400">−{row.deletions}</span>
                  </td>
                  <td className="py-2.5">
                    <FileSeverityCell row={row} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
