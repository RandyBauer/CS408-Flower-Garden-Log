import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { VerdictBadge } from "@/components/Badges";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { TagPhotoThumb } from "@/components/TagPhoto";
import { primaryButton, secondaryButton } from "@/components/styles";
import { formatDate, parseId, plantName } from "@/lib/format";
import { getBed, listCurrentPlantings, listPastPlantings } from "@/lib/garden";
import { groupByYear } from "@/lib/history";
import { requireGardener } from "@/lib/session";

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
const photoTd = "w-16 px-4 py-1.5";
const table =
  "mt-3 w-full border-collapse overflow-hidden rounded-md border border-stone-300 bg-white text-left text-sm";

const editLink = `${secondaryButton} !px-3 !py-1`;

async function BedDetail({ params }: { params: Promise<{ bedId: string }> }) {
  await requireGardener();
  const id = parseId((await params).bedId);
  const bed = id ? await getBed(id) : undefined;
  if (!bed) notFound();
  const [current, past] = await Promise.all([listCurrentPlantings(bed.id), listPastPlantings(bed.id)]);
  // Past plantings only, so each has a removal date and the current year does not matter.
  const history = groupByYear(past, new Date().getFullYear());

  return (
    <>
      <Breadcrumbs
        trail={[
          { href: "/zones", label: "Zones" },
          { href: `/zones/${bed.zoneId}`, label: bed.zoneName },
          { label: bed.name },
        ]}
      />
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold">{bed.name}</h1>
          <p className="mt-1 text-stone-600">
            {bed.kind === "rack" ? "Grow rack" : "Outdoor bed"}
            {bed.locationNote && ` · ${bed.locationNote}`}
          </p>
        </div>
        <Link href={`/beds/${bed.id}/edit`} className={secondaryButton}>
          Edit bed
        </Link>
      </div>
      <Link href={`/plantings/new?bed=${bed.id}`} className={`${primaryButton} mt-4 inline-block`}>
        + Add planting
      </Link>

      <section className="mt-8">
        <h2 className="text-xl font-semibold">Growing now</h2>
        {current.length === 0 ? (
          <p className="mt-2 text-stone-500">Nothing is planted in this bed now.</p>
        ) : (
          <table className={table}>
            <thead className="bg-stone-100">
              <tr>
                <th className={th}>Photo</th>
                <th className={th}>Flower</th>
                <th className={th}>Variety</th>
                <th className={th}>Color</th>
                <th className={th}>Type</th>
                <th className={th}>Qty</th>
                <th className={th}>Planted</th>
                <th className={th}>Source</th>
                <th className={th}>
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {current.map((planting) => (
                <tr key={planting.id} className="border-b border-stone-200 last:border-0">
                  <td className={photoTd}>
                    <TagPhotoThumb planting={planting} />
                  </td>
                  <td className={td}>{planting.flower}</td>
                  <td className={td}>{planting.variety}</td>
                  <td className={td}>{planting.color}</td>
                  <td className={`${td} capitalize`}>{planting.lifecycle}</td>
                  <td className={td}>{planting.quantity}</td>
                  <td className={td}>{formatDate(planting.plantedOn)}</td>
                  <td className={td}>
                    {planting.source}
                    {planting.notes && <span className="block text-xs text-stone-500">{planting.notes}</span>}
                  </td>
                  <td className={`${td} text-right`}>
                    <Link href={`/plantings/${planting.id}/edit`} className={editLink} aria-label={`Edit ${plantName(planting)}`}>
                      Edit
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section className="mt-8">
        <h2 className="text-xl font-semibold">History</h2>
        {history.length === 0 ? (
          <p className="mt-2 text-stone-500">No past plantings recorded for this bed.</p>
        ) : (
          <p className="mt-1 text-sm text-stone-500">
            Plantings that have ended, under each year they were in the ground.
          </p>
        )}
        {history.map(({ year, plantings }) => (
          <section key={year} aria-labelledby={`year-${year}`} className="mt-5">
            <h3 id={`year-${year}`} className="text-lg font-semibold">
              {year}
            </h3>
            <table className={`${table} !mt-2`}>
              <thead className="bg-stone-100">
                <tr>
                  <th className={th}>Photo</th>
                  <th className={th}>Planting</th>
                  <th className={th}>Source</th>
                  <th className={th}>Planted</th>
                  <th className={th}>Removed</th>
                  <th className={th}>Verdict</th>
                  <th className={th}>
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {plantings.map((planting) => (
                  <tr key={planting.id} className="border-b border-stone-200 last:border-0">
                    <td className={photoTd}>
                      <TagPhotoThumb planting={planting} />
                    </td>
                    <td className={td}>
                      {plantName(planting)}
                      {planting.quantity > 1 && ` ×${planting.quantity}`}
                    </td>
                    <td className={td}>{planting.source}</td>
                    <td className={td}>{formatDate(planting.plantedOn)}</td>
                    <td className={td}>{planting.removedOn && formatDate(planting.removedOn)}</td>
                    <td className={td}>
                      <VerdictBadge verdict={planting.verdict} />
                      {planting.verdictNote && (
                        <span className="ml-2 text-xs text-stone-500">{planting.verdictNote}</span>
                      )}
                    </td>
                    <td className={`${td} text-right`}>
                      <Link
                        href={`/plantings/${planting.id}/edit`}
                        className={editLink}
                        aria-label={`Edit ${plantName(planting)}`}
                      >
                        Edit
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        ))}
      </section>
    </>
  );
}
