import Image from "next/image";
import Link from "next/link";
import { PATHS } from "@/lib/curriculum/seed";
import { scenes } from "@/lib/home/scenes";

const ways = [
  {
    scene: scenes.intervals,
    title: "Listen",
    text: "Two notes, a chord, or a cadence. Name the sound.",
  },
  {
    scene: scenes.visual,
    title: "Read",
    text: "The same ideas, written on the staff.",
  },
  {
    scene: scenes.chords,
    title: "See",
    text: "Keys light up. You name what is under your hand.",
  },
] as const;

export default function Home() {
  return (
    <div className="relative -mx-4">
      <section className="mx-auto grid max-w-6xl items-center gap-6 px-4 pt-2 pb-10 sm:gap-10 sm:pt-4 sm:pb-16 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:gap-16 lg:pt-8 lg:pb-24">
        <div>
          <p className="text-sm font-semibold tracking-[0.28em] text-gold uppercase">Ear training</p>
          <h1 className="mt-3 font-serif text-5xl leading-[0.92] text-cream sm:mt-4 sm:text-7xl lg:text-8xl">
            Hear it.
            <br />
            Name it.
          </h1>
          <p className="mt-4 max-w-md text-lg leading-relaxed text-parchment sm:mt-6 sm:text-xl">
            A practice room for intervals, chords, the staff, and cadences. Short rounds, a path that opens as you improve, and matches with friends.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/path"
              className="inline-flex items-center justify-center rounded-full bg-gold px-6 py-3 text-base font-semibold text-espresso"
            >
              Follow the path
            </Link>
            <Link
              href="/practice"
              className="inline-flex items-center justify-center rounded-full border border-cream/30 px-6 py-3 text-base font-semibold text-cream"
            >
              Open practice
            </Link>
            <Link
              href="/leaderboard"
              className="inline-flex items-center justify-center rounded-full border border-cream/30 px-6 py-3 text-base font-semibold text-cream"
            >
              Ear Rating
            </Link>
          </div>
        </div>
        <figure className="relative">
          <div className="relative aspect-[2/1] overflow-hidden rounded-3xl shadow-[0_24px_48px_rgb(0_0_0/0.45)] sm:aspect-[16/10] sm:rounded-[2rem] sm:shadow-[0_40px_80px_rgb(0_0_0/0.45)]">
            <Image
              src={scenes.hero.src}
              alt={scenes.hero.alt}
              fill
              priority
              unoptimized
              sizes="(min-width: 1024px) 52vw, 100vw"
              className="object-cover"
            />
          </div>
          <figcaption className="mt-3 text-sm text-parchment/80">The same sampled grand you practice on.</figcaption>
        </figure>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-10 sm:pb-16">
        <h2 className="font-serif text-4xl text-cream sm:text-5xl">How a round feels</h2>
        <p className="mt-2 max-w-xl text-base text-parchment sm:mt-3 sm:text-lg">One sound, or one picture. You name it. The answer list stays in theory order.</p>
        <ul className="mt-5 grid gap-3 md:mt-8 md:grid-cols-3 md:gap-5">
          {ways.map((way) => (
            <li key={way.title} className="grid grid-cols-[6.5rem_minmax(0,1fr)] overflow-hidden rounded-2xl border border-gold/25 bg-plum/40 md:block md:rounded-[2rem]">
              <div className="relative min-h-24 md:aspect-[4/3]">
                <Image src={way.scene.src} alt={way.scene.alt} fill unoptimized sizes="(min-width: 768px) 30vw, 7rem" className="object-cover" />
              </div>
              <div className="flex min-w-0 flex-col justify-center p-3 md:p-5">
                <h3 className="font-serif text-2xl text-cream md:text-4xl">{way.title}</h3>
                <p className="mt-1 text-sm text-parchment md:mt-2 md:text-base">{way.text}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-12 sm:pb-20">
        <div className="max-w-xl">
          <h2 className="font-serif text-4xl text-cream sm:text-5xl">Four paths</h2>
          <p className="mt-2 text-base text-parchment sm:mt-3 sm:text-lg">Pass a lesson, then spend Giacominos to open the next one. Open practice stays beside the path.</p>
        </div>
        <ul className="mt-5 grid gap-3 sm:mt-8 sm:grid-cols-2 sm:gap-4">
          {PATHS.map((path) => {
            const scene = scenes[path.id];
            return (
              <li key={path.id}>
                <Link
                  href={`/path/${path.id}`}
                  className="group relative grid grid-cols-[6.5rem_minmax(0,1fr)] overflow-hidden rounded-2xl border border-gold/25 bg-plum/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cream sm:block sm:rounded-[2rem] sm:border-transparent"
                >
                  <div className="relative min-h-24 sm:aspect-[16/10] lg:aspect-[4/3]">
                    <Image
                      src={scene.src}
                      alt=""
                      fill
                      unoptimized
                      sizes="(min-width: 1024px) 32vw, (min-width: 640px) 46vw, 7rem"
                      className="object-cover transition duration-500 group-hover:scale-[1.03]"
                    />
                    <div className="absolute inset-0 hidden bg-gradient-to-t from-espresso via-espresso/25 to-transparent sm:block" />
                  </div>
                  <div className="flex min-w-0 flex-col justify-center p-3 sm:absolute sm:inset-x-0 sm:bottom-0 sm:p-6">
                    <h3 className="font-serif text-2xl text-cream sm:text-4xl">{path.title}</h3>
                    <p className="mt-1 text-sm text-parchment sm:text-base">{path.lede}</p>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="bg-parchment text-espresso">
        <div className="mx-auto grid max-w-6xl items-center gap-5 px-4 py-10 sm:gap-8 sm:py-14 md:grid-cols-2 md:py-20">
          <div className="relative aspect-[5/2] w-full overflow-hidden rounded-3xl shadow-[0_16px_40px_rgb(36_28_25/0.2)] sm:mx-auto sm:aspect-square sm:max-w-md sm:rounded-[2rem] sm:shadow-[0_24px_60px_rgb(36_28_25/0.25)]">
            <Image src={scenes.coins.src} alt={scenes.coins.alt} fill unoptimized sizes="(min-width: 768px) 28rem, 100vw" className="object-cover" />
          </div>
          <div>
            <h2 className="font-serif text-4xl sm:text-5xl md:text-6xl">Giacominos</h2>
            <p className="mt-4 text-lg leading-relaxed">
              Play money, not a score. Every finished round pays some, even when every answer is wrong. A lesson you pass pays more. Spend them to open the next step, or stake them on a match with a friend.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/path" className="inline-flex items-center justify-center rounded-full bg-espresso px-6 py-3 font-semibold text-cream">
                Open the path
              </Link>
              <Link href="/battles" className="inline-flex items-center justify-center rounded-full border border-espresso/30 px-6 py-3 font-semibold text-espresso">
                Challenge a friend
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-4 py-12 text-center sm:py-20 lg:py-28">
        <h2 className="font-serif text-4xl text-cream sm:text-5xl lg:text-7xl">Sit down for one round.</h2>
        <p className="mx-auto mt-4 max-w-lg text-xl text-parchment">Ten questions. A few minutes. The piano is already in the room.</p>
        <Link
          href="/practice"
          className="mt-8 inline-flex items-center justify-center rounded-full bg-gold px-6 py-3 text-base font-semibold text-espresso"
        >
          Start practicing
        </Link>
      </section>
    </div>
  );
}
