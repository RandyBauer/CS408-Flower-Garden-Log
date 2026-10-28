import type { Metadata } from "next";
import { Suspense } from "react";
import { LibraryTable } from "@/components/LibraryTable";
import { listLibrary } from "@/lib/garden";
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
        <Library />
      </Suspense>
    </>
  );
}

async function Library() {
  await requireGardener();
  const entries = await listLibrary();
  if (entries.length === 0) {
    return <p className="mt-6 text-stone-500">The library fills in as plantings are recorded.</p>;
  }
  return <LibraryTable entries={entries} />;
}
