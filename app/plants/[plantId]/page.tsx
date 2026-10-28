import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { VerdictBadge } from "@/components/Badges";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { PlantForm } from "@/components/GardenForms";
import { Swatch } from "@/components/Swatch";
import { secondaryButton } from "@/components/styles";
import { savePlant } from "@/lib/actions";
import { formatDate, parseId, seasonLabel } from "@/lib/format";
import { getPlant, listPlantingsOfPlant } from "@/lib/garden";
import { requireGardener } from "@/lib/session";

// "Zinnia · Profusion Orange"; the color is shown beside the title instead.
function title(plant: { flower: string; variety: string }): string {
  return [plant.flower, plant.variety].filter(Boolean).join(" · ");
}

export async function generateMetadata({ params }: PageProps<"/plants/[plantId]">): Promise<Metadata> {
  const id = parseId((await params).plantId);
  const plant = id ? await getPlant(id) : undefined;
  return { title: plant ? title(plant) : "Plant not found" };
}

export default function PlantPage({ params }: PageProps<"/plants/[plantId]">) {
  return (
    <Suspense fallback={<p className="text-stone-500">Loading…</p>}>
      <PlantDetail params={params} />
    </Suspense>
  );
}

const th = "border-b border-stone-300 px-4 py-2 font-semibold";
const td = "px-4 py-2.5";

async function PlantDetail({ params }: { params: Promise<{ plantId: string }> }) {
  await requireGardener();
  const id = parseId((await params).plantId);
  const plant = id ? await getPlant(id) : undefined;
  if (!plant) notFound();
  const plantings = await listPlantingsOfPlant(plant.id);
  const seasons = new Set(plantings.map((planting) => planting.plantedOn.slice(0, 4))).size;

  return (
    <>
      <Breadcrumbs trail={[{ href: "/plants", label: "Plant library" }, { label: title(plant) }]} />
      <h1 className="text-3xl font-semibold">{title(plant)}</h1>
      <p className="mt-1 flex items-center gap-2 text-stone-600">
        {plant.color && <Swatch color={plant.color} />}
        <span>
          {[
            plant.color,
            plant.lifecycle === "annual" ? "Annual" : "Perennial",
            `grown ${seasons} ${seasons === 1 ? "season" : "seasons"}`,
          ]
            .filter(Boolean)
            .join(" · ")}
        </span>
      </p>

      <details className="mt-4 rounded-md border border-stone-300 bg-white px-5 py-3">
        <summary className="cursor-pointer font-medium">Edit entry</summary>
        <div className="mt-3">
          <PlantForm
            key={`${plant.flower}|${plant.variety}|${plant.color}|${plant.lifecycle}`}
            action={savePlant.bind(null, plant.id)}
            initial={{ flower: plant.flower, variety: plant.variety, color: plant.color, lifecycle: plant.lifecycle }}
          />
        </div>
      </details>

      <section className="mt-8">
        <h2 className="text-xl font-semibold">Every planting</h2>
        <table className="mt-3 w-full border-collapse overflow-hidden rounded-md border border-stone-300 bg-white text-left text-sm">
          <thead className="bg-stone-100">
            <tr>
              <th className={th}>Year</th>
              <th className={th}>Bed</th>
              <th className={th}>Planted</th>
              <th className={th}>Removed</th>
              <th className={th}>Qty</th>
              <th className={th}>Source</th>
              <th className={th}>Verdict</th>
              <th className={th}>
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {plantings.map((planting) => (
              <tr key={planting.id} className="border-b border-stone-200 last:border-0">
                <td className={td}>{seasonLabel(planting.plantedOn, planting.removedOn)}</td>
                <td className={td}>
                  <Link href={`/beds/${planting.bedId}`} className="hover:underline">
                    {planting.bedName}
                  </Link>
                </td>
                <td className={td}>{formatDate(planting.plantedOn)}</td>
                <td className={td}>{planting.removedOn ? formatDate(planting.removedOn) : "growing now"}</td>
                <td className={td}>{planting.quantity}</td>
                <td className={td}>{planting.source}</td>
                <td className={td}>
                  <VerdictBadge verdict={planting.verdict} />
                  {planting.verdictNote && (
                    <span className="block text-xs text-stone-500">{planting.verdictNote}</span>
                  )}
                </td>
                <td className={`${td} text-right`}>
                  <Link
                    href={`/plantings/${planting.id}/edit`}
                    className={`${secondaryButton} !px-3 !py-1`}
                    aria-label={`Edit the ${planting.bedName} planting from ${formatDate(planting.plantedOn)}`}
                  >
                    Edit
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </>
  );
}
