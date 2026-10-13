const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

// "2026-05-18" -> "May 18, 2026". Parsed by hand so the server's time zone cannot shift the day.
export function formatDate(iso: string): string {
  const [year, month, day] = iso.split("-").map(Number);
  return `${MONTHS[month - 1]} ${day}, ${year}`;
}

// The years a planting spanned: "2025", or "2021–2025" for a perennial removed later.
export function seasonLabel(plantedOn: string, removedOn: string | null): string {
  const start = plantedOn.slice(0, 4);
  const end = (removedOn ?? plantedOn).slice(0, 4);
  return start === end ? start : `${start}–${end}`;
}

// "Peony · Sarah Bernhardt · pink"
export function plantName(planting: { flower: string; variety: string; color: string }): string {
  return [planting.flower, planting.variety, planting.color].filter(Boolean).join(" · ");
}

export function parseId(value: string): number | undefined {
  return /^[1-9]\d{0,9}$/.test(value) ? Number(value) : undefined;
}
