import type { DiffHunks } from "@/types/diff/hunk";
import type { ChangedFile, PRAnalysis } from "@/types/pr/metadata";
import { getCategoryReport } from "./categorize";
import { getSecretsReport } from "./secret";
import { parsePatch } from "./util/parse-patch";

export const analyzeDiff = (changedFiles: ChangedFile[]): PRAnalysis => {
  const secretReports: PRAnalysis["secret"] = [];
  const categoryReports: PRAnalysis["category"] = [];

  for (const changedFile of changedFiles) {
    const { patch, filename, status } = changedFile;
    const hunks: DiffHunks = parsePatch(patch);

    secretReports.push(getSecretsReport({ hunks, filename }));
    categoryReports.push(getCategoryReport({ filename, status }));
  }

  return {
    secret: secretReports,
    category: categoryReports,
  };
};
