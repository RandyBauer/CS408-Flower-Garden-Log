// Sections linked from the header and the home page. Each checkpoint adds its pages here, and
// the end-to-end test checks that every link on the home page reaches a working page.
export const sections = [
  {
    href: "/zones",
    label: "Zones and beds",
    navLabel: "Zones",
    // Path prefixes that mark this section active in the header.
    paths: ["/zones", "/beds"],
    description: "Areas of the garden, their beds, and what is planted in each.",
  },
] as const;
