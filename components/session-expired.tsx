import Link from "next/link";

export function SessionExpired() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center bg-cream px-6 text-center">
      <p className="font-mono text-xs font-medium uppercase tracking-[0.25em] text-secondary-dark">
        Session expired
      </p>
      <h1 className="mt-2 text-2xl font-bold text-ink">
        Your session has ended.
      </h1>
      <p className="mt-2 text-sm text-ink/70">Log in again to keep counting.</p>
      <Link
        href="/login"
        className="mt-6 flex h-10 items-center rounded-sm bg-primary px-4 text-sm font-semibold text-ink hover:bg-primary-dark focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary"
      >
        Log in
      </Link>
    </main>
  );
}
