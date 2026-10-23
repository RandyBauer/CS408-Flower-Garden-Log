import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { LifecycleBadge } from "@/components/Badges";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { BedForm } from "@/components/GardenForms";
import { DeleteButton } from "@/components/forms";
import { secondaryButton } from "@/components/styles";
import { Swatch } from "@/components/Swatch";
import { deleteBedAction, saveBed } from "@/lib/actions";
import { parseId, plantName } from "@/lib/format";
import { getZone, listBedsInZone } from "@/lib/garden";
import { requireGardener } from "@/lib/session";

export async function generateMetadata({ params }: PageProps<"/zones/[zoneId]">): Promise<Metadata> {
  const id = parseId((await params).zoneId);
  const zone = id ? await getZone(id) : undefined;
  return { title: zone?.name ?? "Zone not found" };
}

export default function ZonePage({ params }: PageProps<"/zones/[zoneId]">) {
  return (
    <Suspense fallback={<p className="text-stone-500">Loading…</p>}>
      <ZoneDetail params={params} />
    </Suspense>
  );
}

const smallButton = `${secondaryButton} !px-3 !py-1`;

async function ZoneDetail({ params }: { params: Promise<{ zoneId: string }> }) {
  await requireGardener();
  const id = parseId((await params).zoneId);
  const zone = id ? await getZone(id) : undefined;
  if (!zone) notFound();
  const beds = await listBedsInZone(zone.id);

  return (
    <>
      <Breadcrumbs trail={[{ href: "/zones", label: "Zones" }, { label: zone.name }]} />
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold">{zone.name}</h1>
          {zone.description && <p className="mt-1 text-stone-600">{zone.description}</p>}
        </div>
        <Link href={`/zones/${zone.id}/edit`} className={secondaryButton}>
          Edit zone
        </Link>
      </div>

      {beds.length === 0 ? (
        <p className="mt-6 text-stone-500">This zone has no beds yet. Add one below.</p>
      ) : (
        <>
          <ul className="mt-6 grid gap-4 md:grid-cols-2">
            {beds.map((bed) => (
              <li key={bed.id} className="flex flex-col rounded-md border border-stone-300 bg-white p-4">
                <h2>
                  <Link href={`/beds/${bed.id}`} className="text-lg font-semibold text-emerald-800 hover:underline">
                    {bed.name}
                  </Link>
                  <span className="text-sm text-stone-500">
                    {" · "}
                    {bed.kind === "rack" ? "grow rack" : "outdoor"}
                    {bed.locationNote && ` · ${bed.locationNote}`}
                  </span>
                </h2>
                {bed.current.length === 0 ? (
                  <p className="mt-2 text-sm text-stone-500">Nothing planted now.</p>
                ) : (
                  <ul className="mt-2 space-y-1 text-sm">
                    {bed.current.map((planting) => (
                      <li key={planting.id} className="flex items-center gap-2">
                        <Swatch color={planting.color} />
                        <span>
                          {plantName(planting)}
                          {planting.quantity > 1 && ` ×${planting.quantity}`}
                        </span>
                        <LifecycleBadge lifecycle={planting.lifecycle} />
                      </li>
                    ))}
                  </ul>
                )}
                <div className="mt-auto flex gap-2 pt-3">
                  <Link href={`/beds/${bed.id}`} className={smallButton}>
                    Open
                  </Link>
                  <Link href={`/beds/${bed.id}/edit`} className={smallButton} aria-label={`Edit ${bed.name}`}>
                    Edit
                  </Link>
                  <DeleteButton
                    action={deleteBedAction.bind(null, bed.id, zone.id)}
                    confirmText={`Delete the bed ${bed.name}?`}
                    disabled={bed.plantingCount > 0}
                    disabledReason="Only a bed with no plantings, current or past, can be deleted."
                    className={`${smallButton} text-red-800 disabled:cursor-not-allowed disabled:text-stone-400`}
                  />
                </div>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-stone-500">
            Delete is available only for a bed with no plantings, current or past.
          </p>
        </>
      )}

      <section className="mt-10">
        <h2 className="mb-3 text-xl font-semibold">Add bed</h2>
        <BedForm
          action={saveBed.bind(null, null)}
          initial={{ zone_id: String(zone.id), name: "", kind: "outdoor", location_note: "" }}
          submitLabel="Add bed"
        />
      </section>
    </>
  );
}
