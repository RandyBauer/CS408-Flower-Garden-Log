import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { LifecycleBadge } from "@/components/Badges";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { Swatch } from "@/components/Swatch";
import { parseId, plantName } from "@/lib/format";
import { getZone, listBedsInZone } from "@/lib/garden";

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

async function ZoneDetail({ params }: { params: Promise<{ zoneId: string }> }) {
  const id = parseId((await params).zoneId);
  const zone = id ? await getZone(id) : undefined;
  if (!zone) notFound();
  const beds = await listBedsInZone(zone.id);

  return (
    <>
      <Breadcrumbs trail={[{ href: "/zones", label: "Zones" }, { label: zone.name }]} />
      <h1 className="text-3xl font-semibold">{zone.name}</h1>
      {zone.description && <p className="mt-1 text-stone-600">{zone.description}</p>}

      {beds.length === 0 ? (
        <p className="mt-6 text-stone-500">This zone has no beds yet.</p>
      ) : (
        <ul className="mt-6 grid gap-4 md:grid-cols-2">
          {beds.map((bed) => (
            <li key={bed.id} className="rounded-md border border-stone-300 bg-white p-4">
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
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
