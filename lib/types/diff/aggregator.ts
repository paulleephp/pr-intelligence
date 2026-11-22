import type { PRAnalysis } from "../pr/metadata";

export interface AggregateArgs {
  secretReports: PRAnalysis["secret"];
  categoryReports: PRAnalysis["category"];
  codeReports: PRAnalysis["code"];
}
