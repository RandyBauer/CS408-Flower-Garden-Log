// Class names shared by server and client components. Kept out of the "use client" form
// modules: a constant exported from one reaches a server component as a client reference,
// not a string.

export const inputClass =
  "mt-1 block w-full rounded-md border border-stone-400 bg-white px-3 py-2 text-sm aria-[invalid=true]:border-red-700";

export const primaryButton =
  "rounded-md bg-emerald-800 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-900 disabled:opacity-60";

export const secondaryButton =
  "rounded-md border border-stone-400 bg-white px-4 py-2 text-sm hover:bg-stone-100";

export const dangerButton =
  "rounded-md border border-red-700 bg-white px-4 py-2 text-sm text-red-800 hover:bg-red-50 disabled:cursor-not-allowed disabled:border-stone-300 disabled:text-stone-400 disabled:hover:bg-white";
