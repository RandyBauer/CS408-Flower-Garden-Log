import Link from "next/link";
import { signOut } from "@/lib/actions";
import { getGardener } from "@/lib/session";

// Sign in or Sign out at the end of the header. Reads the session, so the layout renders it
// inside <Suspense>.
export async function AccountNav() {
  const gardener = await getGardener();
  if (!gardener) {
    return (
      <Link href="/sign-in" className="text-sm text-stone-600 hover:text-stone-900">
        Sign in
      </Link>
    );
  }
  return (
    <form action={signOut}>
      <button type="submit" title={`Signed in as ${gardener.email}`} className="text-sm text-stone-600 hover:text-stone-900">
        Sign out
      </button>
    </form>
  );
}
