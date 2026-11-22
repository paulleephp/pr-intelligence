import type { Dispatch, SetStateAction } from "react";
import type { PRAggregate, PRAnalysisResponse } from "@/lib/types/pr/metadata";
import type { ChangedFileRow, FileSeverity, PRReport, SeverityCountMap } from "./report";

export interface StatTileProps {
  label: string;
  value: string | number;
  tone?: string;
  hint?: string;
}

export interface SeverityBadgeProps {
  severity: FileSeverity;
  label?: string;
}

export interface SeverityBarProps {
  counts: SeverityCountMap;
  order: readonly FileSeverity[];
  ariaLabel: string;
}

export interface FileSeverityCellProps {
  row: ChangedFileRow;
}

export interface ChangedFilesTableProps {
  analysis: PRAnalysisResponse;
}

export interface PRDashboardProps {
  analysis: PRAnalysisResponse;
}

export interface PRResultsProps {
  report: PRReport | null;
  loading: boolean;
}

export interface PRSummaryProps {
  report: PRReport;
}

export interface RiskIndicatorProps {
  aggregate: PRAggregate;
}

export interface PRFormProps {
  url: string;
  setUrl: Dispatch<SetStateAction<string>>;
  loading: boolean;
  error: string | null;
  onAnalyze: (url: string) => void;
}
