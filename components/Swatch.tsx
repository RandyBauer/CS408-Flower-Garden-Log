// Color swatch drawn from a planting's recorded color, shown where a photo would go.
const COLORS: Record<string, string> = {
  red: "#c0392b",
  coral: "#f08070",
  orange: "#f08a24",
  yellow: "#f4c430",
  white: "#f7f5ef",
  pink: "#f19cbb",
  purple: "#8e5bb5",
  blue: "#4a6fd1",
  lavender: "#b9a3e3",
  green: "#6a9f4b",
  mixed: "linear-gradient(135deg, #f19cbb, #f4c430, #8e5bb5)",
};

export function swatchBackground(color: string): string {
  return COLORS[color.trim().toLowerCase()] ?? "#d6d3d1";
}

export function Swatch({ color, className = "size-3.5" }: { color: string; className?: string }) {
  return (
    <span
      aria-hidden
      className={`inline-block shrink-0 rounded-sm border border-stone-400/60 ${className}`}
      style={{ background: swatchBackground(color) }}
    />
  );
}
