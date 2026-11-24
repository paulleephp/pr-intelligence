"use client";

import Skeleton from "react-loading-skeleton";
import "react-loading-skeleton/dist/skeleton.css";

export function PRResultsSkeleton() {
  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 mt-12 duration-500">
      <div className="grid gap-8 lg:grid-cols-3">
        {/* PR Info Skeleton */}
        <div className="rounded-lg border border-zinc-800 bg-zinc-900/30 p-6 backdrop-blur-sm">
          <h2 className="mb-4 text-xl font-bold text-emerald-400">
            <Skeleton width="60%" />
          </h2>

          <div className="mb-6 flex items-center gap-4">
            <Skeleton circle width={48} height={48} />
            <div className="flex-1">
              <Skeleton width="70%" style={{ marginBottom: "0.5rem" }} />
              <Skeleton width="50%" />
            </div>
          </div>

          <div className="space-y-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i}>
                <Skeleton width="40%" style={{ marginBottom: "0.5rem" }} height={16} />
                <Skeleton width="80%" height={20} />
              </div>
            ))}
          </div>
        </div>

        {/* Changed Files Skeleton */}
        <div className="rounded-lg border border-zinc-800 bg-zinc-900/30 p-6 backdrop-blur-sm lg:col-span-2">
          <h2 className="mb-4 text-xl font-bold text-cyan-400">
            <Skeleton width="40%" />
          </h2>

          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-4 backdrop-blur-sm"
              >
                <div className="mb-2 flex items-center justify-between">
                  <Skeleton width="50%" />
                  <Skeleton width="20%" />
                </div>
                <Skeleton width="70%" height={16} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
