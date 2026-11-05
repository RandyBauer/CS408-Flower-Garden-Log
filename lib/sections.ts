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
  {
    href: "/rack",
    label: "Grow rack",
    navLabel: "Grow rack",
    paths: ["/rack"],
    description: "Starters under the grow lights, and transplanting them to beds.",
  },
  {
    href: "/plants",
    label: "Plant library",
    navLabel: "Library",
    paths: ["/plants"],
    description: "Every flower, variety, and color recorded, with the years each was grown.",
  },
  {
    href: "/search",
    label: "Search",
    navLabel: "Search",
    paths: ["/search"],
    description: "Find plantings by flower, color, bed, year, source, or verdict.",
  },
] as const;
