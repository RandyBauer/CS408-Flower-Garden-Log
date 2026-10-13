"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { sections } from "@/lib/sections";

const links: { href: string; navLabel: string; paths?: readonly string[] }[] = [
  { href: "/", navLabel: "Home" },
  ...sections,
];

// The current path is only known at request time, so the layout renders NavList with no
// active link in the static shell and swaps in NavLinks inside <Suspense>.
export function NavLinks() {
  return <NavList pathname={usePathname()} />;
}

export function NavList({ pathname }: { pathname: string | null }) {
  return (
    <ul className="flex gap-5 text-sm">
      {links.map(({ href, navLabel, paths }) => {
        const active = paths
          ? paths.some((prefix) => pathname?.startsWith(prefix))
          : pathname === href;
        return (
          <li key={href}>
            <Link
              href={href}
              aria-current={active ? "page" : undefined}
              className={
                active
                  ? "font-semibold text-stone-900 underline underline-offset-4"
                  : "text-stone-600 hover:text-stone-900"
              }
            >
              {navLabel}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
