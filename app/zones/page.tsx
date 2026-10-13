import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { listZones } from "@/lib/garden";

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

async function ZonesTable() {
  const zones = await listZones();
  if (zones.length === 0) {
    return <p className="mt-6 text-stone-500">No zones yet.</p>;
  }
  return (
    <table className="mt-6 w-full border-collapse overflow-hidden rounded-md border border-stone-300 bg-white text-left text-sm">
      <thead className="bg-stone-100">
        <tr>
          <th className="border-b border-stone-300 px-4 py-2 font-semibold">Zone</th>
          <th className="border-b border-stone-300 px-4 py-2 font-semibold">Description</th>
          <th className="border-b border-stone-300 px-4 py-2 font-semibold">Beds</th>
          <th className="border-b border-stone-300 px-4 py-2 font-semibold">Active plantings</th>
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
          </tr>
        ))}
      </tbody>
    </table>
  );
}
