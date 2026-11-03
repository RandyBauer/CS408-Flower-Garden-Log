import { randomBytes } from "node:crypto";
import { expect, test } from "@playwright/test";
import sharp from "sharp";
import { addZoneAndBed, section } from "./garden";

// A photo the size a phone camera takes, 4032 × 3024. Random pixels do not compress, so the file
// is about 5 MB, like a real one, and well over the 1 MB a server action accepts by default.
async function phonePhoto(): Promise<Buffer> {
  const width = 4032;
  const height = 3024;
  return sharp(randomBytes(width * height * 3), { raw: { width, height, channels: 3 } })
    .jpeg({ quality: 60 })
    .toBuffer();
}

const solidPhoto = (color: string) =>
  sharp({ create: { width: 1200, height: 900, channels: 3, background: color } }).jpeg().toBuffer();

test("attach a tag photo and find it in the bed's history", async ({ page }) => {
  const run = `Photo ${Date.now()}`;
  const name = `Cosmos · ${run} · pink`;
  await addZoneAndBed(page, run);

  // Add a 2025 planting with a tag photo
  await page.getByRole("link", { name: "+ Add planting" }).click();
  const form = page.getByRole("form", { name: "Planting" });
  await form.getByLabel("Date planted").fill("2025-05-17");
  await form.getByLabel("Flower").fill("Cosmos");
  await form.getByLabel("Variety").fill(run);
  await form.getByLabel("Color").fill("pink");
  const photo = await phonePhoto();
  expect(photo.length).toBeGreaterThan(4 * 1024 * 1024);
  await form.getByLabel("Take or upload photo").setInputFiles({ name: "tag.jpg", mimeType: "image/jpeg", buffer: photo });
  await expect(form.getByRole("img", { name: "Chosen photo" })).toBeVisible();
  await form.getByRole("button", { name: "Save planting" }).click();

  // Uploading and resizing 5 MB takes a few seconds while the other tests run alongside.
  await expect(page.getByRole("heading", { level: 1, name: `${run} Bed` })).toBeVisible({ timeout: 20_000 });
  const growing = section(page, "Growing now");
  await expect(growing.getByRole("img", { name: `Tag photo: ${name}` })).toBeVisible();

  // End it with a verdict. It moves to the bed's history under 2025, with its photo.
  await growing.getByRole("link", { name: `Edit ${name}` }).click();
  await expect(page.getByRole("img", { name: "Current tag photo" })).toBeVisible();
  const end = page.getByRole("form", { name: "End this planting" });
  await end.getByLabel("Date removed").fill("2025-10-04");
  await end.getByLabel("Verdict").selectOption("again");
  await end.getByRole("button", { name: "End planting" }).click();

  const year = section(page, "History").getByRole("region", { name: "2025" });
  const row = year.getByRole("row", { name: new RegExp(run) });
  await expect(row).toContainText("Would plant again");
  const thumbnail = row.getByRole("img", { name: `Tag photo: ${name}` });
  await expect(thumbnail).toBeVisible();

  // The server resized the photo: 1600 pixels on the long edge, a 400-pixel thumbnail, and no
  // metadata.
  const href = await row.getByRole("link", { name: `Tag photo: ${name}` }).getAttribute("href");
  const full = await page.request.get(href!);
  expect(full.headers()["content-type"]).toBe("image/jpeg");
  const stored = await sharp(await full.body()).metadata();
  expect([stored.width, stored.height]).toEqual([1600, 1200]);
  expect(stored.exif).toBeUndefined();
  expect(await thumbnail.evaluate((img: HTMLImageElement) => [img.naturalWidth, img.naturalHeight])).toEqual([400, 300]);
});

test("replace and remove a tag photo", async ({ page }) => {
  const run = `Replace ${Date.now()}`;
  const name = `Zinnia · ${run} · orange`;
  await addZoneAndBed(page, run);

  await page.getByRole("link", { name: "+ Add planting" }).click();
  const form = page.getByRole("form", { name: "Planting" });
  await form.getByLabel("Flower").fill("Zinnia");
  await form.getByLabel("Variety").fill(run);
  await form.getByLabel("Color").fill("orange");
  await form.getByLabel("Take or upload photo").setInputFiles({
    name: "first.jpg",
    mimeType: "image/jpeg",
    buffer: await solidPhoto("#f08a24"),
  });
  await form.getByRole("button", { name: "Save planting" }).click();

  const growing = section(page, "Growing now");
  const firstHref = await growing.getByRole("link", { name: `Tag photo: ${name}` }).getAttribute("href");

  // Replace: the planting shows the new photo and the old file is gone. The form is found by its
  // role because Next.js keeps the hidden Add planting page in the document for the Back button,
  // and a label search would find that page's file input too.
  await growing.getByRole("link", { name: `Edit ${name}` }).click();
  await expect(form.getByRole("img", { name: "Current tag photo" })).toBeVisible();
  await form.getByLabel("Take or upload photo").setInputFiles({
    name: "second.png",
    mimeType: "image/png",
    buffer: await sharp({ create: { width: 900, height: 1200, channels: 4, background: "#8e5bb5" } }).png().toBuffer(),
  });
  await expect(form.getByRole("img", { name: "Chosen photo" })).toBeVisible();
  await form.getByRole("button", { name: "Save", exact: true }).click();
  const secondHref = await growing.getByRole("link", { name: `Tag photo: ${name}` }).getAttribute("href");
  expect(secondHref).not.toBe(firstHref);
  expect((await page.request.get(firstHref!)).status()).toBe(404);
  expect((await page.request.get(secondHref!)).status()).toBe(200);

  // Remove: the planting has no photo and the file is gone
  await growing.getByRole("link", { name: `Edit ${name}` }).click();
  await form.getByRole("checkbox", { name: "Remove photo" }).check();
  await form.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.getByRole("heading", { level: 1, name: `${run} Bed` })).toBeVisible();
  await expect(growing.getByRole("img", { name: `Tag photo: ${name}` })).toHaveCount(0);
  expect((await page.request.get(secondHref!)).status()).toBe(404);
});

test("a file that is not a photo is rejected", async ({ page }) => {
  await page.goto("/plantings/new?bed=4");
  const form = page.getByRole("form", { name: "Planting" });
  await form.getByLabel("Flower").fill("Zinnia");
  const input = form.getByLabel("Take or upload photo");

  // Caught in the browser when chosen
  await input.setInputFiles({ name: "notes.txt", mimeType: "text/plain", buffer: Buffer.from("notes") });
  await expect(form.getByText("Choose a JPEG, PNG, or WebP photo.")).toBeVisible();

  // Named and typed as a JPEG but not one: caught on the server, and nothing is saved
  await input.setInputFiles({ name: "tag.jpg", mimeType: "image/jpeg", buffer: Buffer.from("not really a photo") });
  await form.getByRole("button", { name: "Save planting" }).click();
  await expect(
    form.getByText("That file could not be read as a photo. Choose a JPEG, PNG, or WebP photo."),
  ).toBeVisible();
  await expect(page).toHaveURL(/\/plantings\/new\?bed=4$/);
  await expect(form.getByLabel("Flower")).toHaveValue("Zinnia");
});
