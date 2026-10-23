import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { ZoneForm } from "@/components/GardenForms";
import { saveZone } from "@/lib/actions";
import { parseId } from "@/lib/format";
import { getZone } from "@/lib/garden";
import { requireGardener } from "@/lib/session";

export const metadata: Metadata = { title: "Edit zone" };

export default function EditZonePage({ params }: PageProps<"/zones/[zoneId]/edit">) {
  return (
    <Suspense fallback={<p className="text-stone-500">Loading…</p>}>
      <EditZone params={params} />
    </Suspense>
  );
}

async function EditZone({ params }: { params: Promise<{ zoneId: string }> }) {
  await requireGardener();
  const id = parseId((await params).zoneId);
  const zone = id ? await getZone(id) : undefined;
  if (!zone) notFound();

  return (
    <>
      <Breadcrumbs
        trail={[
          { href: "/zones", label: "Zones" },
          { href: `/zones/${zone.id}`, label: zone.name },
          { label: "Edit" },
        ]}
      />
      <h1 className="mb-6 text-3xl font-semibold">Edit zone</h1>
      <ZoneForm
        action={saveZone.bind(null, zone.id)}
        initial={{ name: zone.name, description: zone.description ?? "", sort_order: String(zone.sortOrder) }}
        submitLabel="Save"
        cancelHref={`/zones/${zone.id}`}
      />
    </>
  );
}
