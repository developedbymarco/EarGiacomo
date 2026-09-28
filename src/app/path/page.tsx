import Image from "next/image";
import Link from "next/link";
import { StartLessonButton } from "@/components/path/StartLessonButton";
import { UnlockLessonButton } from "@/components/path/UnlockLessonButton";
import { getPathData } from "@/lib/curriculum/load";
import {
  buildReviewSettings,
  continueNode,
  lessonToSettings,
  nextLocked,
  nextPurchase,
  statusLabel,
} from "@/lib/curriculum/progress";
import { PATHS } from "@/lib/curriculum/seed";
import { scenes } from "@/lib/home/scenes";

export default async function PathHomePage() {
  const data = await getPathData();
  const current = data.signedIn ? continueNode(data.nodes) : null;
  const offer = data.signedIn ? nextPurchase(data.nodes) : null;
  const upcoming = data.signedIn && !offer ? nextLocked(data.nodes) : null;
  const review = data.signedIn ? buildReviewSettings(data.mastery, data.now, data.range, data.pianoId) : null;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-serif text-5xl text-cream">Path</h1>
        <p className="mt-3 max-w-2xl text-lg text-parchment">
          Four paths. Pass a lesson, then spend Giacominos to open the next one. Giacominos are play money. Open practice stays beside this.
        </p>
      </div>

      {!data.ready ? <MigrationNotice /> : null}
      {data.ready && !data.presentationReady ? <PresentationNotice /> : null}
      {data.ready && !data.depthReady ? <DepthNotice /> : null}
      {data.ready && !data.economyReady ? <EconomyNotice /> : null}

      {data.ready && data.signedIn ? (
        <div className="grid gap-4 md:grid-cols-3">
          <section className="rounded-3xl border border-gold/40 bg-plum/70 p-5">
            <h2 className="font-serif text-3xl text-cream">Continue</h2>
            {current ? (
              <>
                <p className="mt-2 text-parchment">
                  {current.title} · {statusLabel(current.status)}
                </p>
                <div className="mt-4">
                  <StartLessonButton
                    label={current.status === "unlocked" ? "Start" : "Practice"}
                    settings={lessonToSettings(current.config, "lesson", data.range, data.pianoId)}
                    meta={{ mode: "guided", nodeSlug: current.slug }}
                  />
                </div>
              </>
            ) : (
              <p className="mt-2 text-parchment">Every open lesson is mastered. Review keeps them warm.</p>
            )}
          </section>
          <section className="rounded-3xl border border-gold/30 bg-plum/50 p-5">
            <h2 className="font-serif text-3xl text-cream">Review</h2>
            {review ? (
              <>
                <p className="mt-2 text-parchment">Weak spots, recent misses, and one concept you already know well.</p>
                <div className="mt-4">
                  <StartLessonButton label="Start review" settings={review} meta={{ mode: "review", nodeSlug: null }} />
                </div>
              </>
            ) : (
              <p className="mt-2 text-parchment">Finish a lesson with at least two sounds, then review can choose for you.</p>
            )}
          </section>
          <section className="rounded-3xl border border-gold/30 bg-plum/50 p-5">
            <h2 className="font-serif text-3xl text-cream">Next</h2>
            {offer ? (
              <>
                <p className="mt-2 text-parchment">{offer.title}</p>
                <div className="mt-4">
                  <UnlockLessonButton slug={offer.slug} cost={offer.unlockCost} balance={data.giacominos} />
                </div>
              </>
            ) : upcoming ? (
              <p className="mt-2 text-parchment">
                {upcoming.title} stays locked until the lesson before it is passed
                {upcoming.unlockCost > 0 ? `, then it costs ${upcoming.unlockCost} Giacominos` : ""}.
              </p>
            ) : (
              <p className="mt-2 text-parchment">Nothing else is waiting on this map.</p>
            )}
            {data.latest ? (
              <p className="mt-3 text-parchment">
                Last session: {data.latest.correct} of {data.latest.total}.
              </p>
            ) : null}
          </section>
        </div>
      ) : null}

      {data.ready && !data.signedIn ? (
        <p className="text-parchment">
          <Link href="/login" className="text-gold underline-offset-4 hover:underline">
            Log in
          </Link>{" "}
          to save mastery and open the next lesson.
        </p>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        {PATHS.map((path) => {
          const scene = scenes[path.id];
          return (
            <Link
              key={path.id}
              href={`/path/${path.id}`}
              className="overflow-hidden rounded-3xl border border-gold/30 bg-plum/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cream"
            >
              <div className="relative aspect-[4/3]">
                <Image
                  src={scene.src}
                  alt={scene.alt}
                  fill
                  priority={path.id === "intervals"}
                  unoptimized
                  sizes="(min-width: 640px) 24rem, 100vw"
                  className="object-cover"
                />
              </div>
              <div className="p-5">
                <h2 className="font-serif text-3xl text-cream">{path.title}</h2>
                <p className="mt-2 text-parchment">{path.lede}</p>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

function PresentationNotice() {
  return (
    <section className="rounded-3xl border border-gold/40 bg-plum/70 p-5">
      <h2 className="font-serif text-3xl text-cream">How a lesson is played</h2>
      <p className="mt-2 text-parchment">
        Run <span className="text-cream">supabase/migrations/20260928010000_presentation_lessons.sql</span> in the Supabase SQL
        editor, then reload. Ascending, descending, melodic, harmonic, and mixed stay off the map until then.
      </p>
    </section>
  );
}

function DepthNotice() {
  return (
    <section className="rounded-3xl border border-gold/40 bg-plum/70 p-5">
      <h2 className="font-serif text-3xl text-cream">Deeper lessons</h2>
      <p className="mt-2 text-parchment">
        Run <span className="text-cream">supabase/migrations/20260927210000_depth.sql</span> in the Supabase SQL
        editor, then reload. Sixths through the fifteenth, inversions, sevenths, and cadences stay off the map until
        then. Lessons you already opened stay open.
      </p>
    </section>
  );
}

function EconomyNotice() {
  return (
    <section className="rounded-3xl border border-gold/40 bg-plum/70 p-5">
      <h2 className="font-serif text-3xl text-cream">Giacominos</h2>
      <p className="mt-2 text-parchment">
        Run <span className="text-cream">supabase/migrations/20260927200000_economy.sql</span> in the Supabase SQL
        editor, then reload. Until then, passing a lesson still opens the next one for free.
      </p>
    </section>
  );
}

function MigrationNotice() {
  return (
    <section className="rounded-3xl border border-gold/40 bg-plum/70 p-5">
      <h2 className="font-serif text-3xl text-cream">Save the path</h2>
      <p className="mt-2 text-parchment">
        Run <span className="text-cream">supabase/migrations/20260927193000_curriculum.sql</span> in the Supabase SQL
        editor, then reload. The lesson list below is the map. Progress is stored after that migration.
      </p>
    </section>
  );
}
