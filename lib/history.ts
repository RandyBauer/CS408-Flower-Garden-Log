// Which years a planting was in the ground, and a bed's history grouped by year.
// No Node.js imports. The search page's year filter applies the same rule in SQL (ACTIVE_IN_YEAR
// in lib/search.ts), and a unit test checks that the two agree.

// The years from the one it was planted in through the one it was removed in, newest first. A
// planting still in the ground counts through `thisYear`, so a perennial planted in 2021 counts for
// every year since. Dates are ISO text, so the year is the first four characters.
export function activeYears(plantedOn: string, removedOn: string | null, thisYear: number): number[] {
  const first = Number(plantedOn.slice(0, 4));
  const last = removedOn ? Number(removedOn.slice(0, 4)) : Math.max(first, thisYear);
  const years: number[] = [];
  for (let year = last; year >= first; year--) years.push(year);
  return years;
}

export interface YearGroup<T> {
  year: number;
  plantings: T[];
}

// Lists each planting under every year it was in the ground, newest year first. Within a year the
// plantings keep the order they were given in.
export function groupByYear<T extends { plantedOn: string; removedOn: string | null }>(
  plantings: T[],
  thisYear: number,
): YearGroup<T>[] {
  const groups = new Map<number, T[]>();
  for (const planting of plantings) {
    for (const year of activeYears(planting.plantedOn, planting.removedOn, thisYear)) {
      const group = groups.get(year);
      if (group) group.push(planting);
      else groups.set(year, [planting]);
    }
  }
  return [...groups]
    .sort(([a], [b]) => b - a)
    .map(([year, group]) => ({ year, plantings: group }));
}
