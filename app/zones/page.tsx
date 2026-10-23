import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ZoneForm } from "@/components/GardenForms";
import { DeleteButton } from "@/components/forms";
import { secondaryButton } from "@/components/styles";
import { deleteZoneAction, saveZone } from "@/lib/actions";
import { listZones } from "@/lib/garden";
import { requireGardener } from "@/lib/session";

export const metadata: Metadata = { title: "Zones" };

export default function ZonesPage() {
  return (
    <>
      <h1 className="text-3xl font-semibold">Zones</h1>
      <p className="mt-1 text-stone-600">Areas of the garden. Each zone holds one or more beds.</p>
      <Suspense fallback={<p className="mt-6 text-stone-500">Loading…</p>}>
        <ZonesTable />
      </Suspense>
    </>
  );
}

const smallButton = `${secondaryButton} !px-3 !py-1`;

async function ZonesTable() {
  await requireGardener();
  const zones = await listZones();
  return (
    <>
      {zones.length === 0 ? (
        <p className="mt-6 text-stone-500">No zones yet. Add the first one below.</p>
      ) : (
        <>
          <table className="mt-6 w-full border-collapse overflow-hidden rounded-md border border-stone-300 bg-white text-left text-sm">
            <thead className="bg-stone-100">
              <tr>
                <th className="border-b border-stone-300 px-4 py-2 font-semibold">Zone</th>
                <th className="border-b border-stone-300 px-4 py-2 font-semibold">Description</th>
                <th className="border-b border-stone-300 px-4 py-2 font-semibold">Beds</th>
                <th className="border-b border-stone-300 px-4 py-2 font-semibold">Active plantings</th>
                <th className="border-b border-stone-300 px-4 py-2">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {zones.map((zone) => (
                <tr key={zone.id} className="border-b border-stone-200 last:border-0">
                  <td className="px-4 py-2.5">
                    <Link href={`/zones/${zone.id}`} className="font-medium text-emerald-800 hover:underline">
                      {zone.name}
                    </Link>
                  </td>
                  <td className="px-4 py-2.5 text-stone-600">{zone.description}</td>
                  <td className="px-4 py-2.5">
                    {zone.bedCount}
                    {zone.rackCount > 0 && <span className="text-stone-500"> (grow rack)</span>}
                  </td>
                  <td className="px-4 py-2.5">{zone.activeCount}</td>
                  <td className="px-4 py-2.5">
                    <div className="flex justify-end gap-2">
                      <Link href={`/zones/${zone.id}/edit`} className={smallButton} aria-label={`Edit ${zone.name}`}>
                        Edit
                      </Link>
                      <DeleteButton
                        action={deleteZoneAction.bind(null, zone.id)}
                        confirmText={`Delete the zone ${zone.name}?`}
                        disabled={zone.bedCount > 0}
                        disabledReason="Only a zone with no beds can be deleted."
                        className={`${smallButton} text-red-800 disabled:cursor-not-allowed disabled:text-stone-400`}
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-2 text-xs text-stone-500">Delete is available only for a zone with no beds.</p>
        </>
      )}

      <section className="mt-10">
        <h2 className="mb-3 text-xl font-semibold">Add zone</h2>
        <ZoneForm action={saveZone.bind(null, null)} submitLabel="Add zone" />
      </section>
    </>
  );
}
