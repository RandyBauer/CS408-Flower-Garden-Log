import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { EndPlantingForm } from "@/components/GardenForms";
import { PlantingForm } from "@/components/PlantingForm";
import { DeleteButton } from "@/components/forms";
import { deletePlantingAction, endPlantingAction, savePlanting } from "@/lib/actions";
import { formatDate, parseId, plantName } from "@/lib/format";
import { getPlanting, listBedOptions, listSuggestions } from "@/lib/garden";
import { requireGardener } from "@/lib/session";

export const metadata: Metadata = { title: "Edit planting" };

export default function EditPlantingPage({ params }: PageProps<"/plantings/[plantingId]/edit">) {
  return (
    <Suspense fallback={<p className="text-stone-500">Loading…</p>}>
      <EditPlanting params={params} />
    </Suspense>
  );
}

async function EditPlanting({ params }: { params: Promise<{ plantingId: string }> }) {
  await requireGardener();
  const id = parseId((await params).plantingId);
  const planting = id ? await getPlanting(id) : undefined;
  if (!planting) notFound();
  const [beds, suggestions] = await Promise.all([listBedOptions(), listSuggestions()]);
  const name = plantName(planting);

  return (
    <>
      <Breadcrumbs
        trail={[
          { href: "/zones", label: "Zones" },
          { href: `/beds/${planting.bedId}`, label: planting.bedName },
          { label: name },
        ]}
      />
      <h1 className="text-3xl font-semibold">Edit planting</h1>
      <p className="mb-6 mt-1 text-stone-600">
        {planting.removedOn
          ? `Ended ${formatDate(planting.removedOn)}. It is kept in the bed's history.`
          : "Bed, flower, type, and date planted are required."}
      </p>
      <PlantingForm
        action={savePlanting.bind(null, planting.id)}
        beds={beds}
        suggestions={suggestions}
        initial={{
          bed_id: String(planting.bedId),
          flower: planting.flower,
          variety: planting.variety,
          color: planting.color,
          lifecycle: planting.lifecycle,
          planted_on: planting.plantedOn,
          removed_on: planting.removedOn ?? undefined,
          quantity: String(planting.quantity),
          source: planting.source ?? "",
          notes: planting.notes ?? "",
        }}
        submitLabel="Save"
        cancelHref={`/beds/${planting.bedId}`}
      />

      <div className="mt-10 rounded-md border border-dashed border-stone-400 p-5">
        {!planting.removedOn && (
          <section className="mb-5 border-b border-dashed border-stone-300 pb-5">
            <h2 className="text-lg font-semibold">
              End this planting{" "}
              <span className="text-sm font-normal text-stone-500">(pulled or died; stays in history)</span>
            </h2>
            <div className="mt-3">
              <EndPlantingForm
                action={endPlantingAction.bind(null, planting.id, planting.bedId)}
                plantedOn={planting.plantedOn}
              />
            </div>
          </section>
        )}
        <section className="flex items-center justify-between gap-4">
          <h2 className="text-lg font-semibold">
            Delete this planting{" "}
            <span className="text-sm font-normal text-stone-500">(permanent; for entries made by mistake)</span>
          </h2>
          <DeleteButton
            action={deletePlantingAction.bind(null, planting.id, planting.bedId)}
            label="Delete planting"
            confirmText={`Delete ${name} permanently? To keep it in the bed's history, end it instead.`}
          />
        </section>
      </div>
    </>
  );
}
