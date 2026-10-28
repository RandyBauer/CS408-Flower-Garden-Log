"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { FormEvent } from "react";
import type { SearchOptions } from "@/lib/garden";
import { filtersToQuery, parseFilters, VERDICT_LABELS, type SearchFilters } from "@/lib/search";
import { Field, useHydrated } from "./forms";
import { inputClass, primaryButton, secondaryButton } from "./styles";

// The search page's filters. Submitting goes to a /search address that holds only the filters
// that are set, so the same address always reproduces the same search. The page passes a new
// key with each search, which resets the fields to the filters in the address.
export function SearchForm({ filters, options }: { filters: SearchFilters; options: SearchOptions }) {
  const router = useRouter();
  const hydrated = useHydrated();

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const params = new URLSearchParams();
    for (const [name, value] of new FormData(event.currentTarget)) {
      if (typeof value !== "string") continue;
      // One list covers zones and beds: "zone-2" or "bed-4".
      if (name === "place") {
        const [kind, id] = value.split("-");
        if (kind === "zone" || kind === "bed") params.set(kind, id);
      } else {
        params.set(name, value);
      }
    }
    const query = filtersToQuery(parseFilters(params));
    router.push(query ? `/search?${query}` : "/search");
  }

  const place = filters.bed !== undefined ? `bed-${filters.bed}` : filters.zone !== undefined ? `zone-${filters.zone}` : "";
  const text = (name: "flower" | "variety" | "color", label: string) => (
    <Field name={name} label={label}>
      <input id={name} name={name} className={inputClass} defaultValue={filters[name]} autoComplete="off" />
    </Field>
  );

  return (
    <form onSubmit={onSubmit} method="get" action="/search" role="search" aria-label="Search plantings" className="space-y-3">
      {text("flower", "Flower")}
      {text("variety", "Variety")}
      {text("color", "Color")}
      <Field name="place" label="Zone or bed">
        <select id="place" name="place" className={inputClass} defaultValue={place}>
          <option value="">Any</option>
          {options.zones.map((zone) => (
            <optgroup key={zone.id} label={zone.name}>
              <option value={`zone-${zone.id}`}>All of {zone.name}</option>
              {options.beds
                .filter((bed) => bed.zoneId === zone.id)
                .map((bed) => (
                  <option key={bed.id} value={`bed-${bed.id}`}>
                    {bed.name}
                  </option>
                ))}
            </optgroup>
          ))}
        </select>
      </Field>
      <Field name="year" label="Year">
        <select id="year" name="year" className={inputClass} defaultValue={filters.year ?? ""}>
          <option value="">Any</option>
          {options.years.map((year) => (
            <option key={year} value={year}>
              {year}
            </option>
          ))}
        </select>
      </Field>
      <Field name="source" label="Source">
        <select id="source" name="source" className={inputClass} defaultValue={filters.source}>
          <option value="">Any</option>
          {options.sources.map((source) => (
            <option key={source} value={source}>
              {source}
            </option>
          ))}
        </select>
      </Field>
      <Field name="verdict" label="Verdict">
        <select id="verdict" name="verdict" className={inputClass} defaultValue={filters.verdict ?? ""}>
          <option value="">Any</option>
          {Object.entries(VERDICT_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label[0].toUpperCase() + label.slice(1)}
            </option>
          ))}
        </select>
      </Field>
      <Field name="type" label="Type">
        <select id="type" name="type" className={inputClass} defaultValue={filters.type ?? ""}>
          <option value="">Any</option>
          <option value="annual">Annual</option>
          <option value="perennial">Perennial</option>
        </select>
      </Field>
      <Field name="status" label="Status">
        <select id="status" name="status" className={inputClass} defaultValue={filters.status ?? ""}>
          <option value="">Current or past</option>
          <option value="current">Growing now</option>
          <option value="past">Past</option>
        </select>
      </Field>
      <div className="flex gap-3 pt-1">
        <button type="submit" className={primaryButton} disabled={!hydrated}>
          Search
        </button>
        <Link href="/search" className={secondaryButton}>
          Clear
        </Link>
      </div>
    </form>
  );
}
