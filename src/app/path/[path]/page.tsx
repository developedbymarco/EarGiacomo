import Link from "next/link";
import { notFound } from "next/navigation";
import { StartLessonButton } from "@/components/path/StartLessonButton";
import { UnlockLessonButton } from "@/components/path/UnlockLessonButton";
import { getPathData } from "@/lib/curriculum/load";
import { conceptLine, lessonToSettings, lockReason, statusLabel } from "@/lib/curriculum/progress";
import { isPathId, PATHS } from "@/lib/curriculum/seed";

export default async function PathDetailPage({ params }: { params: Promise<{ path: string }> }) {
  const { path: pathId } = await params;
  if (!isPathId(pathId)) notFound();
  const path = PATHS.find((item) => item.id === pathId)!;
  const data = await getPathData();
  const nodes = data.nodes.filter((node) => node.path === pathId);

  return (
    <div className="space-y-8">
      <div>
        <p>
          <Link href="/path" className="text-gold underline-offset-4 hover:underline">
            All paths
          </Link>
        </p>
        <h1 className="mt-3 font-serif text-5xl text-cream">{path.title}</h1>
        <p className="mt-3 max-w-2xl text-lg text-parchment">{path.lede}</p>
      </div>

      {nodes.length === 0 ? (
        <p className="text-parchment">
          These lessons appear after supabase/migrations/20260927210000_depth.sql is applied.
        </p>
      ) : (
        <ol className="space-y-4 border-l border-gold/40 py-2 pl-6">
          {nodes.map((node) => {
            const concepts = conceptLine(node.concepts, data.mastery);
            const locked = node.status === "locked";
            const canStart = data.ready && data.signedIn && !locked && node.status !== "purchasable";
            return (
              <li
                key={node.slug}
                className={
                  locked
                    ? "rounded-3xl border border-dashed border-parchment/35 bg-espresso/70 p-5"
                    : "rounded-3xl border border-gold/30 bg-plum/50 p-5"
                }
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    {locked ? (
                      <p className="text-lg text-parchment">Locked</p>
                    ) : (
                      <p className="text-sm tracking-wide text-gold uppercase">{statusLabel(node.status)}</p>
                    )}
                    <h2 className={`mt-1 font-serif text-3xl ${locked ? "text-parchment/75" : "text-cream"}`}>{node.title}</h2>
                  </div>
                  {locked ? <LockMark className="size-11 shrink-0 text-parchment/80" /> : null}
                </div>
                <p className={`mt-2 ${locked ? "text-parchment/60" : "text-parchment"}`}>{node.description}</p>
                {node.passed && node.status !== "mastered" ? <p className="mt-2 text-parchment">Lesson passed.</p> : null}
                {concepts ? <p className="mt-2 text-parchment">{concepts}</p> : null}
                {node.status === "locked" ? (
                  <p className="mt-2 text-parchment">
                    {lockReason(node, data.nodes, passingFrom(data.nodes))}
                    {node.unlockCost > 0 ? ` Then it costs ${node.unlockCost} Giacominos.` : ""}
                  </p>
                ) : null}
                {!data.ready && node.status === "unlocked" ? (
                  <p className="mt-2 text-parchment">Run the path migration, then this lesson can be saved.</p>
                ) : null}
                {node.status === "purchasable" && data.signedIn ? (
                  <div className="mt-4">
                    <UnlockLessonButton slug={node.slug} cost={node.unlockCost} balance={data.giacominos} />
                  </div>
                ) : null}
                <div className="mt-4">
                  {canStart ? (
                    <StartLessonButton
                      label={node.status === "unlocked" ? "Start" : "Practice"}
                      settings={lessonToSettings(node.config, "lesson", data.range, data.pianoId)}
                      meta={{ mode: "guided", nodeSlug: node.slug }}
                    />
                  ) : null}
                  {data.ready && !data.signedIn && node.status === "unlocked" ? (
                    <Link href="/login" className="text-gold underline-offset-4 hover:underline">
                      Log in to start
                    </Link>
                  ) : null}
                </div>
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
