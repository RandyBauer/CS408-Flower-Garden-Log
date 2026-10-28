import type { Lifecycle, Verdict } from "@/lib/garden";

const pill = "inline-block whitespace-nowrap rounded-full border px-2 py-0.5 text-xs leading-none";

export function LifecycleBadge({ lifecycle }: { lifecycle: Lifecycle }) {
  if (lifecycle !== "perennial") return null;
  return <span className={`${pill} border-emerald-700/40 text-emerald-800`}>perennial</span>;
}

const VERDICTS: Record<Verdict, { label: string; style: string }> = {
  again: { label: "Would plant again", style: "border-emerald-700/40 bg-emerald-50 text-emerald-800" },
  maybe: { label: "Maybe", style: "border-amber-600/40 bg-amber-50 text-amber-800" },
  no: { label: "Would not", style: "border-stone-400 bg-stone-100 text-stone-700" },
};

export function VerdictBadge({ verdict }: { verdict: Verdict | null }) {
  if (!verdict) return <span className="text-stone-400">—</span>;
  const { label, style } = VERDICTS[verdict];
  return <span className={`${pill} ${style}`}>{label}</span>;
}

// "2 again · 1 maybe" for the plant library.
export function VerdictCounts({ again, maybe, no }: { again: number; maybe: number; no: number }) {
  const parts = [again > 0 && `${again} again`, maybe > 0 && `${maybe} maybe`, no > 0 && `${no} would not`];
  const text = parts.filter(Boolean).join(" · ");
  return text ? <span>{text}</span> : <span className="text-stone-400">—</span>;
}
