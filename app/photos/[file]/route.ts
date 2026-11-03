import { connection } from "next/server";
import { readPhotoFile } from "@/lib/photos";

// Serves an uploaded photo from uploads/. File names are 32 random hex characters, so a photo's
// address cannot be guessed, and the visitor bed pages (Checkpoint 6) show photos to visitors who
// are not signed in. A stored file never changes; a replaced photo gets a new name.
export async function GET(_request: Request, { params }: RouteContext<"/photos/[file]">) {
  await connection();
  const photo = await readPhotoFile((await params).file);
  if (!photo) return new Response("Photo not found", { status: 404 });
  return new Response(new Uint8Array(photo), {
    headers: {
      "Content-Type": "image/jpeg",
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
