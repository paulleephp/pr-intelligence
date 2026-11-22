import type { StatTileProps } from "@/types/ui/components";
export function StatTile({ label, value, tone = "text-white", hint }: StatTileProps) {
  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-950/40 p-4">
      <p className="text-xs text-zinc-500 uppercase tracking-wide">{label}</p>
      <p className={`mt-1 font-bold text-2xl tabular-nums ${tone}`}>{value}</p>
      {hint && <p className="mt-1 text-xs text-zinc-500">{hint}</p>}
    </div>
  );
}
