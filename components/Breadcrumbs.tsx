import Link from "next/link";

export function Breadcrumbs({ trail }: { trail: { href?: string; label: string }[] }) {
  return (
    <nav aria-label="Breadcrumb" className="mb-2 text-sm text-stone-500">
      {trail.map((crumb, i) => (
        <span key={crumb.label}>
          {i > 0 && <span className="mx-1.5">›</span>}
          {crumb.href ? (
            <Link href={crumb.href} className="hover:text-stone-800 hover:underline">
              {crumb.label}
            </Link>
          ) : (
            <span aria-current="page">{crumb.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}
