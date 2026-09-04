import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Home — Mianatra Manisa",
};

export default function HomePage() {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-cream px-6 py-12">
      <div className="text-center">
        <p className="font-mono text-xs font-medium uppercase tracking-[0.25em] text-secondary-dark">
          You are in
        </p>
        <h1 className="mt-2 text-2xl font-bold text-ink">Welcome home.</h1>
        <p className="mt-2 text-sm text-ink/70">Your projects will live here.</p>
      </div>
    </main>
  );
}
