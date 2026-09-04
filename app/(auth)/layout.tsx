export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-dvh bg-cream lg:grid lg:grid-cols-[2fr_3fr]">
      <aside className="relative overflow-hidden bg-secondary lg:flex lg:flex-col lg:justify-between lg:p-12">
        <p className="p-6 font-mono text-xs font-medium uppercase tracking-[0.25em] text-white lg:p-0">
          Mianatra Manisa
        </p>
        <div className="hidden lg:block">
          <h2 className="text-2xl font-bold text-cream">Counting, made simple.</h2>
          <p className="mt-4 max-w-sm text-base text-white">
            Track tallies for every project — from the first count to the
            thousandth.
          </p>
        </div>
        <p className="hidden font-mono text-xs font-medium uppercase tracking-[0.25em] text-white lg:block">
          Ray &mdash; Roa &mdash; Telo
        </p>
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-20 -right-6 select-none text-[10rem] font-bold leading-none text-primary lg:-bottom-24 lg:text-[16rem]"
        >
          123
        </div>
      </aside>
      <section className="flex items-center justify-center px-6 py-12 lg:py-16">
        <div className="w-full max-w-sm">{children}</div>
      </section>
    </main>
  );
}
