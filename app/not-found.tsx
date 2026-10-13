import Link from "next/link";

export default function NotFound() {
  return (
    <>
      <h1 className="text-3xl font-semibold">Page not found</h1>
      <p className="mt-2 text-stone-600">
        Nothing is recorded at this address. <Link href="/zones" className="text-emerald-800 underline">Browse zones</Link>
      </p>
    </>
  );
}
