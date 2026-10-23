import type { Metadata } from "next";
import { SignInForm } from "@/components/GardenForms";
import { signIn } from "@/lib/actions";

export const metadata: Metadata = { title: "Sign in" };

export default function SignInPage() {
  return (
    <section className="mx-auto mt-6 max-w-sm rounded-lg border border-stone-300 bg-white p-6">
      <h1 className="text-2xl font-semibold">Gardener sign in</h1>
      <div className="mt-4">
        <SignInForm action={signIn} />
      </div>
      <p className="mt-4 text-sm text-stone-500">Visitors do not need an account.</p>
    </section>
  );
}
