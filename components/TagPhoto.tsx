import { plantName } from "@/lib/format";
import { photoUrl } from "@/lib/photos";
import { Swatch } from "./Swatch";

// A planting's tag photo as a thumbnail that opens the full-size photo in a new tab. A planting
// without a photo shows a swatch of its recorded color in the same space.
export function TagPhotoThumb({
  planting,
}: {
  planting: { tagPhoto: string | null; flower: string; variety: string; color: string };
}) {
  if (!planting.tagPhoto) return <Swatch color={planting.color} className="size-12 rounded-md" />;
  return (
    <a href={photoUrl(planting.tagPhoto)} target="_blank" rel="noopener" className="block size-12">
      {/* Already resized on upload, so next/image would only resize it again. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={photoUrl(planting.tagPhoto, "thumb")}
        alt={`Tag photo: ${plantName(planting)}`}
        loading="lazy"
        className="size-12 rounded-md border border-stone-300 object-cover"
      />
    </a>
  );
}
