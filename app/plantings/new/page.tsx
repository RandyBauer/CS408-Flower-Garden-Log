import type { Metadata } from "next";
import { Suspense } from "react";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { PlantingForm } from "@/components/PlantingForm";
import { savePlanting } from "@/lib/actions";
import { parseId } from "@/lib/format";
import { getBed, listBedOptions, listSuggestions } from "@/lib/garden";
import { requireGardener } from "@/lib/session";

export const metadata: Metadata = { title: "Add planting" };

export default function NewPlantingPage({ searchParams }: PageProps<"/plantings/new">) {
  return (
    <Suspense fallback={<p className="text-stone-500">Loading…</p>}>
      <NewPlanting searchParams={searchParams} />
    </Suspense>
  );
}

// Opened from a bed's "Add planting" button with ?bed=<id>, which preselects that bed.
async function NewPlanting({ searchParams }: { searchParams: PageProps<"/plantings/new">["searchParams"] }) {
  await requireGardener();
  const bedParam = (await searchParams).bed;
  const bedId = typeof bedParam === "string" ? parseId(bedParam) : undefined;
  const [bed, beds, suggestions] = await Promise.all([
    bedId ? getBed(bedId) : undefined,
    listBedOptions(),
    listSuggestions(),
  ]);

  return (
    <>
      <Breadcrumbs
        trail={
          bed
            ? [
                { href: "/zones", label: "Zones" },
                { href: `/zones/${bed.zoneId}`, label: bed.zoneName },
                { href: `/beds/${bed.id}`, label: bed.name },
                { label: "Add planting" },
              ]
            : [{ href: "/zones", label: "Zones" }, { label: "Add planting" }]
        }
      />
      <h1 className="text-3xl font-semibold">Add planting</h1>
      <p className="mb-6 mt-1 text-stone-600">Bed, flower, type, and date planted are required.</p>
      <PlantingForm
        action={savePlanting.bind(null, null)}
        beds={beds}
        suggestions={suggestions}
        initial={{
          bed_id: bed ? String(bed.id) : "",
          flower: "",
          variety: "",
          color: "",
          lifecycle: "annual",
          planted_on: "",
          quantity: "1",
          source: "",
          notes: "",
        }}
        submitLabel="Save planting"
        cancelHref={bed ? `/beds/${bed.id}` : "/zones"}
      />
    </>
  );
}
