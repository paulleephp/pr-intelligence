import type { AffectedAreasProps } from "@/types/ui/components";
import { buildAffectedAreas } from "./_lib/areas";
import { DEFAULT_STATUS_STYLE, STATUS_STYLES } from "./_lib/file-display";
import { SeverityBadge } from "./severity/SeverityBadge";

export function AffectedAreas({ analysis }: AffectedAreasProps) {
  const areas = buildAffectedAreas(analysis);

  if (areas.length === 0) {
    return null;
  }

  return (
    <section className="rounded-lg border border-zinc-800 bg-zinc-900/30 p-6 backdrop-blur-sm">
      <h2 className="mb-4 font-semibold text-cyan-300 text-lg">Affected areas</h2>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {areas.map(({ area, label, files }) => (
          <div key={area} className="rounded-md border border-zinc-800 bg-zinc-950/40">
            <div className="flex items-center justify-between border-zinc-800 border-b px-3 py-2">
              <h3 className="font-medium text-sm text-zinc-200">{label}</h3>
              <span className="rounded-full bg-zinc-800 px-2 py-0.5 font-semibold text-xs text-zinc-200 tabular-nums">
                {files.length} {files.length === 1 ? "file" : "files"}
              </span>
            </div>
            <ul className="divide-y divide-zinc-800/70">
              {files.map((file) => (
                <li key={file.filename} className="flex items-center gap-2 px-3 py-2 text-xs">
                  <span
                    className="min-w-0 flex-1 truncate font-mono text-zinc-300"
                    title={file.filename}
                  >
                    {file.filename}
                  </span>
                  <span
                    className={`shrink-0 rounded border px-1.5 py-0.5 ${STATUS_STYLES[file.status] ?? DEFAULT_STATUS_STYLE}`}
                  >
                    {file.status}
                  </span>
                  <SeverityBadge severity={file.severity} />
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}
