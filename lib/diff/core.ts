import type { PrChangeSummary } from "@/types/diff/summary";
import type { ChangedFile, PRAnalysis, UnscannedReason } from "@/types/pr/metadata";
import { aggregateData } from "./aggregator";
import { getCategoryReport } from "./categorize";
import { getCodeReport } from "./code";
import { JS_TS_FILE_PATTERN, PRFileStatus } from "./constants/file";
import { getFileType } from "./file-type";
import { getSecretsReport } from "./secret";
import { isBinaryFile } from "./util/is-binary";
import { parsePatch } from "./util/parse-patch";

export function summarizePr(changedFiles: ChangedFile[]): PrChangeSummary {
  let totalLinesAdded = 0;
  let totalLinesRemoved = 0;
  let filesAdded = 0;
  let filesRemoved = 0;

  for (const { status, additions, deletions } of changedFiles) {
    totalLinesAdded += additions ?? 0;
    totalLinesRemoved += deletions ?? 0;

    if (status === PRFileStatus.Added) {
      filesAdded++;
    } else if (status === PRFileStatus.Removed || status === PRFileStatus.Deleted) {
      filesRemoved++;
    }
  }

  return {
    filesChanged: changedFiles.length,
    totalLinesAdded,
    totalLinesRemoved,
    filesAdded,
    filesRemoved,
  };
}

const getUnscannedReason = (patch: string | null | undefined): UnscannedReason | null => {
  if (!patch) {
    return "no-patch";
  }
  return isBinaryFile(patch) ? "binary" : null;
};

export const analyzeDiff = (changedFiles: ChangedFile[]): PRAnalysis => {
  const unscannedFiles: PRAnalysis["unscannedFiles"] = [];
  const secretReports: PRAnalysis["secret"] = [];
  const categoryReports: PRAnalysis["category"] = [];
  const codeReports: PRAnalysis["code"] = [];
  const fileTypes: PRAnalysis["fileTypes"] = {};

  for (const { patch, filename, status } of changedFiles) {
    fileTypes[filename] = getFileType(filename);
    categoryReports.push(getCategoryReport({ filename, status }));

    const unscannedReason = getUnscannedReason(patch);
    if (unscannedReason) {
      unscannedFiles.push({ filename, reason: unscannedReason });
      continue;
    }

    const hunks = parsePatch(patch);
    secretReports.push(getSecretsReport({ hunks, filename }));
    const scanCodePatterns = JS_TS_FILE_PATTERN.test(filename);
    codeReports.push(getCodeReport({ hunks, filename, scanCodePatterns }));
  }

  const aggregate = aggregateData({ secretReports, categoryReports, codeReports });

  return {
    unscannedFiles,
    secret: secretReports,
    category: categoryReports,
    code: codeReports,
    fileTypes,
    aggregate,
  };
};
