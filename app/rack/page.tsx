import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Swatch } from "@/components/Swatch";
import { TransplantForm } from "@/components/TransplantForm";
import { primaryButton, secondaryButton } from "@/components/styles";
import { transplantAction } from "@/lib/actions";
import { formatDate, parseId, plantName } from "@/lib/format";
import { listBedOptions, listRacks, listStarters, listTransplanted } from "@/lib/garden";
import { requireGardener } from "@/lib/session";

export const metadata: Metadata = { title: "Grow rack" };

export default function GrowRackPage({ searchParams }: PageProps<"/rack">) {
  return (
    <>
      <h1 className="text-3xl font-semibold">Grow rack</h1>
      <p className="mt-1 text-stone-600">
        Starters under the grow lights. Transplanting ends the rack planting and links each new bed planting to it.
      </p>
      <Suspense fallback={<p className="mt-6 text-stone-500">Loading…</p>}>
        <GrowRack searchParams={searchParams} />
      </Suspense>
    </>
  );
}

const th = "border-b border-stone-300 px-4 py-2 font-semibold";
const td = "px-4 py-2.5";
const table =
  "mt-3 w-full border-collapse overflow-hidden rounded-md border border-stone-300 bg-white text-left text-sm";
const smallButton = "!px-3 !py-1";

// ?transplant=<id> opens the transplant form for that starter. ?starter=<id> marks a starter in the
// Transplanted list; a transplant returns here with it, and each transplant's bed row links here.
async function GrowRack({ searchParams }: { searchParams: PageProps<"/rack">["searchParams"] }) {
  await requireGardener();
  const params = await searchParams;
  const transplantId = typeof params.transplant === "string" ? parseId(params.transplant) : undefined;
  const markedId = typeof params.starter === "string" ? parseId(params.starter) : undefined;
  const [racks, starters, transplanted] = await Promise.all([listRacks(), listStarters(), listTransplanted()]);
  const selected = starters.find((starter) => starter.id === transplantId);
  const beds = selected ? await listBedOptions("outdoor") : [];
  // With more than one rack, each starter shows which one it is on.
  const showRack = racks.length > 1;

  return (
    <>
      {racks.length === 0 ? (
        <p className="mt-6 text-stone-500">
          No grow rack yet. Add a bed of kind Grow rack to a zone on the{" "}
          <Link href="/zones" className="text-emerald-800 underline">
            Zones
          </Link>{" "}
          page.
        </p>
      ) : (
        <div className="mt-4 flex flex-wrap gap-3">
          {racks.map((rack) => (
            <Link key={rack.id} href={`/plantings/new?bed=${rack.id}`} className={primaryButton}>
              + Add starter{showRack && ` to ${rack.name}`}
            </Link>
          ))}
        </div>
      )}

      <section className="mt-8">
        <h2 className="text-xl font-semibold">On the rack</h2>
        {starters.length === 0 ? (
          <p className="mt-2 text-stone-500">Nothing is on the rack now.</p>
        ) : (
          <table className={table}>
            <thead className="bg-stone-100">
              <tr>
                {showRack && <th className={th}>Rack</th>}
                <th className={th}>Flower</th>
                <th className={th}>Variety</th>
                <th className={th}>Color</th>
                <th className={th}>Started</th>
                <th className={th}>Qty</th>
                <th className={th}>Source</th>
                <th className={th}>
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {starters.map((starter) => (
                <tr key={starter.id} className="border-b border-stone-200 last:border-0">
                  {showRack && <td className={td}>{starter.bedName}</td>}
                  <td className={td}>{starter.flower}</td>
                  <td className={td}>{starter.variety}</td>
                  <td className={td}>
                    <span className="flex items-center gap-2">
                      <Swatch color={starter.color} />
                      {starter.color}
                    </span>
                  </td>
                  <td className={td}>{formatDate(starter.plantedOn)}</td>
                  <td className={td}>{starter.quantity}</td>
                  <td className={td}>
                    {starter.source}
                    {starter.notes && <span className="block text-xs text-stone-500">{starter.notes}</span>}
                  </td>
                  <td className={`${td} text-right`}>
                    <div className="flex justify-end gap-2">
                      <Link
                        href={`/rack?transplant=${starter.id}#transplant`}
                        className={`${starter.id === selected?.id ? primaryButton : secondaryButton} ${smallButton}`}
                        aria-label={`Transplant ${plantName(starter)}`}
                      >
                        Transplant
                      </Link>
                      <Link
                        href={`/plantings/${starter.id}/edit`}
                        className={`${secondaryButton} ${smallButton}`}
                        aria-label={`Edit ${plantName(starter)}`}
                      >
                        Edit
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {transplantId !== undefined && !selected && (
          <p role="status" className="mt-4 text-stone-600">
            That starter is no longer on the rack.
          </p>
        )}
        {selected && (
          <section
            id="transplant"
            aria-labelledby="transplant-heading"
            className="mt-4 scroll-mt-4 rounded-md border border-stone-300 bg-white p-5"
          >
            <h2 id="transplant-heading" className="text-lg font-semibold">
              Transplant {plantName(selected)}{" "}
              <span className="text-sm font-normal text-stone-500">
                ({selected.quantity} started {formatDate(selected.plantedOn)})
              </span>
            </h2>
            <div className="mt-3">
              <TransplantForm
                key={selected.id}
                action={transplantAction.bind(null, selected.id)}
                starter={{ plantedOn: selected.plantedOn, quantity: selected.quantity }}
                beds={beds}
                cancelHref="/rack"
              />
            </div>
          </section>
        )}
      </section>

      <section className="mt-10">
        <h2 className="text-xl font-semibold">Transplanted</h2>
        {transplanted.length === 0 ? (
          <p className="mt-2 text-stone-500">No starters have been transplanted yet.</p>
        ) : (
          <table className={table}>
            <thead className="bg-stone-100">
              <tr>
                <th className={th}>Starter</th>
                <th className={th}>Started</th>
                <th className={th}>Qty</th>
                <th className={th}>Transplanted</th>
                <th className={th}>To</th>
              </tr>
            </thead>
            <tbody>
              {transplanted.map((starter) => (
                <tr
                  key={starter.id}
                  id={`starter-${starter.id}`}
                  aria-current={starter.id === markedId ? "true" : undefined}
                  className="scroll-mt-4 border-b border-stone-200 last:border-0 aria-[current=true]:bg-amber-100"
                >
                  <td className={td}>
                    {plantName(starter)}
                    {showRack && <span className="block text-xs text-stone-500">{starter.bedName}</span>}
                  </td>
                  <td className={td}>{formatDate(starter.plantedOn)}</td>
                  <td className={td}>{starter.quantity}</td>
                  <td className={td}>{starter.removedOn && formatDate(starter.removedOn)}</td>
                  <td className={td}>
                    <ul>
                      {starter.transplants.map((transplant) => (
                        <li key={transplant.id}>
                          <Link href={`/beds/${transplant.bedId}`} className="text-emerald-800 hover:underline">
                            {transplant.bedName}
                          </Link>{" "}
                          ×{transplant.quantity}
                        </li>
                      ))}
                    </ul>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </>
  );
}
