import Link from "next/link";
import { Suspense } from "react";
import { Swatch } from "@/components/Swatch";
import { listGrowingNow } from "@/lib/garden";
import { sections } from "@/lib/sections";

export default function Home() {
  return (
    <>
      <section className="rounded-lg border border-stone-300 bg-white px-6 py-12 text-center">
        <h1 className="text-4xl font-semibold text-emerald-900">Flower Garden Log</h1>
        <p className="mt-3 text-lg text-stone-600">
          A record of what grows in the garden, bed by bed and season by season.
        </p>
      </section>

      <section className="mt-10">
        <h2 className="mb-3 text-xl font-semibold">Growing now</h2>
        <Suspense fallback={<p className="text-stone-500">Loading…</p>}>
          <GrowingNow />
        </Suspense>
      </section>

      <section className="mt-10">
        <h2 className="mb-3 text-xl font-semibold">Sections</h2>
        <nav aria-label="Sections" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {sections.map((section) => (
            <Link
              key={section.href}
              href={section.href}
              className="rounded-md border border-stone-300 bg-white px-4 py-3 hover:border-emerald-700 hover:bg-emerald-50"
            >
              <span className="font-medium">{section.label}</span>
              <span className="mt-1 block text-sm text-stone-600">{section.description}</span>
            </Link>
          ))}
        </nav>
      </section>
    </>
  );
}

async function GrowingNow() {
  const plantings = await listGrowingNow();
  if (plantings.length === 0) {
    return <p className="text-stone-500">Nothing is planted yet.</p>;
  }
  return (
    <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {plantings.map((planting) => (
        <li key={planting.id}>
          <Link
            href={`/beds/${planting.bedId}`}
            className="block overflow-hidden rounded-md border border-stone-300 bg-white hover:border-emerald-700"
          >
            <Swatch color={planting.color} className="block h-24 w-full rounded-none border-0 border-b" />
            <div className="px-4 py-3">
              <p className="font-semibold">{planting.flower}</p>
              <p className="text-sm text-stone-600">
                {[planting.variety, planting.color, planting.bedName].filter(Boolean).join(" · ")}
              </p>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}
