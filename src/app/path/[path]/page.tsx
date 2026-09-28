import Link from "next/link";
import { notFound } from "next/navigation";
import { StartLessonButton } from "@/components/path/StartLessonButton";
import { UnlockLessonButton } from "@/components/path/UnlockLessonButton";
import { getPathData } from "@/lib/curriculum/load";
import { conceptLine, continueNode, lessonToSettings, lockReason, statusLabel } from "@/lib/curriculum/progress";
import { CURRICULUM_NODES, isPathId, PATHS } from "@/lib/curriculum/seed";

export default async function PathDetailPage({ params }: { params: Promise<{ path: string }> }) {
  const { path: pathId } = await params;
  if (!isPathId(pathId)) notFound();
  const path = PATHS.find((item) => item.id === pathId)!;
  const data = await getPathData();
  const nodes = data.nodes.filter((node) => node.path === pathId);
  const spotlight = continueNode(nodes)?.slug ?? null;
  const passedCount = nodes.filter((node) => node.passed).length;

  return (
    <div className="space-y-6 sm:space-y-8">
      <div>
        <p>
          <Link href="/path" className="text-sm text-cream/70 underline-offset-4 hover:text-cream hover:underline">
            All paths
          </Link>
        </p>
        <p className="mt-4 text-xs font-semibold tracking-[0.22em] text-gold uppercase">
          {nodes.length > 0 ? `${passedCount} of ${nodes.length} passed` : "Path"}
        </p>
        <h1 className="mt-2 font-serif text-[2.75rem] leading-none text-cream sm:text-6xl">{path.title}</h1>
        <p className="mt-3 max-w-xs text-base text-cream/75">{path.lede}</p>
      </div>
      {data.ready && !data.presentationReady && (pathId === "intervals" || pathId === "chords") ? (
        <p className="text-parchment">
          Run supabase/migrations/20260928010000_presentation_lessons.sql in the Supabase SQL editor, then reload. The
          ascending, descending, melodic, harmonic, and mixed lessons stay off this path until then.
        </p>
      ) : null}

      {nodes.length === 0 ? (
        <p className="text-parchment">
          These lessons appear after supabase/migrations/20260927210000_depth.sql is applied.
        </p>
      ) : (
        <ol className="space-y-3">
          {nodes.map((node, index) => {
            const concepts = conceptLine(node.concepts, data.mastery);
            const locked = node.status === "locked";
            const here = node.slug === spotlight;
            const canStart = data.ready && data.signedIn && !locked && node.status !== "purchasable";
            const done = node.passed || node.status === "mastered";
            return (
              <li key={node.slug} className="flex gap-3">
                <div className="flex w-4 shrink-0 flex-col items-center" aria-hidden="true">
                  <span
                    className={
                      here
                        ? "mt-6 size-3 rounded-full bg-gold ring-4 ring-gold/25"
                        : done
                          ? "mt-6 size-2.5 rounded-full bg-gold/80"
                          : "mt-6 size-2.5 rounded-full border border-cream/30"
                    }
                  />
                  {index < nodes.length - 1 ? <span className="mt-1 w-px flex-1 bg-cream/35" /> : null}
                </div>
                <article
                  className={
                    here
                      ? "mb-1 min-w-0 flex-1 rounded-2xl bg-parchment p-4 text-espresso sm:p-5"
                      : locked
                        ? "mb-1 min-w-0 flex-1 rounded-2xl border border-cream/10 bg-black/25 p-4 sm:p-5"
                        : "mb-1 min-w-0 flex-1 rounded-2xl bg-plum/50 p-4 sm:p-5"
                  }
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className={`text-xs font-semibold tracking-[0.16em] uppercase ${here ? "text-burgundy" : "text-cream/55"}`}>
                        {locked ? "Locked" : statusLabel(node.status)}
                      </p>
                      <h2 className={`mt-1 font-serif text-3xl ${here ? "text-espresso" : locked ? "text-cream/70" : "text-cream"}`}>{node.title}</h2>
                    </div>
                    {locked || node.status === "purchasable" ? <LockMark className={here ? "size-6 text-espresso/50" : "size-6 text-cream/45"} /> : null}
                  </div>
                  <p className={`mt-2 text-sm ${here ? "text-espresso/75" : locked ? "text-cream/50" : "text-cream/75"}`}>{node.description}</p>
                  {node.passed && node.status !== "mastered" ? (
                    <p className={`mt-2 text-sm ${here ? "text-espresso/70" : "text-cream/70"}`}>Lesson passed.</p>
                  ) : null}
                  {concepts ? <p className={`mt-2 text-sm ${here ? "text-espresso/70" : "text-cream/70"}`}>{concepts}</p> : null}
                  {node.status === "locked" ? (
                    <p className="mt-2 text-sm text-cream/55">
                      {lockReason(node, CURRICULUM_NODES, passingFrom(data.nodes))}
                      {node.unlockCost > 0 ? ` Then ${node.unlockCost} Giacominos.` : ""}
                    </p>
                  ) : null}
                  {!data.ready && node.status === "unlocked" ? (
                    <p className={`mt-2 text-sm ${here ? "text-espresso/70" : "text-cream/70"}`}>Run the path migration, then this lesson can be saved.</p>
                  ) : null}
                  {node.status === "purchasable" && data.signedIn ? (
                    <div className="mt-4">
                      <UnlockLessonButton quiet slug={node.slug} cost={node.unlockCost} balance={data.giacominos} />
                    </div>
                  ) : null}
                  {canStart ? (
                    <div className="mt-4">
                      <StartLessonButton
                        className={here ? "w-full sm:w-auto sm:min-w-56" : ""}
                        variant={here ? "gold" : "ghost"}
                        label={node.status === "unlocked" ? "Start lesson" : "Continue lesson"}
                        settings={lessonToSettings(node.config, "lesson", data.range, data.pianoId)}
                        meta={{ mode: "guided", nodeSlug: node.slug }}
                      />
                    </div>
                  ) : null}
                  {data.ready && !data.signedIn && node.status === "unlocked" ? (
                    <Link href="/login" className={`mt-4 inline-flex font-semibold underline-offset-4 hover:underline ${here ? "text-burgundy" : "text-gold"}`}>
                      Log in to start
                    </Link>
                  ) : null}
                </article>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}

function passingFrom(nodes: { slug: string; passed: boolean }[]): Set<string> {
  return new Set(nodes.filter((node) => node.passed).map((node) => node.slug));
}

function LockMark({ className = "size-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className} fill="none" stroke="currentColor" strokeWidth="1.7">
      <rect x="5" y="11" width="14" height="9" rx="2" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" />
    </svg>
  );
}
