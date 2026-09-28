import Image from "next/image";
import Link from "next/link";
import { StartLessonButton } from "@/components/path/StartLessonButton";
import { getAccountContext } from "@/lib/account/session";
import { loadBattleLists } from "@/lib/battles/load";
import type { BattleCard } from "@/lib/battles/types";
import { stakeLabel } from "@/lib/battles/rules";
import { getPathData } from "@/lib/curriculum/load";
import {
  buildReviewSettings,
  continueNode,
  lessonToSettings,
  lockReason,
  nextLocked,
  nextPurchase,
  type ProgressNode,
} from "@/lib/curriculum/progress";
import { CURRICULUM_NODES, PATHS } from "@/lib/curriculum/seed";
import { levelForXp, xpToReachLevel } from "@/lib/economy/rewards";
import { scenes } from "@/lib/home/scenes";
import { loadLeaderboard } from "@/lib/leaderboard/load";

export async function Today() {
  const [account, path, board, battles] = await Promise.all([getAccountContext(), getPathData(), loadLeaderboard(), loadBattleLists()]);
  const profile = account.profile;
  if (!profile) return null;

  const name = profile.display_name || profile.username;
  const current = path.signedIn ? continueNode(path.nodes) : null;
  const review = path.signedIn ? buildReviewSettings(path.mastery, path.now, path.range, path.pianoId) : null;
  const offer = path.signedIn ? nextPurchase(path.nodes) : null;
  const upcoming = path.signedIn && !offer ? nextLocked(path.nodes) : null;
  const progress = current ? pathProgress(path.nodes, current) : null;
  const passed = new Set(path.nodes.filter((node) => node.passed).map((node) => node.slug));
  const level = levelForXp(profile.xp);
  const floor = xpToReachLevel(level);
  const ceiling = xpToReachLevel(level + 1);
  const span = Math.max(1, ceiling - floor);
  const into = Math.max(0, profile.xp - floor);
  const incoming = battles.ready && "data" in battles ? battles.data.incoming : [];
  const active = battles.ready && "data" in battles ? battles.data.active : [];
  const rating = board.ready && "you" in board ? board.you : null;

  return (
    <div className="mx-auto max-w-lg space-y-5">
      <header>
        <p className="text-xs font-semibold tracking-[0.22em] text-gold uppercase">Today</p>
        <h1 className="mt-2 font-serif text-[2.75rem] leading-none text-cream">{name}</h1>
        <p className="mt-3 text-sm text-cream/70">
          Level {level} · {into} of {span} XP
        </p>
        <div
          className="mt-2 h-1.5 overflow-hidden rounded-full bg-cream/10"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={span}
          aria-valuenow={into}
          aria-label="Experience toward the next level"
        >
          <div className="h-full rounded-full bg-gold" style={{ width: `${Math.min(100, (into / span) * 100)}%` }} />
        </div>
      </header>

      {active.slice(0, 1).map((battle) => (
        <MatchRow key={battle.id} battle={battle} label="Match in progress" />
      ))}
      {incoming.slice(0, 2).map((battle) => (
        <MatchRow key={battle.id} battle={battle} label="Challenge" />
      ))}

      {path.ready && current && progress ? (
        <section className="overflow-hidden rounded-2xl bg-parchment text-espresso">
          <div className="grid grid-cols-[6.5rem_minmax(0,1fr)]">
            <div className="relative min-h-36">
              <Image src={scenes[current.path].src} alt="" fill unoptimized sizes="7rem" className="object-cover" />
            </div>
            <div className="flex min-w-0 flex-col justify-center p-4">
              <p className="text-xs font-semibold tracking-[0.18em] text-burgundy uppercase">Continue</p>
              <h2 className="mt-1 font-serif text-3xl leading-none">{current.title}</h2>
              <p className="mt-2 text-sm text-espresso/70">
                {progress.title} · {progress.index + 1} of {progress.total}
              </p>
              <div className="mt-4">
                <StartLessonButton
                  className="w-full"
                  label={current.status === "unlocked" ? "Start lesson" : "Continue lesson"}
                  settings={lessonToSettings(current.config, "lesson", path.range, path.pianoId)}
                  meta={{ mode: "guided", nodeSlug: current.slug }}
                />
              </div>
            </div>
          </div>
        </section>
      ) : (
        <section className="rounded-2xl bg-parchment p-5 text-espresso">
          <p className="text-xs font-semibold tracking-[0.18em] text-burgundy uppercase">{path.ready ? "Continue" : "Practice"}</p>
          <h2 className="mt-2 font-serif text-3xl leading-none">
            {path.ready ? "The open lessons are mastered." : "Practice is open."}
          </h2>
          <p className="mt-2 text-sm text-espresso/70">
            {path.ready ? "Review keeps them warm." : "The path appears after the curriculum migration."}
          </p>
          {path.ready && review ? (
            <div className="mt-4">
              <StartLessonButton className="w-full" label="Start review" settings={review} meta={{ mode: "review", nodeSlug: null }} />
            </div>
          ) : (
            <Link href="/practice" className="mt-4 inline-flex w-full items-center justify-center rounded-full bg-gold px-5 py-3 font-semibold text-espresso">
              Open practice
            </Link>
          )}
        </section>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl bg-plum/50 px-4 py-3">
          <p className="text-xs text-cream/55">Last round</p>
          <p className="mt-1 text-2xl font-semibold text-cream">{path.latest ? `${path.latest.correct}/${path.latest.total}` : "—"}</p>
        </div>
        <Link href="/leaderboard" className="rounded-2xl bg-plum/50 px-4 py-3 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cream">
          <p className="text-xs text-cream/55">Ear Rating</p>
          <p className="mt-1 text-2xl font-semibold text-cream">{ratingText(rating)}</p>
        </Link>
      </div>

      {path.ready && current && review ? (
        <section className="flex items-center justify-between gap-3 rounded-2xl bg-plum/50 px-4 py-3">
          <div>
            <h2 className="font-serif text-2xl text-cream">Review</h2>
            <p className="text-sm text-cream/60">Weak spots, and one thing you already know.</p>
          </div>
          <StartLessonButton variant="ghost" label="Review" settings={review} meta={{ mode: "review", nodeSlug: null }} />
        </section>
      ) : null}

      {path.ready && (offer || upcoming) ? (
        <Link
          href="/path"
          className="flex items-start gap-3 rounded-2xl border border-cream/10 bg-black/30 px-4 py-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cream"
        >
          <LockMark />
          <span>
            <span className="block font-serif text-2xl text-cream/85">Next</span>
            <span className="mt-1 block text-sm text-cream/65">
              {offer
                ? `${offer.title}${offer.unlockCost > 0 ? ` · ${offer.unlockCost} Giacominos` : ""}`
                : upcoming
                  ? `${lockReason(upcoming, CURRICULUM_NODES, passed)}${upcoming.unlockCost > 0 ? ` Then ${upcoming.unlockCost} Giacominos.` : ""}`
                  : ""}
            </span>
          </span>
        </Link>
      ) : null}

      <p className="text-sm">
        <Link href="/practice" className="text-cream/70 underline-offset-4 hover:text-cream hover:underline">
          Open practice
        </Link>
      </p>
    </div>
  );
}

function MatchRow({ battle, label }: { battle: BattleCard; label: string }) {
  const name = battle.displayName || battle.username;
  return (
    <Link
      href={`/battles/${battle.id}`}
      className="flex items-center justify-between gap-3 rounded-2xl bg-plum/70 px-4 py-3 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cream"
    >
      <span>
        <span className="block text-xs font-semibold tracking-[0.16em] text-gold uppercase">{label}</span>
        <span className="mt-1 block font-semibold text-cream">{name}</span>
      </span>
      <span className="text-sm text-cream/60">{stakeLabel(battle.stake)}</span>
    </Link>
  );
}

function ratingText(you: { rating: number | null; answers: number; reason: string | null } | null): string {
  if (!you) return "—";
  if (you.rating != null) return String(you.rating);
  if (you.reason === "short") return `${you.answers}/10`;
  return "—";
}

function pathProgress(nodes: ProgressNode[], current: ProgressNode) {
  const lessons = nodes.filter((node) => node.path === current.path).sort((left, right) => left.sortOrder - right.sortOrder);
  const index = Math.max(0, lessons.findIndex((lesson) => lesson.slug === current.slug));
  const title = PATHS.find((path) => path.id === current.path)?.title ?? "Path";
  return { title, index, total: lessons.length };
}

function LockMark() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="mt-1 size-5 shrink-0 text-cream/50" fill="none" stroke="currentColor" strokeWidth="1.7">
      <rect x="5" y="11" width="14" height="9" rx="2" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" />
    </svg>
  );
}
