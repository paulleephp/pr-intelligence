import type { RiskIndicatorProps } from "@/types/ui/components";
import { SEVERITY_ORDER, SEVERITY_STYLES } from "./_lib/severity";
import { SeverityBadge } from "./severity/SeverityBadge";

export function RiskIndicator({ aggregate }: RiskIndicatorProps) {
  const { ruleCounts, findings, severityCounts } = aggregate;
  const levels = SEVERITY_ORDER.filter((level) => severityCounts[level] > 0);

  return (
    <section className="rounded-lg border border-zinc-800 bg-zinc-900/30 p-6 backdrop-blur-sm">
      <h2 className="mb-4 font-semibold text-cyan-300 text-lg">Risk indicators</h2>

      {levels.length === 0 && (
        <p className="rounded-lg border border-zinc-800 bg-zinc-950/40 p-4 text-sm text-zinc-500">
          No risky changes detected.
        </p>
      )}

      <div className="space-y-5">
        {levels.map((level) => {
          const rules = ruleCounts.filter((rule) => rule.severity === level);
          return (
            <div key={level} className="space-y-2">
              <div className="flex items-center justify-between">
                <SeverityBadge severity={level} />
                <span className={`text-sm tabular-nums ${SEVERITY_STYLES[level].text}`}>
                  {severityCounts[level]} {severityCounts[level] === 1 ? "finding" : "findings"}
                </span>
              </div>
              <ul className="space-y-1.5">
                {rules.map((rule) => {
                  const ruleFindings = findings.filter((f) => f.ruleId === rule.ruleId);
                  return (
                    <li key={rule.ruleId}>
                      <details className="group rounded-md border border-zinc-800 bg-zinc-950/40">
                        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-3 py-2 text-sm">
                          <span className="min-w-0 text-zinc-200">
                            {rule.condition}
                            <span className="ml-2 font-mono text-xs text-zinc-500">
                              {rule.ruleId}
                            </span>
                          </span>
                          <span className="shrink-0 rounded-full bg-zinc-800 px-2 py-0.5 font-semibold text-xs text-zinc-200 tabular-nums">
                            {rule.count}
                          </span>
                        </summary>
                        <ul className="space-y-2 border-zinc-800 border-t px-3 py-2">
                          {ruleFindings.map((finding) => (
                            <li key={`${finding.filename}-${finding.message}`} className="text-xs">
                              <p className="break-all font-mono text-zinc-300">
                                {finding.filename}
                              </p>
                              <p className="text-zinc-500">{finding.message}</p>
                            </li>
                          ))}
                        </ul>
                      </details>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </div>
    </section>
  );
}
