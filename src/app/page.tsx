import Link from "next/link";

export default function Home() {
  return (
    <section className="mx-auto max-w-3xl py-10 sm:py-16">
      <p className="text-sm tracking-[0.25em] text-gold uppercase">Ear training</p>
      <h1 className="mt-3 font-serif text-6xl text-cream sm:text-7xl">EarGiacomo</h1>
      <p className="mt-6 max-w-xl text-xl leading-relaxed text-parchment">
        A quiet practice room for intervals and triads. Hear them, read them on the staff, or see them on the piano,
        then name what is there.
      </p>
      <div className="mt-8 flex flex-wrap gap-3">
        <Link
          href="/path"
          className="inline-flex items-center justify-center rounded-full bg-gold px-5 py-3 text-base font-semibold text-espresso focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cream"
        >
          Follow the path
        </Link>
        <Link
          href="/practice"
          className="inline-flex items-center justify-center rounded-full border border-cream/30 px-5 py-3 text-base font-semibold text-cream focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cream"
        >
          Open practice
        </Link>
      </div>
    </section>
  );
}
