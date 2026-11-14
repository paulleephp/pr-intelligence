"use client";

import Image from "next/image";
import { PRMetadata } from "@/types/github";

interface PRInfoCardProps {
  prMetadata: PRMetadata;
}

export function PRInfoCard({ prMetadata }: PRInfoCardProps) {
  const createdDate = new Date(prMetadata.createdAt).toLocaleDateString();
  const updatedDate = new Date(prMetadata.updatedAt).toLocaleDateString();

  return (
    <div className="space-y-4 lg:col-span-1">
      <div className="rounded-lg border border-zinc-800 bg-zinc-900/30 p-6 backdrop-blur-sm">
        <h2 className="mb-4 text-xl font-semibold text-emerald-400">Pull Request</h2>
        <div className="space-y-3">
          <a
            href={prMetadata.html_url}
            target="_blank"
            rel="noopener noreferrer"
            className="group block"
          >
            <p className="mb-1 text-xs text-zinc-500">PR #{prMetadata.number}</p>
            <h3 className="font-medium text-white transition-colors group-hover:text-emerald-400">
              {prMetadata.title}
            </h3>
          </a>

          <div className="flex items-center gap-3 border-t border-zinc-800 pt-2">
            <Image
              src={prMetadata.user.avatar_url}
              alt={prMetadata.user.login}
              width={40}
              height={40}
              className="rounded-full"
            />
            <div>
              <p className="text-sm text-zinc-300">
                {prMetadata.state === "open" ? "Opened" : "Closed"}
              </p>
              <p className="text-xs text-zinc-500">by @{prMetadata.user.login}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 border-t border-zinc-800 pt-2">
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
              className={`flex items-center gap-2 border-t border-zinc-800 pt-2 text-sm ${
                prMetadata.mergeable ? "text-emerald-400" : "text-red-400"
              }`}
            >
              <span
                className={`h-2 w-2 rounded-full ${
                  prMetadata.mergeable ? "bg-emerald-400" : "bg-red-400"
                }`}
              />
              {prMetadata.mergeable ? "Mergeable" : "Conflicts detected"}
            </div>
          )}
        </div>
      </div>

      {prMetadata.labels && prMetadata.labels.length > 0 && (
        <div className="rounded-lg border border-zinc-800 bg-zinc-900/30 p-4 backdrop-blur-sm">
          <p className="mb-2 text-xs uppercase tracking-wide text-zinc-500">Labels</p>
          <div className="flex flex-wrap gap-1.5">
            {prMetadata.labels.map((label, idx) => (
              <span
                key={idx}
                className="rounded-full border border-zinc-700 bg-zinc-800 px-2.5 py-1 text-xs text-zinc-300"
              >
                {label.name}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
