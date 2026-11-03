import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import sharp from "sharp";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { deletePhotoFiles, readPhotoFile, resizePhoto, storePhoto, thumbName } from "@/lib/photos";
import { MAX_PHOTO_BYTES, validateTagPhoto } from "@/lib/validation";

let dir: string;

beforeEach(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), "gardenlog-photos-"));
});

afterEach(() => {
  fs.rmSync(dir, { recursive: true, force: true });
});

function image(width: number, height: number) {
  return sharp({ create: { width, height, channels: 3, background: "#f08a24" } });
}

const size = async (buffer: Buffer) => {
  const { width, height, format } = await sharp(buffer).metadata();
  return { width, height, format };
};

describe("resizePhoto", () => {
  it("shrinks a phone photo to 1600 pixels on the long edge, with a 400-pixel thumbnail", async () => {
    const { full, thumb } = await resizePhoto(await image(4032, 3024).jpeg().toBuffer());

    expect(await size(full)).toEqual({ width: 1600, height: 1200, format: "jpeg" });
    expect(await size(thumb)).toEqual({ width: 400, height: 300, format: "jpeg" });
  });

  it("does not enlarge a small photo", async () => {
    const { full } = await resizePhoto(await image(800, 600).png().toBuffer());

    expect(await size(full)).toEqual({ width: 800, height: 600, format: "jpeg" });
  });

  it("turns a photo upright when the phone recorded it sideways", async () => {
    // Orientation 6: the pixels are stored landscape and shown rotated a quarter turn.
    const sideways = await image(3000, 2000).jpeg().withMetadata({ orientation: 6 }).toBuffer();

    const { full } = await resizePhoto(sideways);

    expect(await size(full)).toEqual({ width: 1067, height: 1600, format: "jpeg" });
  });

  it("drops the photo's metadata, including its GPS position", async () => {
    const located = await image(1200, 900)
      .jpeg()
      .withExif({
        IFD0: { Make: "Phone", Model: "Camera" },
        IFD3: { GPSLatitudeRef: "N", GPSLatitude: "43/1 36/1 0/1", GPSLongitudeRef: "W", GPSLongitude: "116/1 12/1 0/1" },
      })
      .toBuffer();
    // Tag 0x8825 points to the GPS block; sharp writes EXIF little-endian.
    const gpsTag = Buffer.from([0x25, 0x88]);
    expect((await sharp(located).metadata()).exif?.includes(gpsTag)).toBe(true);

    const { full, thumb } = await resizePhoto(located);

    expect((await sharp(full).metadata()).exif).toBeUndefined();
    expect((await sharp(thumb).metadata()).exif).toBeUndefined();
  });

  it("accepts WebP and rejects formats other than JPEG, PNG, and WebP", async () => {
    await expect(resizePhoto(await image(100, 100).webp().toBuffer())).resolves.toBeDefined();
    await expect(resizePhoto(await image(100, 100).gif().toBuffer())).rejects.toThrow(/gif/);
    const svg = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"/>');
    await expect(resizePhoto(svg)).rejects.toThrow(/svg/);
  });

  it("rejects a file that is not an image", async () => {
    await expect(resizePhoto(Buffer.from("not a photo"))).rejects.toThrow();
  });
});

describe("storing photos", () => {
  it("writes both sizes under a random name and reads them back", async () => {
    const name = await storePhoto(await image(2000, 1500).jpeg().toBuffer(), dir);

    expect(name).toMatch(/^[0-9a-f]{32}\.jpg$/);
    expect(fs.readdirSync(dir).sort()).toEqual([name, thumbName(name!)].sort());
    expect(await size((await readPhotoFile(name!, dir))!)).toMatchObject({ width: 1600 });
    expect(await size((await readPhotoFile(thumbName(name!), dir))!)).toMatchObject({ width: 400 });
  });

  it("stores nothing for a file that is not a photo", async () => {
    expect(await storePhoto(Buffer.from("not a photo"), dir)).toBeUndefined();
    expect(fs.existsSync(dir) ? fs.readdirSync(dir) : []).toEqual([]);
  });

  it("deletes both files of a photo", async () => {
    const name = (await storePhoto(await image(500, 500).jpeg().toBuffer(), dir))!;

    deletePhotoFiles([name, "0123456789abcdef0123456789abcdef.jpg"], dir);

    expect(fs.readdirSync(dir)).toEqual([]);
  });

  it("reads only names storePhoto creates", async () => {
    fs.writeFileSync(path.join(dir, "notes.txt"), "private");

    for (const file of ["notes.txt", "../notes.txt", "..%2Fnotes.txt", "0123456789abcdef0123456789abcdef.png"]) {
      expect(await readPhotoFile(file, dir), file).toBeUndefined();
    }
    expect(await readPhotoFile("0123456789abcdef0123456789abcdef.jpg", dir)).toBeUndefined();
  });
});

describe("validateTagPhoto", () => {
  function form(fields: Record<string, string | File>) {
    const data = new FormData();
    for (const [name, value] of Object.entries(fields)) data.set(name, value);
    return data;
  }
  const photo = (type: string, bytes = 1000) => new File([new Uint8Array(bytes)], "tag.jpg", { type });

  it("treats an empty file input as no photo", () => {
    expect(validateTagPhoto(form({ tag_photo: new File([], "") }))).toEqual({
      ok: true,
      value: { file: null, remove: false, takenOn: null },
    });
  });

  it("accepts a JPEG, PNG, or WebP photo with the date it was chosen", () => {
    for (const type of ["image/jpeg", "image/png", "image/webp", ""]) {
      const result = validateTagPhoto(form({ tag_photo: photo(type), photo_taken_on: "2026-05-18" }));
      expect(result.ok && result.value.file?.size, type).toBe(1000);
      expect(result.ok && result.value.takenOn).toBe("2026-05-18");
    }
  });

  it("rejects other file types and files over 10 MB", () => {
    expect(validateTagPhoto(form({ tag_photo: photo("image/heic") }))).toEqual({
      ok: false,
      errors: { tag_photo: "Choose a JPEG, PNG, or WebP photo." },
    });
    expect(validateTagPhoto(form({ tag_photo: photo("image/jpeg", MAX_PHOTO_BYTES + 1) }))).toEqual({
      ok: false,
      errors: { tag_photo: "Choose a photo smaller than 10 MB." },
    });
  });

  it("reads the remove box and ignores a date that is not real", () => {
    const result = validateTagPhoto(form({ remove_tag_photo: "on", photo_taken_on: "2026-02-30" }));
    expect(result).toEqual({ ok: true, value: { file: null, remove: true, takenOn: null } });
  });
});
