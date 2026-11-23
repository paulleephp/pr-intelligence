import type { PRResultsProps } from "@/types/ui/components";
import { AffectedAreas } from "./AffectedAreas";
import { ChangedFilesTable } from "./ChangedFilesTable";
import { PRDashboard } from "./PRDashboard";
import { PRResultsSkeleton } from "./PRResultsSkeleton";
import { PRSummary } from "./PRSummary";
import { RiskIndicator } from "./RiskIndicator";

export function PRResults({ report, loading }: PRResultsProps) {
  if (loading) {
    return <PRResultsSkeleton />;
  }

  if (!report) {
    return null;
  }

  const { analysis } = report;

  return (
    <div className="mt-12 space-y-8">
      <PRSummary report={report} />
      <PRDashboard analysis={analysis} />
      <AffectedAreas analysis={analysis} />
      <div className="grid items-start gap-8 lg:grid-cols-5">
        <div className="lg:col-span-2">
          <RiskIndicator aggregate={analysis.analysis.aggregate} />
        </div>
        <div className="min-w-0 lg:col-span-3">
          <ChangedFilesTable analysis={analysis} />
        </div>
      </div>
    </div>
  );
}
