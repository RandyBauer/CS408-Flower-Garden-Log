// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ComponentProps } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PlantingForm, type CurrentPhoto, type PlantingValues } from "@/components/PlantingForm";
import type { FormState } from "@/lib/form-state";

// next/link needs the Next.js router; a plain anchor is enough here.
vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: ComponentProps<"a">) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

afterEach(cleanup);

const beds = [
  { id: 1, name: "Mailbox Bed", zoneName: "Front Walk" },
  { id: 4, name: "Fence Border", zoneName: "South Fence" },
];

const suggestions = {
  flowers: ["Petunia", "Zinnia"],
  varieties: ["Profusion Orange"],
  colors: ["orange", "pink"],
  sources: ["Fred Meyer", "Home Depot"],
};

const blank: PlantingValues = {
  bed_id: "4",
  flower: "",
  variety: "",
  color: "",
  lifecycle: "annual",
  planted_on: "",
  quantity: "1",
  source: "",
  notes: "",
};

function renderForm(initial: Partial<PlantingValues> = {}, result: FormState = {}, photo: CurrentPhoto | null = null) {
  const action = vi.fn(async (...args: [FormState, FormData]) => (args && result));
  render(
    <PlantingForm
      action={action}
      beds={beds}
      suggestions={suggestions}
      initial={{ ...blank, ...initial }}
      photo={photo}
      submitLabel="Save planting"
      cancelHref="/beds/4"
    />,
  );
  return { action, user: userEvent.setup() };
}

describe("PlantingForm", () => {
  it("shows the beds by zone, preselects the bed, and defaults the date to today", () => {
    renderForm();

    expect(screen.getByRole("combobox", { name: /bed/i })).toHaveProperty("value", "4");
    expect(screen.getByRole("group", { name: "South Fence" })).toBeTruthy();
    expect(screen.getByLabelText(/date planted/i)).toHaveProperty("value", expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/));
    expect(screen.getByRole("radio", { name: /annual/i })).toHaveProperty("checked", true);
  });

  it("offers sources entered before as suggestions", () => {
    renderForm();

    const source = screen.getByRole("combobox", { name: /source/i });
    const list = document.getElementById(source.getAttribute("list") ?? "");
    expect([...(list?.querySelectorAll("option") ?? [])].map((option) => option.value)).toEqual([
      "Fred Meyer",
      "Home Depot",
    ]);
  });

  it("shows errors and does not submit when the flower is missing", async () => {
    const { action, user } = renderForm();

    await user.click(screen.getByRole("button", { name: "Save planting" }));

    const flower = screen.getByRole("combobox", { name: /flower/i });
    expect(flower.getAttribute("aria-invalid")).toBe("true");
    expect(screen.getByText("Enter the flower, for example Zinnia.")).toBeTruthy();
    expect(action).not.toHaveBeenCalled();
  });

  it("rejects a quantity of zero and keeps what was typed", async () => {
    const { action, user } = renderForm();

    await user.type(screen.getByRole("combobox", { name: /flower/i }), "Zinnia");
    await user.clear(screen.getByLabelText(/quantity/i));
    await user.type(screen.getByLabelText(/quantity/i), "0");
    await user.click(screen.getByRole("button", { name: "Save planting" }));

    expect(screen.getByText("Enter a whole number from 1 to 9999.")).toBeTruthy();
    expect(screen.getByRole("combobox", { name: /flower/i })).toHaveProperty("value", "Zinnia");
    expect(action).not.toHaveBeenCalled();
  });

  it("rejects a removal date before the date planted when editing an ended planting", async () => {
    const { action, user } = renderForm({ flower: "Petunia", planted_on: "2026-05-16", removed_on: "2026-10-04" });

    const removed = screen.getByLabelText(/date removed/i);
    await user.clear(removed);
    await user.type(removed, "2026-05-01");
    await user.click(screen.getByRole("button", { name: "Save planting" }));

    expect(screen.getByText("The removal date cannot be before the date planted.")).toBeTruthy();
    expect(action).not.toHaveBeenCalled();
  });

  it("submits a valid planting to the server action", async () => {
    const { action, user } = renderForm();

    await user.type(screen.getByRole("combobox", { name: /flower/i }), "Zinnia");
    await user.type(screen.getByRole("combobox", { name: /variety/i }), "Profusion Orange");
    await user.type(screen.getByRole("combobox", { name: /source/i }), "Fred Meyer");
    await user.click(screen.getByRole("button", { name: "Save planting" }));

    expect(action).toHaveBeenCalledTimes(1);
    const submitted = action.mock.calls[0][1];
    expect(Object.fromEntries(submitted)).toMatchObject({
      bed_id: "4",
      flower: "Zinnia",
      variety: "Profusion Orange",
      lifecycle: "annual",
      quantity: "1",
      source: "Fred Meyer",
    });
  });

  it("previews a chosen tag photo and submits it with the planting", async () => {
    // jsdom has no object URLs for files.
    URL.createObjectURL = vi.fn(() => "blob:tag-photo");
    URL.revokeObjectURL = vi.fn();
    const { action, user } = renderForm({ flower: "Zinnia" });

    await user.upload(screen.getByLabelText("Take or upload photo"), new File(["jpeg"], "tag.jpg", { type: "image/jpeg" }));

    expect(screen.getByRole("img", { name: "Chosen photo" }).getAttribute("src")).toBe("blob:tag-photo");
    await user.click(screen.getByRole("button", { name: "Save planting" }));
    expect(action).toHaveBeenCalledTimes(1);
    // jsdom's FormData leaves out files chosen with user-event; the end-to-end test checks the
    // upload itself.
    expect(action.mock.calls[0][1].get("photo_taken_on")).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("clears a chosen file that is not a JPEG, PNG, or WebP photo, with a message", async () => {
    URL.createObjectURL = vi.fn(() => "blob:notes");
    renderForm({ flower: "Zinnia" });
    // The file picker offers only photos, but a file of another type can still be chosen.
    const user = userEvent.setup({ applyAccept: false });
    const input = screen.getByLabelText("Take or upload photo");

    await user.upload(input, new File(["text"], "notes.txt", { type: "text/plain" }));

    expect(screen.getByText("Choose a JPEG, PNG, or WebP photo.")).toBeTruthy();
    expect(input.getAttribute("aria-invalid")).toBe("true");
    expect(screen.queryByRole("img", { name: "Chosen photo" })).toBeNull();
    expect(URL.createObjectURL).not.toHaveBeenCalled();
  });

  it("shows the current photo when editing and offers to remove it", async () => {
    const { action, user } = renderForm({ flower: "Zinnia" }, {}, { url: "/photos/tag.jpg", added: "May 18, 2026" });

    expect(screen.getByRole("img", { name: "Current tag photo" }).getAttribute("src")).toBe("/photos/tag.jpg");
    expect(screen.getByText("Added May 18, 2026")).toBeTruthy();
    await user.click(screen.getByRole("checkbox", { name: "Remove photo" }));
    expect(screen.queryByRole("img", { name: "Current tag photo" })).toBeNull();
    await user.click(screen.getByRole("button", { name: "Save planting" }));
    expect(action.mock.calls[0][1].get("remove_tag_photo")).toBe("on");
  });

  it("shows an error the server returns", async () => {
    const { user } = renderForm({ flower: "Zinnia", planted_on: "2026-05-18" }, { error: "That bed no longer exists." });

    await user.click(screen.getByRole("button", { name: "Save planting" }));

    expect((await screen.findByRole("alert")).textContent).toBe("That bed no longer exists.");
  });
});
