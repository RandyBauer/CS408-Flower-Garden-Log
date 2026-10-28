// Search filters: read from the address, written back to it, and turned into a SQL WHERE clause.
// Every search is a URL, so a result can be bookmarked or shared and reproduced exactly.
// No Node.js imports, so the search form can use it in the browser.

import type { Lifecycle, Verdict } from "./validation";

export type Status = "current" | "past";

export interface SearchFilters {
  flower: string;
  variety: string;
  color: string;
  zone?: number;
  bed?: number;
  year?: number;
  source: string;
  verdict?: Verdict;
  type?: Lifecycle;
  status?: Status;
}

// URL parameter names, in the order they are written to the address.
export const FILTER_NAMES = [
  "flower",
  "variety",
  "color",
  "zone",
  "bed",
  "year",
  "source",
  "verdict",
  "type",
  "status",
] as const;

export const NO_FILTERS: SearchFilters = { flower: "", variety: "", color: "", source: "" };

export const VERDICT_LABELS: Record<Verdict, string> = {
  again: "would plant again",
  maybe: "maybe",
  no: "would not",
};

const MAX_TEXT = 80;

type ParamSource = URLSearchParams | Record<string, string | string[] | undefined>;

function param(params: ParamSource, name: string): string {
  const value = params instanceof URLSearchParams ? params.get(name) : params[name];
  const first = Array.isArray(value) ? value[0] : value;
  return typeof first === "string" ? first.trim().slice(0, MAX_TEXT) : "";
}

function id(value: string): number | undefined {
  return /^[1-9]\d{0,9}$/.test(value) ? Number(value) : undefined;
}

function oneOf<T extends string>(value: string, allowed: readonly T[]): T | undefined {
  return (allowed as readonly string[]).includes(value) ? (value as T) : undefined;
}

// Reads the filters from a URL. Values that are not valid for their filter are dropped.
export function parseFilters(params: ParamSource): SearchFilters {
  const year = param(params, "year");
  return {
    flower: param(params, "flower"),
    variety: param(params, "variety"),
    color: param(params, "color"),
    zone: id(param(params, "zone")),
    bed: id(param(params, "bed")),
    year: /^\d{4}$/.test(year) ? Number(year) : undefined,
    source: param(params, "source"),
    verdict: oneOf(param(params, "verdict"), ["again", "maybe", "no"] as const),
    type: oneOf(param(params, "type"), ["annual", "perennial"] as const),
    status: oneOf(param(params, "status"), ["current", "past"] as const),
  };
}

// "color=coral&verdict=again": only the filters that are set, always in the same order.
export function filtersToQuery(filters: SearchFilters): string {
  const params = new URLSearchParams();
  for (const name of FILTER_NAMES) {
    const value = filters[name];
    if (value !== undefined && value !== "") params.set(name, String(value));
  }
  return params.toString();
}

export function hasFilters(filters: SearchFilters): boolean {
  return filtersToQuery(filters) !== "";
}

// Escapes LIKE wildcards so "50%" matches the text "50%".
function contains(value: string): string {
  return `%${value.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
}

// SQL for "this planting was in the ground at some point during the year". A perennial planted
// in 2021 and still growing counts for every year since.
export const ACTIVE_IN_YEAR =
  "(substr(p.planted_on, 1, 4) <= ? AND (p.removed_on IS NULL OR substr(p.removed_on, 1, 4) >= ?))";

// Builds the WHERE clause for a search. The SQL expects plantings as p, plants as pl, and beds
// as b. Flower, variety, and color match any part of the text; the other filters match exactly.
// Text comparisons ignore case.
export function buildSearchQuery(filters: SearchFilters): { where: string; params: (string | number)[] } {
  const clauses: string[] = [];
  const params: (string | number)[] = [];
  const add = (clause: string, ...values: (string | number)[]) => {
    clauses.push(clause);
    params.push(...values);
  };

  if (filters.flower) add("pl.flower LIKE ? ESCAPE '\\'", contains(filters.flower));
  if (filters.variety) add("pl.variety LIKE ? ESCAPE '\\'", contains(filters.variety));
  if (filters.color) add("pl.color LIKE ? ESCAPE '\\'", contains(filters.color));
  if (filters.zone !== undefined) add("b.zone_id = ?", filters.zone);
  if (filters.bed !== undefined) add("p.bed_id = ?", filters.bed);
  if (filters.year !== undefined) add(ACTIVE_IN_YEAR, String(filters.year), String(filters.year));
  if (filters.source) add("p.source = ? COLLATE NOCASE", filters.source);
  if (filters.verdict) add("p.verdict = ?", filters.verdict);
  if (filters.type) add("pl.lifecycle = ?", filters.type);
  if (filters.status === "current") add("p.removed_on IS NULL");
  if (filters.status === "past") add("p.removed_on IS NOT NULL");

  return { where: clauses.length > 0 ? clauses.join(" AND ") : "1 = 1", params };
}

// Labels for the filters in use, for the line above the results: ["color: coral", ...].
// Zone and bed names come from the page, which has them.
export function describeFilters(
  filters: SearchFilters,
  names: { zone?: string; bed?: string } = {},
): string[] {
  const parts: string[] = [];
  if (filters.flower) parts.push(`flower: ${filters.flower}`);
  if (filters.variety) parts.push(`variety: ${filters.variety}`);
  if (filters.color) parts.push(`color: ${filters.color}`);
  if (filters.zone !== undefined) parts.push(`zone: ${names.zone ?? filters.zone}`);
  if (filters.bed !== undefined) parts.push(`bed: ${names.bed ?? filters.bed}`);
  if (filters.year !== undefined) parts.push(`year: ${filters.year}`);
  if (filters.source) parts.push(`source: ${filters.source}`);
  if (filters.verdict) parts.push(`verdict: ${VERDICT_LABELS[filters.verdict]}`);
  if (filters.type) parts.push(filters.type === "annual" ? "annuals" : "perennials");
  if (filters.status) parts.push(filters.status === "current" ? "growing now" : "past");
  return parts;
}

// Shown on the search page when no filter is set, in place of results.
export function exampleSearches(currentYear: number): { label: string; query: string }[] {
  const lastYear = currentYear - 1;
  return [
    { label: "Coral flowers marked “would plant again”", query: "color=coral&verdict=again" },
    { label: "Everything marked “would not” plant again", query: "verdict=no" },
    { label: "Perennials in the ground now", query: "type=perennial&status=current" },
    { label: `Annuals grown in ${lastYear}`, query: `year=${lastYear}&type=annual` },
    { label: "Petunias from any year", query: "flower=petunia" },
  ];
}
