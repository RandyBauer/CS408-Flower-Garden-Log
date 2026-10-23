import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { BedForm } from "@/components/GardenForms";
import { saveBed } from "@/lib/actions";
import { parseId } from "@/lib/format";
import { getBed, listZoneOptions } from "@/lib/garden";
import { requireGardener } from "@/lib/session";

export const metadata: Metadata = { title: "Edit bed" };

export default function EditBedPage({ params }: PageProps<"/beds/[bedId]/edit">) {
  return (
    <Suspense fallback={<p className="text-stone-500">Loading…</p>}>
      <EditBed params={params} />
    </Suspense>
  );
}

async function EditBed({ params }: { params: Promise<{ bedId: string }> }) {
  await requireGardener();
  const id = parseId((await params).bedId);
  const bed = id ? await getBed(id) : undefined;
  if (!bed) notFound();
  const zones = await listZoneOptions();

  return (
    <>
      <Breadcrumbs
        trail={[
          { href: "/zones", label: "Zones" },
          { href: `/zones/${bed.zoneId}`, label: bed.zoneName },
          { href: `/beds/${bed.id}`, label: bed.name },
          { label: "Edit" },
        ]}
      />
      <h1 className="mb-6 text-3xl font-semibold">Edit bed</h1>
      <BedForm
        action={saveBed.bind(null, bed.id)}
        initial={{
          zone_id: String(bed.zoneId),
          name: bed.name,
          kind: bed.kind,
          location_note: bed.locationNote ?? "",
        }}
        zones={zones}
        submitLabel="Save"
        cancelHref={`/beds/${bed.id}`}
      />
    </>
  );
}
