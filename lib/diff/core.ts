import type { PrChangeSummary } from "@/types/diff/summary";
import type {
  CategoryAnalysis,
  ChangedFile,
  PRAnalysis,
  UnscannedReason,
} from "@/types/pr/metadata";
import { aggregateData } from "./aggregator";
import { getBlastRadius } from "./blast-radius";
import { getCategoryReport } from "./categorize";
import { getCodeReport } from "./code";
import { JS_TS_FILE_PATTERN, PRFileStatus } from "./constants/file";
import { getFileType } from "./file-type";
import { detectPermissionChange } from "./mode-change";
import { getSecretsReport } from "./secret";
import { isBinaryFile } from "./util/is-binary";
import { parsePatch } from "./util/parse-patch";

export function summarizePr(changedFiles: ChangedFile[]): PrChangeSummary {
  let totalLinesAdded = 0;
  let totalLinesRemoved = 0;
  let filesAdded = 0;
  let filesRemoved = 0;
  let filesUnchanged = 0;

  for (const { status, additions, deletions } of changedFiles) {
    totalLinesAdded += additions ?? 0;
    totalLinesRemoved += deletions ?? 0;

    if (status === PRFileStatus.Added) {
      filesAdded++;
    } else if (status === PRFileStatus.Removed || status === PRFileStatus.Deleted) {
      filesRemoved++;
    } else if (status === PRFileStatus.Unchanged) {
      filesUnchanged++;
    }
  }

  const filesModified = changedFiles.length - filesAdded - filesRemoved - filesUnchanged;

  return {
    filesChanged: changedFiles.length,
    totalLinesAdded,
    totalLinesRemoved,
    filesAdded,
    filesRemoved,
    filesModified,
    filesUnchanged,
  };
}

const getUnscannedReason = (patch: string | null | undefined): UnscannedReason | null => {
  if (!patch) {
    return "no-patch";
  }
  return isBinaryFile(patch) ? "binary" : null;
};

const getPathReport = (file: ChangedFile): CategoryAnalysis => {
  const report = getCategoryReport({ filename: file.filename, status: file.status });
  const permissionChange = detectPermissionChange(file);
  return permissionChange
    ? { ...report, category: [...report.category, permissionChange] }
    : report;
};

export const analyzeDiff = (changedFiles: ChangedFile[]): PRAnalysis => {
  const unscannedFiles: PRAnalysis["unscannedFiles"] = [];
  const secretReports: PRAnalysis["secret"] = [];
  const categoryReports: PRAnalysis["category"] = [];
  const codeReports: PRAnalysis["code"] = [];
  const fileTypes: PRAnalysis["fileTypes"] = {};

  for (const file of changedFiles) {
    const { patch, filename } = file;
    fileTypes[filename] = getFileType(filename);
    categoryReports.push(getPathReport(file));

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
  const blastRadius = getBlastRadius(changedFiles);

  return {
    unscannedFiles,
    secret: secretReports,
    category: categoryReports,
    code: codeReports,
    fileTypes,
    aggregate,
    blastRadius,
  };
};
