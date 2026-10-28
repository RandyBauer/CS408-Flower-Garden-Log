"use client";

import Link from "next/link";
import { useState } from "react";
import type { LibraryEntry } from "@/lib/garden";
import { VerdictCounts } from "./Badges";
import { inputClass, secondaryButton } from "./styles";
import { Swatch } from "./Swatch";

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

// The plant library table, with a box that narrows it by flower, variety, or color as you type.
export function LibraryTable({ entries }: { entries: LibraryEntry[] }) {
  const [filter, setFilter] = useState("");
  const words = filter.toLowerCase().split(/\s+/).filter(Boolean);
  const shown = entries.filter((entry) => {
    const name = `${entry.flower} ${entry.variety} ${entry.color}`.toLowerCase();
    return words.every((word) => name.includes(word));
  });

  return (
    <>
      <label htmlFor="library-filter" className="sr-only">
        Filter library
      </label>
      <input
        id="library-filter"
        type="search"
        placeholder="Filter library"
        autoComplete="off"
        className={`${inputClass} mt-6`}
        value={filter}
        onChange={(event) => setFilter(event.target.value)}
      />
      {shown.length === 0 ? (
        <p className="mt-4 text-stone-500">No entries match “{filter}”.</p>
      ) : (
        <table className="mt-4 w-full border-collapse overflow-hidden rounded-md border border-stone-300 bg-white text-left text-sm">
          <thead className="bg-stone-100">
            <tr>
              <th className={th}>Flower</th>
              <th className={th}>Variety</th>
              <th className={th}>Color</th>
              <th className={th}>Type</th>
              <th className={th}>Seasons grown</th>
              <th className={th}>Plantings</th>
              <th className={th}>Verdicts</th>
              <th className={th}>
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {shown.map((entry) => (
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
                <td className={`${td} text-right`}>
                  <Link
                    href={`/plants/${entry.id}`}
                    className={`${secondaryButton} !px-3 !py-1`}
                    aria-label={`Open ${[entry.flower, entry.variety, entry.color].filter(Boolean).join(" · ")}`}
                  >
                    Open
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  );
}
