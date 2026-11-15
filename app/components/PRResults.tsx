"use client";

import { PRMetadata, ChangedFile } from "@/types/github";
import { PRInfoCard } from "./PRInfoCard";
import { ChangedFilesCard } from "./ChangedFilesCard";
import { PRResultsSkeleton } from "./PRResultsSkeleton";

interface PRResultsProps {
  prMetadata: PRMetadata | null;
  changedFiles: ChangedFile[];
  loading: boolean;
}

export function PRResults({ prMetadata, changedFiles, loading }: PRResultsProps) {
  if (loading) {
    return <PRResultsSkeleton />;
  }

  if (!prMetadata) {
    return null;
  }

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 mt-12 duration-500">
      <div className="grid gap-8 lg:grid-cols-3">
        <PRInfoCard prMetadata={prMetadata} />
        <ChangedFilesCard changedFiles={changedFiles} />
      </div>
    </div>
  );
}
