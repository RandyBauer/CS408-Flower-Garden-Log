import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { AccountNav } from "@/components/AccountNav";
import { NavLinks, NavList } from "@/components/NavLinks";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Flower Garden Log", template: "%s · Flower Garden Log" },
  description: "Records what is planted in each flower bed, across seasons.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en">
      <body className="flex min-h-screen flex-col bg-stone-50 text-stone-800">
        <header className="border-b border-stone-300 bg-white">
          <nav className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
            <Link href="/" className="text-xl font-semibold text-emerald-900">
              Flower Garden Log
            </Link>
            <div className="flex items-center gap-5">
              <Suspense fallback={<NavList pathname={null} />}>
                <NavLinks />
              </Suspense>
              <Suspense fallback={null}>
                <AccountNav />
              </Suspense>
            </div>
          </nav>
        </header>
        <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-8">{children}</main>
        <footer className="border-t border-stone-300 bg-stone-100 py-4 text-center text-sm text-stone-600">
          Flower Garden Log · a record of the garden, bed by bed
        </footer>
      </body>
    </html>
  );
}
