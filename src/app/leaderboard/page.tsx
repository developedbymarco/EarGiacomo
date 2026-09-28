import Link from "next/link";
import { getAccountContext } from "@/lib/account/session";
import { loadLeaderboard, type YourRating } from "@/lib/leaderboard/load";

export default async function LeaderboardPage() {
  const account = await getAccountContext();
  if (!account.configured) {
    return (
      <section className="space-y-4">
        <h1 className="font-serif text-5xl text-cream">Ear Rating</h1>
        <p className="text-lg text-parchment">Accounts are not connected yet.</p>
      </section>
    );
  }

  const board = await loadLeaderboard();
  const youName = account.profile?.username ?? null;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-serif text-5xl text-cream">Ear Rating</h1>
        <p className="mt-3 max-w-2xl text-lg text-parchment">
          The last 100 answers. A correct answer on a harder concept counts more. Ten answers are enough to appear. Giacominos do not change this list.
        </p>
      </div>
      {!board.ready ? (
        <p className="text-lg text-parchment">
          The board is not in this Supabase project yet. Run <code>supabase/migrations/20260928020000_leaderboard.sql</code> in the SQL editor, then reload.
        </p>
      ) : "error" in board ? (
        <p className="text-rose">{board.error}</p>
      ) : (
        <>
          {board.you ? <YourStanding you={board.you} /> : null}
          {board.rows.length === 0 ? (
            <p className="text-lg text-parchment">No public ratings yet. Finish ten questions with a public profile.</p>
          ) : (
            <ol className="space-y-3">
              {board.rows.map((row) => {
                const yours = row.username === youName;
                const name = row.displayName || row.username;
                return (
                  <li
                    key={row.username}
                    className={`flex items-center gap-4 rounded-3xl border bg-plum/40 p-4 sm:p-5 ${yours ? "border-2 border-gold" : "border-gold/30"}`}
                  >
                    <span className="w-12 shrink-0 font-serif text-3xl text-gold">{row.place}</span>
                    <div className="min-w-0 flex-1">
                      {account.user ? (
                        <Link href={`/friends/${row.username}`} className="text-lg text-cream underline-offset-4 hover:underline">
                          {name}
                        </Link>
                      ) : (
                        <p className="text-lg text-cream">{name}</p>
                      )}
                      <p className="truncate text-sm text-parchment">@{row.username}</p>
                    </div>
                    <p className="shrink-0 font-serif text-3xl text-cream">{row.rating}</p>
                  </li>
                );
              })}
            </ol>
          )}
        </>
      )}
    </div>
  );
}

function YourStanding({ you }: { you: YourRating }) {
  if (you.reason === "short") {
    const left = Math.max(0, 10 - you.answers);
    return <p className="text-lg text-parchment">Finish {left} more {left === 1 ? "answer" : "answers"} to earn an Ear Rating.</p>;
  }
  return (
    <section className="rounded-3xl border border-gold/30 bg-plum/40 p-5">
      <p className="font-serif text-4xl text-gold">{you.rating}</p>
      <p className="mt-1 text-parchment">{you.place != null ? `You are ${placeLabel(you.place)}.` : "Your rating is ready."}</p>
      {you.reason === "hidden" ? <p className="mt-2 text-parchment">Your row is hidden. Account privacy can show it again.</p> : null}
      {you.reason === "private" ? <p className="mt-2 text-parchment">The board lists public profiles. Yours is set to friends or private.</p> : null}
      {you.reason === "accuracy" ? <p className="mt-2 text-parchment">Accuracy is hidden, so this row stays off the board.</p> : null}
    </section>
  );
}

function placeLabel(place: number): string {
  const mod = place % 100;
  const suffix = mod >= 11 && mod <= 13 ? "th" : place % 10 === 1 ? "st" : place % 10 === 2 ? "nd" : place % 10 === 3 ? "rd" : "th";
  return `${place}${suffix}`;
}
