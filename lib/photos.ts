import { randomBytes } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

// Uploaded photos. Each upload is decoded and re-encoded on the server as two JPEG files, a
// full-size photo and a thumbnail, stored in uploads/ under a random name. Re-encoding drops the
// photo's metadata, including the GPS position a phone records, which would give away the
// garden's address. photos.storage_path holds the full-size file's name.

// Longest edge, in pixels.
export const FULL_SIZE = 1600;
export const THUMB_SIZE = 400;

// Formats accepted, as sharp names them. Checked on the decoded file, not the name the browser sent.
const FORMATS = ["jpeg", "png", "webp"];

// Uploads are occasional, so sharp's in-memory cache would only hold memory on a small server.
sharp.cache(false);

// UPLOADS_DIR overrides the default, for example to give the end-to-end tests their own folder.
export function uploadsDir(): string {
  return process.env.UPLOADS_DIR ?? path.join(process.cwd(), "uploads");
}

// "3f2a….jpg" -> "3f2a….thumb.jpg"
export function thumbName(storagePath: string): string {
  return storagePath.replace(/\.jpg$/, ".thumb.jpg");
}

// Address of a stored photo, served by app/photos/[file]/route.ts.
export function photoUrl(storagePath: string, size: "full" | "thumb" = "full"): string {
  return `/photos/${size === "thumb" ? thumbName(storagePath) : storagePath}`;
}

// Makes the full-size photo and the thumbnail. Phones record which way up the camera was held;
// rotate() turns the pixels to match, so the photo stays upright once the metadata is gone.
// Transparent areas of a PNG become white. Throws if the input is not a JPEG, PNG, or WebP image.
export async function resizePhoto(input: Buffer): Promise<{ full: Buffer; thumb: Buffer }> {
  const { format } = await sharp(input).metadata();
  if (!FORMATS.includes(format)) throw new Error(`Unsupported image format: ${format}`);
  const image = sharp(input).rotate().flatten({ background: "#ffffff" });
  const size = (pixels: number, quality: number) =>
    image
      .clone()
      .resize(pixels, pixels, { fit: "inside", withoutEnlargement: true })
      .jpeg({ quality })
      .toBuffer();
  const [full, thumb] = await Promise.all([size(FULL_SIZE, 82), size(THUMB_SIZE, 78)]);
  return { full, thumb };
}

// Resizes an upload and writes both files. Returns the name to store in photos.storage_path, or
// undefined when the upload cannot be read as a photo.
export async function storePhoto(input: Buffer, dir: string = uploadsDir()): Promise<string | undefined> {
  let sizes: { full: Buffer; thumb: Buffer };
  try {
    sizes = await resizePhoto(input);
  } catch {
    return undefined;
  }
  const name = `${randomBytes(16).toString("hex")}.jpg`;
  await fs.promises.mkdir(dir, { recursive: true });
  await fs.promises.writeFile(path.join(dir, name), sizes.full);
  await fs.promises.writeFile(path.join(dir, thumbName(name)), sizes.thumb);
  return name;
}

// Removes both files of each photo. Files already gone are ignored.
export function deletePhotoFiles(storagePaths: string[], dir: string = uploadsDir()) {
  for (const name of storagePaths) {
    fs.rmSync(path.join(dir, name), { force: true });
    fs.rmSync(path.join(dir, thumbName(name)), { force: true });
  }
}

// Only names storePhoto creates, so a request cannot reach any other file.
const PHOTO_FILE = /^[0-9a-f]{32}(\.thumb)?\.jpg$/;

// Reads a stored photo by file name. Returns undefined for a name storePhoto would not create or a
// file that does not exist.
export async function readPhotoFile(file: string, dir: string = uploadsDir()): Promise<Buffer | undefined> {
  if (!PHOTO_FILE.test(file)) return undefined;
  try {
    return await fs.promises.readFile(path.join(dir, file));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return undefined;
    throw error;
  }
}
