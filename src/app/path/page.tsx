import Image from "next/image";
import Link from "next/link";
import { StartLessonButton } from "@/components/path/StartLessonButton";
import type { PracticeSettings } from "@/lib/question-generation/generate";
import { UnlockLessonButton } from "@/components/path/UnlockLessonButton";
import { getPathData } from "@/lib/curriculum/load";
import {
  buildReviewSettings,
  continueNode,
  lessonToSettings,
  lockReason,
  nextLocked,
  nextPurchase,
  statusLabel,
  type ProgressNode,
} from "@/lib/curriculum/progress";
import { CURRICULUM_NODES, PATHS } from "@/lib/curriculum/seed";
import { scenes } from "@/lib/home/scenes";

export default async function PathHomePage() {
  const data = await getPathData();
  const current = data.signedIn ? continueNode(data.nodes) : null;
  const offer = data.signedIn ? nextPurchase(data.nodes) : null;
  const upcoming = data.signedIn && !offer ? nextLocked(data.nodes) : null;
  const review = data.signedIn ? buildReviewSettings(data.mastery, data.now, data.range, data.pianoId) : null;
  const progress = current ? pathProgress(data.nodes, current) : null;
  const passed = new Set(data.nodes.filter((node) => node.passed).map((node) => node.slug));

  return (
    <div className="space-y-6 sm:space-y-8">
      <header className="relative overflow-hidden">
        {progress ? (
          <p aria-hidden="true" className="pointer-events-none absolute -top-4 right-0 font-serif text-8xl leading-none text-cream/[0.08] sm:text-9xl">
            {String(progress.index + 1).padStart(2, "0")}
          </p>
        ) : (
          <StaffMark />
        )}
        <p className="text-xs font-semibold tracking-[0.22em] text-gold uppercase">
          {progress ? `${progress.title} · Lesson ${progress.index + 1} of ${progress.total}` : "Four paths"}
        </p>
        <h1 className="relative mt-2 font-serif text-[2.75rem] leading-none text-cream sm:text-6xl">Path</h1>
        <p className="mt-3 max-w-xs text-base text-cream/75">Pass a lesson, then open the next. Giacominos are play money.</p>
      </header>

      {!data.ready ? <MigrationNotice /> : null}
      {data.ready && !data.presentationReady ? <PresentationNotice /> : null}
      {data.ready && !data.depthReady ? <DepthNotice /> : null}
      {data.ready && !data.economyReady ? <EconomyNotice /> : null}

      {data.ready && data.signedIn ? (
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1.35fr)_minmax(16rem,0.75fr)] lg:items-start">
          <ContinueCard current={current} progress={progress} review={review} range={data.range} pianoId={data.pianoId} latest={data.latest} />
          <div className="grid gap-3">
            {current ? (
              <section className="rounded-2xl bg-plum/80 px-4 py-4">
                <h2 className="font-serif text-2xl text-cream">Review</h2>
                {review ? (
                  <>
                    <p className="mt-1 text-sm text-cream/70">Weak spots, and one thing you already know.</p>
                    <div className="mt-3">
                      <StartLessonButton variant="ghost" label="Review" settings={review} meta={{ mode: "review", nodeSlug: null }} />
                    </div>
                  </>
                ) : (
                  <p className="mt-1 text-sm text-cream/70">Opens after a lesson with at least two sounds.</p>
                )}
              </section>
            ) : null}
            <section className="rounded-2xl border border-cream/10 bg-black/30 px-4 py-4">
              <div className="flex items-start gap-3">
                <LockMark />
                <div className="min-w-0">
                  <h2 className="font-serif text-2xl text-cream/85">Next</h2>
                  {offer ? <p className="mt-1 text-sm text-cream/65">{offer.title}</p> : null}
                  {upcoming ? (
                    <p className="mt-1 text-sm text-cream/65">
                      {lockReason(upcoming, CURRICULUM_NODES, passed)}
                      {upcoming.unlockCost > 0 ? ` Then ${upcoming.unlockCost} Giacominos.` : ""}
                    </p>
                  ) : null}
                  {!offer && !upcoming ? <p className="mt-1 text-sm text-cream/65">Nothing else is waiting.</p> : null}
                </div>
              </div>
              {offer ? (
                <div className="mt-3">
                  <UnlockLessonButton quiet slug={offer.slug} cost={offer.unlockCost} balance={data.giacominos} />
                </div>
              ) : null}
            </section>
          </div>
        </div>
      ) : null}

      {data.ready && !data.signedIn ? (
        <section className="flex flex-col gap-4 rounded-2xl bg-parchment p-5 text-espresso sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-serif text-3xl">Save your place</h2>
            <p className="mt-1 max-w-sm text-sm text-espresso/70">Log in to keep the lesson you are on and open the next one.</p>
          </div>
          <Link href="/login" className="inline-flex w-full items-center justify-center rounded-full bg-gold px-5 py-3 font-semibold text-espresso sm:w-auto">
            Log in
          </Link>
        </section>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 sm:gap-4">
        {PATHS.map((path, index) => {
          const scene = scenes[path.id];
          return (
            <Link
              key={path.id}
              href={`/path/${path.id}`}
              className="grid grid-cols-[6.5rem_minmax(0,1fr)] overflow-hidden rounded-2xl border border-cream/10 bg-plum/50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cream sm:relative sm:block"
            >
              <div className="relative min-h-24 sm:aspect-[16/10]">
                <Image
                  src={scene.src}
                  alt={scene.alt}
                  fill
                  priority={path.id === "intervals"}
                  unoptimized
                  sizes="(min-width: 640px) 24rem, 7rem"
                  className="object-cover"
                />
                <div className="absolute inset-0 hidden bg-gradient-to-t from-espresso via-espresso/20 to-transparent sm:block" />
              </div>
              <div className="flex min-w-0 flex-col justify-center p-3 sm:absolute sm:inset-x-0 sm:bottom-0 sm:p-5">
                <p className="text-xs font-semibold tracking-[0.18em] text-gold">{String(index + 1).padStart(2, "0")}</p>
                <h2 className="font-serif text-2xl text-cream sm:text-3xl">{path.title}</h2>
                <p className="mt-1 text-sm text-cream/75">{path.lede}</p>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

function ContinueCard({
  current,
  progress,
  review,
  range,
  pianoId,
  latest,
}: {
  current: ProgressNode | null;
  progress: { title: string; index: number; total: number; lessons: ProgressNode[] } | null;
  review: PracticeSettings | null;
  range: { low: number; high: number } | null;
  pianoId: string;
  latest: { correct: number; total: number } | null;
}) {
  if (!current || !progress) {
    return (
      <section className="rounded-2xl bg-parchment p-5 text-espresso sm:p-6">
        <p className="text-xs font-semibold tracking-[0.18em] text-burgundy uppercase">Continue</p>
        <h2 className="mt-2 font-serif text-4xl">The open lessons are mastered.</h2>
        <p className="mt-2 max-w-sm text-sm text-espresso/70">Review keeps them warm.</p>
        {review ? (
          <div className="mt-5">
            <StartLessonButton className="w-full sm:w-auto sm:min-w-56" label="Start review" settings={review} meta={{ mode: "review", nodeSlug: null }} />
          </div>
        ) : (
          <p className="mt-2 text-sm text-espresso/70">Finish a lesson with at least two sounds before review can choose.</p>
        )}
      </section>
    );
  }

  const scene = scenes[current.path];
  return (
    <section className="relative overflow-hidden rounded-2xl bg-parchment text-espresso">
      <div className="relative h-16 sm:absolute sm:inset-y-0 sm:right-0 sm:h-auto sm:w-44">
        <Image src={scene.src} alt="" fill unoptimized sizes="11rem" className="object-cover" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-parchment sm:bg-gradient-to-l" />
      </div>
      <div className="relative p-5 sm:max-w-xl sm:p-6 sm:pr-48">
        <p className="text-xs font-semibold tracking-[0.18em] text-burgundy uppercase">Continue</p>
        <h2 className="mt-2 font-serif text-4xl leading-none sm:text-5xl">{current.title}</h2>
        <p className="mt-2 text-sm text-espresso/70">{statusLabel(current.status)}</p>
        <StepRail lessons={progress.lessons} currentSlug={current.slug} />
        <div className="mt-5">
          <StartLessonButton
            className="w-full sm:w-auto sm:min-w-56"
            label={current.status === "unlocked" ? "Start lesson" : "Continue lesson"}
            settings={lessonToSettings(current.config, "lesson", range, pianoId)}
            meta={{ mode: "guided", nodeSlug: current.slug }}
          />
        </div>
        {latest ? (
          <p className="mt-3 text-sm text-espresso/60">
            Last round {latest.correct} of {latest.total}.
          </p>
        ) : null}
      </div>
    </section>
  );
}

function StepRail({ lessons, currentSlug }: { lessons: ProgressNode[]; currentSlug: string }) {
  const size = 8;
  const index = Math.max(0, lessons.findIndex((lesson) => lesson.slug === currentSlug));
  const start = lessons.length <= size ? 0 : Math.min(Math.max(0, index - 2), lessons.length - size);
  const slice = lessons.slice(start, start + size);

  return (
    <ol className="mt-4 flex items-center" aria-label="Lessons on this path">
      {slice.map((lesson, step) => {
        const here = lesson.slug === currentSlug;
        const done = lesson.passed || lesson.status === "mastered";
        return (
          <li key={lesson.slug} className="flex items-center">
            {step > 0 ? <span aria-hidden="true" className={`h-px w-3 sm:w-4 ${done || here ? "bg-burgundy" : "bg-espresso/20"}`} /> : null}
            <span
              title={lesson.title}
              className={
                here
                  ? "size-3 rounded-full bg-gold ring-4 ring-gold/30"
                  : done
                    ? "size-2.5 rounded-full bg-burgundy"
                    : "size-2.5 rounded-full border border-espresso/35"
              }
            >
              <span className="sr-only">
                {`${lesson.title}, ${here ? "current" : done ? "passed" : "ahead"}`}
              </span>
            </span>
          </li>
        );
      })}
    </ol>
  );
}

function pathProgress(nodes: ProgressNode[], current: ProgressNode) {
  const lessons = nodes.filter((node) => node.path === current.path).sort((left, right) => left.sortOrder - right.sortOrder);
  const index = Math.max(0, lessons.findIndex((lesson) => lesson.slug === current.slug));
  const title = PATHS.find((path) => path.id === current.path)?.title ?? "Path";
  return { title, index, total: lessons.length, lessons };
}

function StaffMark() {
  return (
    <svg aria-hidden="true" viewBox="0 0 220 110" className="pointer-events-none absolute -top-1 right-0 h-24 w-40 text-gold/30 sm:h-28 sm:w-52">
      {[16, 32, 48, 64, 80].map((y) => (
        <line key={y} x1="0" x2="220" y1={y} y2={y} stroke="currentColor" strokeWidth="1.25" />
      ))}
      <ellipse cx="176" cy="48" rx="11" ry="8" fill="none" stroke="currentColor" strokeWidth="1.4" transform="rotate(-20 176 48)" />
    </svg>
  );
}

function LockMark() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="mt-1 size-5 shrink-0 text-cream/50" fill="none" stroke="currentColor" strokeWidth="1.7">
      <rect x="5" y="11" width="14" height="9" rx="2" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" />
    </svg>
  );
}

function PresentationNotice() {
  return (
    <Notice title="How a lesson is played">
      Run supabase/migrations/20260928010000_presentation_lessons.sql in the Supabase SQL editor, then reload. Ascending, descending, melodic, harmonic, and mixed stay off the map until then.
    </Notice>
  );
}

function DepthNotice() {
  return (
    <Notice title="Deeper lessons">
      Run supabase/migrations/20260927210000_depth.sql in the Supabase SQL editor, then reload. Sixths through the fifteenth, inversions, sevenths, and cadences stay off the map until then.
    </Notice>
  );
}

function EconomyNotice() {
  return (
    <Notice title="Giacominos">
      Run supabase/migrations/20260927200000_economy.sql in the Supabase SQL editor, then reload. Until then, passing a lesson still opens the next one for free.
    </Notice>
  );
}

function MigrationNotice() {
  return (
    <Notice title="Save the path">
      Run supabase/migrations/20260927193000_curriculum.sql in the Supabase SQL editor, then reload. The lesson list below is the map. Progress is stored after that migration.
    </Notice>
  );
}

function Notice({ title, children }: { title: string; children: string }) {
  return (
    <section className="rounded-2xl border border-cream/15 bg-plum/60 p-4">
      <h2 className="font-serif text-2xl text-cream">{title}</h2>
      <p className="mt-2 text-sm text-cream/75">{children}</p>
    </section>
  );
}
