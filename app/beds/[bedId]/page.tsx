import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { VerdictBadge } from "@/components/Badges";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { Swatch } from "@/components/Swatch";
import { formatDate, parseId, plantName, seasonLabel } from "@/lib/format";
import { getBed, listCurrentPlantings, listPastPlantings } from "@/lib/garden";

export async function generateMetadata({ params }: PageProps<"/beds/[bedId]">): Promise<Metadata> {
  const id = parseId((await params).bedId);
  const bed = id ? await getBed(id) : undefined;
  return { title: bed?.name ?? "Bed not found" };
}

export default function BedPage({ params }: PageProps<"/beds/[bedId]">) {
  return (
    <Suspense fallback={<p className="text-stone-500">Loading…</p>}>
      <BedDetail params={params} />
    </Suspense>
  );
}

const th = "border-b border-stone-300 px-4 py-2 font-semibold";
const td = "px-4 py-2.5";
const table =
  "mt-3 w-full border-collapse overflow-hidden rounded-md border border-stone-300 bg-white text-left text-sm";

async function BedDetail({ params }: { params: Promise<{ bedId: string }> }) {
  const id = parseId((await params).bedId);
  const bed = id ? await getBed(id) : undefined;
  if (!bed) notFound();
  const [current, past] = await Promise.all([listCurrentPlantings(bed.id), listPastPlantings(bed.id)]);

  return (
    <>
      <Breadcrumbs
        trail={[
          { href: "/zones", label: "Zones" },
          { href: `/zones/${bed.zoneId}`, label: bed.zoneName },
          { label: bed.name },
        ]}
      />
      <h1 className="text-3xl font-semibold">{bed.name}</h1>
      <p className="mt-1 text-stone-600">
        {bed.kind === "rack" ? "Grow rack" : "Outdoor bed"}
        {bed.locationNote && ` · ${bed.locationNote}`}
      </p>

      <section className="mt-8">
        <h2 className="text-xl font-semibold">Growing now</h2>
        {current.length === 0 ? (
          <p className="mt-2 text-stone-500">Nothing is planted in this bed now.</p>
        ) : (
          <table className={table}>
            <thead className="bg-stone-100">
              <tr>
                <th className={th}>Flower</th>
                <th className={th}>Variety</th>
                <th className={th}>Color</th>
                <th className={th}>Type</th>
                <th className={th}>Qty</th>
                <th className={th}>Planted</th>
                <th className={th}>Source</th>
              </tr>
            </thead>
            <tbody>
              {current.map((planting) => (
                <tr key={planting.id} className="border-b border-stone-200 last:border-0">
                  <td className={td}>{planting.flower}</td>
                  <td className={td}>{planting.variety}</td>
                  <td className={td}>
                    <span className="flex items-center gap-2">
                      <Swatch color={planting.color} />
                      {planting.color}
                    </span>
                  </td>
                  <td className={`${td} capitalize`}>{planting.lifecycle}</td>
                  <td className={td}>{planting.quantity}</td>
                  <td className={td}>{formatDate(planting.plantedOn)}</td>
                  <td className={td}>
                    {planting.source}
                    {planting.notes && <span className="block text-xs text-stone-500">{planting.notes}</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section className="mt-8">
        <h2 className="text-xl font-semibold">History</h2>
        {past.length === 0 ? (
          <p className="mt-2 text-stone-500">No past plantings recorded for this bed.</p>
        ) : (
          <table className={table}>
            <thead className="bg-stone-100">
              <tr>
                <th className={th}>Year</th>
                <th className={th}>Planting</th>
                <th className={th}>Source</th>
                <th className={th}>Removed</th>
                <th className={th}>Verdict</th>
              </tr>
            </thead>
            <tbody>
              {past.map((planting) => (
                <tr key={planting.id} className="border-b border-stone-200 last:border-0">
                  <td className={td}>{seasonLabel(planting.plantedOn, planting.removedOn)}</td>
                  <td className={td}>
                    <span className="flex items-center gap-2">
                      <Swatch color={planting.color} />
                      {plantName(planting)}
                      {planting.quantity > 1 && ` ×${planting.quantity}`}
                    </span>
                  </td>
                  <td className={td}>{planting.source}</td>
                  <td className={td}>{planting.removedOn && formatDate(planting.removedOn)}</td>
                  <td className={td}>
                    <VerdictBadge verdict={planting.verdict} />
                    {planting.verdictNote && (
                      <span className="ml-2 text-xs text-stone-500">{planting.verdictNote}</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </>
  );
}
