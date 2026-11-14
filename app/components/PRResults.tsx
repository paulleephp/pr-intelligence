"use client";

import { PRMetadata, ChangedFile } from "@/types/github";
import { PRInfoCard } from "./PRInfoCard";
import { ChangedFilesCard } from "./ChangedFilesCard";

interface PRResultsProps {
  prMetadata: PRMetadata | null;
  changedFiles: ChangedFile[];
  loading: boolean;
}

export function PRResults({ prMetadata, changedFiles, loading }: PRResultsProps) {
  if (!prMetadata || loading || changedFiles.length === 0) {
    return null;
  }

  return (
    <div className="mt-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="grid lg:grid-cols-3 gap-8">
        <PRInfoCard prMetadata={prMetadata} />
        <ChangedFilesCard changedFiles={changedFiles} />
      </div>
    </div>
  );
}
