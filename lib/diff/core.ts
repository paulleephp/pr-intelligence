import type { DiffHunks } from "@/types/diff/hunk";
import type { PrChangeSummary } from "@/types/diff/summary";
import type { ChangedFile, PRAnalysis } from "@/types/pr/metadata";
import { aggregateData } from "./aggregator";
import { getCategoryReport } from "./categorize";
import { getCodeReport } from "./code";
import { getFileType } from "./file-type";
import { getSecretsReport } from "./secret";
import { isBinaryFile } from "./util/is-binary";
import { parsePatch } from "./util/parse-patch";

export function summarizePr(changedFiles: ChangedFile[]): PrChangeSummary {
  const filesChanged = changedFiles.length;
  let totalLinesAdded = 0;
  let totalLinesRemoved = 0;
  let filesAdded = 0;
  let filesRemoved = 0;
  let filesDeleted = 0;

  for (const file of changedFiles) {
    const { status, additions, deletions } = file;

    totalLinesAdded += additions ?? 0;
    totalLinesRemoved += deletions ?? 0;

    if (status === "added") {
      filesAdded++;
    } else if (status === "removed" || status === "deleted") {
      filesRemoved++;
      filesDeleted++;
    }
  }

  return {
    filesChanged,
    totalLinesAdded,
    totalLinesRemoved,
    filesAdded,
    filesRemoved,
    filesDeleted,
  };
}

export const analyzeDiff = (changedFiles: ChangedFile[]): PRAnalysis => {
  const secretReports: PRAnalysis["secret"] = [];
  const categoryReports: PRAnalysis["category"] = [];
  const codeReports: PRAnalysis["code"] = [];
  const fileTypes: PRAnalysis["fileTypes"] = {};

  for (const changedFile of changedFiles) {
    const { patch, filename, status } = changedFile;
    fileTypes[filename] = getFileType(filename);

    // Skip analysis for binary files - they don't have readable text content
    if (isBinaryFile(patch)) {
      continue;
    }

    const hunks: DiffHunks = parsePatch(patch);

    secretReports.push(getSecretsReport({ hunks, filename }));
    categoryReports.push(getCategoryReport({ filename, status }));
    codeReports.push(getCodeReport({ hunks, filename, status }));
  }

  const aggregate = aggregateData({
    secretReports,
    categoryReports,
    codeReports,
  });

  return {
    secret: secretReports,
    category: categoryReports,
    code: codeReports,
    fileTypes,
    aggregate,
  };
};
