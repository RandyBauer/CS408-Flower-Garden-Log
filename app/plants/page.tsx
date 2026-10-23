import type { Metadata } from "next";
import { Suspense } from "react";
import { VerdictCounts } from "@/components/Badges";
import { Swatch } from "@/components/Swatch";
import { listLibrary, type LibraryEntry } from "@/lib/garden";
import { requireGardener } from "@/lib/session";

export const metadata: Metadata = { title: "Plant library" };

export default function PlantLibraryPage() {
  return (
    <>
      <h1 className="text-3xl font-semibold">Plant library</h1>
      <p className="mt-1 text-stone-600">
        Every flower, variety, and color grown in the garden. Built from plantings as they are recorded.
      </p>
      <Suspense fallback={<p className="mt-6 text-stone-500">Loading…</p>}>
        <LibraryTable />
      </Suspense>
    </>
  );
}

const th = "border-b border-stone-300 px-4 py-2 font-semibold";
const td = "px-4 py-2.5";

// "2024, 2025, 2026"; a perennial planted once and still in the ground reads "since 2021".
function seasons(entry: LibraryEntry): string {
  const years = entry.years.split(",");
  if (entry.lifecycle === "perennial" && entry.activeCount > 0 && years.length === 1) {
    return `since ${years[0]}`;
  }
  return years.join(", ");
}

async function LibraryTable() {
  await requireGardener();
  const entries = await listLibrary();
  if (entries.length === 0) {
    return <p className="mt-6 text-stone-500">The library fills in as plantings are recorded.</p>;
  }
  return (
    <table className="mt-6 w-full border-collapse overflow-hidden rounded-md border border-stone-300 bg-white text-left text-sm">
      <thead className="bg-stone-100">
        <tr>
          <th className={th}>Flower</th>
          <th className={th}>Variety</th>
          <th className={th}>Color</th>
          <th className={th}>Type</th>
          <th className={th}>Seasons grown</th>
          <th className={th}>Plantings</th>
          <th className={th}>Verdicts</th>
        </tr>
      </thead>
      <tbody>
        {entries.map((entry) => (
          <tr key={entry.id} className="border-b border-stone-200 last:border-0">
            <td className={`${td} font-medium`}>{entry.flower}</td>
            <td className={td}>{entry.variety}</td>
            <td className={td}>
              {entry.color && (
                <span className="flex items-center gap-2">
                  <Swatch color={entry.color} />
                  {entry.color}
                </span>
              )}
            </td>
            <td className={`${td} capitalize`}>{entry.lifecycle}</td>
            <td className={td}>{seasons(entry)}</td>
            <td className={td}>
              {entry.plantingCount}
              {entry.activeCount > 0 && <span className="text-stone-500"> ({entry.activeCount} now)</span>}
            </td>
            <td className={td}>
              <VerdictCounts again={entry.again} maybe={entry.maybe} no={entry.no} />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
