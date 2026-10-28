// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ComponentProps } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SearchForm } from "@/components/SearchForm";
import { NO_FILTERS, type SearchFilters } from "@/lib/search";

// next/link and the router need Next.js; a plain anchor and a recorded push are enough here.
vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: ComponentProps<"a">) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

beforeEach(() => push.mockClear());
afterEach(cleanup);

const options = {
  zones: [
    { id: 1, name: "Front Walk" },
    { id: 2, name: "South Fence" },
  ],
  beds: [
    { id: 1, name: "Mailbox Bed", zoneId: 1, zoneName: "Front Walk" },
    { id: 4, name: "Fence Border", zoneId: 2, zoneName: "South Fence" },
  ],
  years: [2026, 2025, 2024],
  sources: ["Fred Meyer", "Home Depot"],
};

function renderForm(filters: Partial<SearchFilters> = {}) {
  render(<SearchForm filters={{ ...NO_FILTERS, ...filters }} options={options} />);
  return userEvent.setup();
}

const field = (name: RegExp) => screen.getByLabelText(name) as HTMLInputElement | HTMLSelectElement;

describe("SearchForm", () => {
  it("shows the filters from the address", () => {
    renderForm({ color: "coral", bed: 4, year: 2025, source: "Fred Meyer", verdict: "again", type: "annual", status: "past" });

    expect(field(/color/i).value).toBe("coral");
    expect(field(/zone or bed/i).value).toBe("bed-4");
    expect(field(/year/i).value).toBe("2025");
    expect(field(/source/i).value).toBe("Fred Meyer");
    expect(field(/verdict/i).value).toBe("again");
    expect(field(/type/i).value).toBe("annual");
    expect(field(/status/i).value).toBe("past");
    expect(field(/flower/i).value).toBe("");
  });

  it("lists each zone with its beds, and the recorded years and sources", () => {
    renderForm();

    const place = screen.getByRole("group", { name: "South Fence" });
    expect([...place.querySelectorAll("option")].map((option) => option.textContent)).toEqual([
      "All of South Fence",
      "Fence Border",
    ]);
    expect([...field(/year/i).querySelectorAll("option")].map((option) => option.value)).toEqual(["", "2026", "2025", "2024"]);
    expect([...field(/source/i).querySelectorAll("option")].map((option) => option.value)).toEqual([
      "",
      "Fred Meyer",
      "Home Depot",
    ]);
  });

  it("searches with only the filters that are set, in a fixed order", async () => {
    const user = renderForm();

    await user.selectOptions(field(/verdict/i), "again");
    await user.type(field(/color/i), "  coral ");
    await user.click(screen.getByRole("button", { name: "Search" }));

    expect(push).toHaveBeenCalledWith("/search?color=coral&verdict=again");
  });

  it("turns the zone or bed choice into a zone or bed filter", async () => {
    const user = renderForm();

    await user.selectOptions(field(/zone or bed/i), "All of South Fence");
    await user.selectOptions(field(/status/i), "Growing now");
    await user.click(screen.getByRole("button", { name: "Search" }));
    expect(push).toHaveBeenLastCalledWith("/search?zone=2&status=current");

    await user.selectOptions(field(/zone or bed/i), "Mailbox Bed");
    await user.click(screen.getByRole("button", { name: "Search" }));
    expect(push).toHaveBeenLastCalledWith("/search?bed=1&status=current");
  });

  it("goes back to the example searches when every filter is emptied", async () => {
    const user = renderForm({ flower: "Petunia" });

    await user.clear(field(/flower/i));
    await user.click(screen.getByRole("button", { name: "Search" }));

    expect(push).toHaveBeenCalledWith("/search");
  });

  it("links Clear to the search page with no filters", () => {
    renderForm({ color: "coral" });

    expect(screen.getByRole("link", { name: "Clear" }).getAttribute("href")).toBe("/search");
  });
});
