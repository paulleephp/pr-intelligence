import Image from "next/image";
import type { PRReport } from "@/types/ui/report";
import { PR_STATE_STYLES } from "./_lib/file-display";
import { SEVERITY_ORDER } from "./_lib/severity";
import { StatTile } from "./report/StatTile";
import { SeverityBadge } from "./severity/SeverityBadge";
import { SeverityBar } from "./severity/SeverityBar";

interface PRSummaryProps {
  report: PRReport;
}

export function PRSummary({ report }: PRSummaryProps) {
  const { metadata, analysis } = report;
  const { filesChanged, totalLinesAdded, totalLinesRemoved } = analysis.prChangeSummary;
  const { severityCounts, totalFindings, overallSeverity } = analysis.analysis.aggregate;
  const stateStyle = PR_STATE_STYLES[metadata.state];
  const linesChanged = totalLinesAdded + totalLinesRemoved;

  return (
    <section className="rounded-lg border border-zinc-800 bg-zinc-900/30 p-6 backdrop-blur-sm">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-2">
          <a
            href={metadata.html_url}
            target="_blank"
            rel="noopener noreferrer"
            className="group block"
          >
            <p className="text-xs text-zinc-500">
              PR #{metadata.number} · <span className={stateStyle.text}>{stateStyle.label}</span>
            </p>
            <h2 className="font-semibold text-white text-xl transition-colors group-hover:text-emerald-400">
              {metadata.title}
            </h2>
          </a>
          <div className="flex items-center gap-2 text-sm text-zinc-400">
            <Image
              src={metadata.user.avatar_url}
              alt={metadata.user.login}
              width={24}
              height={24}
              className="rounded-full"
            />
            <span>@{metadata.user.login}</span>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <span className="text-xs text-zinc-500 uppercase tracking-wide">Overall risk</span>
          {overallSeverity ? (
            <SeverityBadge severity={overallSeverity} />
          ) : (
            <SeverityBadge severity="none" label="No risks" />
          )}
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatTile label="Files changed" value={filesChanged} />
        <StatTile
          label="Lines changed"
          value={linesChanged}
          hint={`+${totalLinesAdded} / −${totalLinesRemoved}`}
        />
        <StatTile label="Risk findings" value={totalFindings} />
      </div>

      <div className="mt-6">
        <h3 className="mb-3 text-sm text-zinc-500 uppercase tracking-wide">
          Severity distribution
        </h3>
        <SeverityBar
          counts={severityCounts}
          order={SEVERITY_ORDER}
          ariaLabel={`${totalFindings} findings by severity`}
        />
      </div>
    </section>
  );
}
