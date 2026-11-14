"use client";

import { PRMetadata } from "@/types/github";

interface PRInfoCardProps {
  prMetadata: PRMetadata;
}

export function PRInfoCard({ prMetadata }: PRInfoCardProps) {
  const createdDate = new Date(prMetadata.createdAt).toLocaleDateString();
  const updatedDate = new Date(prMetadata.updatedAt).toLocaleDateString();

  return (
    <div className="lg:col-span-1 space-y-4">
      <div className="bg-zinc-900/30 backdrop-blur-sm border border-zinc-800 rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-4 text-emerald-400">Pull Request</h2>
        <div className="space-y-3">
          <a
            href={prMetadata.html_url}
            target="_blank"
            rel="noopener noreferrer"
            className="block group"
          >
            <p className="text-xs text-zinc-500 mb-1">PR #{prMetadata.number}</p>
            <h3 className="font-medium text-white group-hover:text-emerald-400 transition-colors">
              {prMetadata.title}
            </h3>
          </a>

          <div className="flex items-center gap-3 pt-2 border-t border-zinc-800">
            <img
              src={prMetadata.user.avatar_url}
              alt={prMetadata.user.login}
              className="w-10 h-10 rounded-full"
            />
            <div>
              <p className="text-sm text-zinc-300">
                {prMetadata.state === "open" ? "Opened" : "Closed"}
              </p>
              <p className="text-xs text-zinc-500">by @{prMetadata.user.login}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-zinc-800">
            <div className="space-y-1">
              <p className="text-xs text-zinc-500">Created</p>
              <p className="text-sm text-zinc-300">{createdDate}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-zinc-500">Updated</p>
              <p className="text-sm text-zinc-300">{updatedDate}</p>
            </div>
          </div>

          {prMetadata.mergeable !== null && (
            <div
              className={`pt-2 border-t border-zinc-800 flex items-center gap-2 text-sm ${
                prMetadata.mergeable ? "text-emerald-400" : "text-red-400"
              }`}
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  prMetadata.mergeable ? "bg-emerald-400" : "bg-red-400"
                }`}
              />
              {prMetadata.mergeable ? "Mergeable" : "Conflicts detected"}
            </div>
          )}
        </div>
      </div>

      {prMetadata.labels && prMetadata.labels.length > 0 && (
        <div className="bg-zinc-900/30 backdrop-blur-sm border border-zinc-800 rounded-lg p-4">
          <p className="text-xs text-zinc-500 mb-2 uppercase tracking-wide">Labels</p>
          <div className="flex flex-wrap gap-1.5">
            {prMetadata.labels.map((label, idx) => (
              <span key={idx} className="px-2.5 py-1 text-xs rounded-full bg-zinc-800 border border-zinc-700 text-zinc-300">
                {label.name}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
