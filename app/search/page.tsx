import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { VerdictBadge } from "@/components/Badges";
import { SearchForm } from "@/components/SearchForm";
import { Swatch } from "@/components/Swatch";
import { plantName, seasonLabel } from "@/lib/format";
import { listSearchOptions, SEARCH_LIMIT, searchPlantings, type SearchOptions } from "@/lib/garden";
import { describeFilters, exampleSearches, filtersToQuery, hasFilters, parseFilters, type SearchFilters } from "@/lib/search";
import { requireGardener } from "@/lib/session";

export const metadata: Metadata = { title: "Search" };

export default function SearchPage({ searchParams }: PageProps<"/search">) {
  return (
    <>
      <h1 className="text-3xl font-semibold">Search</h1>
      <p className="mt-1 text-stone-600">
        Combine any filters. With no filters set, example searches are shown instead of results.
      </p>
      <Suspense fallback={<p className="mt-6 text-stone-500">Loading…</p>}>
        <Search searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function Search({ searchParams }: { searchParams: PageProps<"/search">["searchParams"] }) {
  await requireGardener();
  const filters = parseFilters(await searchParams);
  const options = await listSearchOptions();
  const query = filtersToQuery(filters);

  return (
    <div className="mt-6 grid items-start gap-6 md:grid-cols-[15rem_1fr]">
      <aside className="rounded-md border border-stone-300 bg-white p-4">
        <SearchForm key={query} filters={filters} options={options} />
      </aside>
      <div>{hasFilters(filters) ? <Results filters={filters} options={options} /> : <Examples />}</div>
    </div>
  );
}

function Examples() {
  const examples = exampleSearches(new Date().getFullYear());
  return (
    <section aria-labelledby="examples">
      <h2 id="examples" className="text-xl font-semibold">
        Example searches
      </h2>
      <ul className="mt-3 space-y-2">
        {examples.map((example) => (
          <li key={example.query}>
            <Link href={`/search?${example.query}`} className="text-emerald-800 underline-offset-4 hover:underline">
              {example.label}
            </Link>
            <span className="ml-2 text-xs text-stone-500">/search?{example.query}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

const th = "border-b border-stone-300 px-4 py-2 font-semibold";
const td = "px-4 py-2.5";

async function Results({ filters, options }: { filters: SearchFilters; options: SearchOptions }) {
  const { plantings, more } = await searchPlantings(filters);
  const labels = describeFilters(filters, {
    zone: options.zones.find((zone) => zone.id === filters.zone)?.name,
    bed: options.beds.find((bed) => bed.id === filters.bed)?.name,
  });
  const count = `${more ? `First ${SEARCH_LIMIT}` : plantings.length} ${plantings.length === 1 ? "planting" : "plantings"}`;

  return (
    <section aria-label="Results">
      <p>
        <strong>{count}</strong> · {labels.join(" · ")}
      </p>
      <p className="mt-1 text-xs text-stone-500">/search?{filtersToQuery(filters)}</p>
      {plantings.length === 0 ? (
        <p className="mt-4 text-stone-500">No plantings match. Try removing a filter.</p>
      ) : (
        <table className="mt-3 w-full border-collapse overflow-hidden rounded-md border border-stone-300 bg-white text-left text-sm">
          <thead className="bg-stone-100">
            <tr>
              <th className={th}>Year</th>
              <th className={th}>Planting</th>
              <th className={th}>Bed</th>
              <th className={th}>Source</th>
              <th className={th}>Verdict</th>
            </tr>
          </thead>
          <tbody>
            {plantings.map((planting) => (
              <tr key={planting.id} className="border-b border-stone-200 last:border-0">
                <td className={td}>
                  {seasonLabel(planting.plantedOn, planting.removedOn)}
                  {!planting.removedOn && <span className="block text-xs text-emerald-800">growing now</span>}
                </td>
                <td className={td}>
                  <Link href={`/plants/${planting.plantId}`} className="flex items-center gap-2 hover:underline">
                    <Swatch color={planting.color} />
                    {plantName(planting)}
                  </Link>
                </td>
                <td className={td}>
                  <Link href={`/beds/${planting.bedId}`} className="hover:underline">
                    {planting.bedName}
                  </Link>
                </td>
                <td className={td}>{planting.source}</td>
                <td className={td}>
                  <VerdictBadge verdict={planting.verdict} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
