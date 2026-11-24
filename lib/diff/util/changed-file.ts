import type { ChangedFile } from "@/types/pr/metadata";

export const basename = (filename: string): string => filename.slice(filename.lastIndexOf("/") + 1);

export const extension = (filename: string): string => {
  const name = basename(filename);
  const dot = name.lastIndexOf(".");
  return dot > 0 ? name.slice(dot + 1).toLowerCase() : "";
};

export const hasNoContentChange = ({ patch, additions, deletions }: ChangedFile): boolean =>
  !patch && !additions && !deletions;
