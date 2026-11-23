import { PRFileStatus } from "@/lib/diff/constants/file";
import type { PrChangeSummary } from "@/lib/types/diff/summary";
import type { ChangedFile } from "@/lib/types/pr/metadata";

export const countChangedFiles = ({ filesChanged, filesUnchanged }: PrChangeSummary): number =>
  filesChanged - filesUnchanged;

export const isUnchangedFile = ({ status }: ChangedFile): boolean =>
  status === PRFileStatus.Unchanged;

export const getUnchangedFilenames = (changedFiles: ChangedFile[]): Set<string> => {
  const unchangedFiles = changedFiles.filter(isUnchangedFile);
  return new Set(unchangedFiles.map((file) => file.filename));
};
