import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { cancelBattleAction, ensureBattleQuestions, respondBattleAction } from "@/app/battles/actions";
import { BattleRoom } from "@/components/battles/BattleRoom";
import { Button } from "@/components/ui/button";
import { getAccountContext } from "@/lib/account/session";
import { loadBattle } from "@/lib/battles/load";
import { describeBattleResult, presetLabel, stakeLabel } from "@/lib/battles/rules";

const errors: Record<string, string> = {
  missing: "That battle is no longer waiting.",
  broke: "One of you does not have enough Giacominos for this stake. Choose a free match, or earn more first.",
  unavailable: "Run the battles migration in Supabase, then try again.",
};

export default async function BattlePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const account = await getAccountContext();
  if (!account.configured) redirect("/");
  if (!account.user) redirect("/login");
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  await ensureBattleQuestions(id);
  const battle = await loadBattle(id);
  if (!battle.ready) {
    return (
      <section className="space-y-4">
        <h1 className="font-serif text-5xl text-cream">Battle</h1>
        <p className="text-lg text-parchment">
          Run <code>supabase/migrations/20260927240000_battles.sql</code> in the Supabase SQL editor, then reload.
        </p>
      </section>
    );
  }
  if ("missing" in battle) notFound();
  if ("error" in battle) return <p className="text-lg text-parchment">{battle.error}</p>;

  const view = battle.data;
  const query = await searchParams;
  const error = query.error ? errors[query.error] ?? "That action could not be finished." : null;
  const them = view.them.displayName || view.them.username;

  return (
    <div className="space-y-6">
      <p>
        <Link href="/battles" className="text-gold underline-offset-4 hover:underline">
          All battles
        </Link>
      </p>
      {error ? <p className="text-rose">{error}</p> : null}
      {view.status === "pending" ? (
        <section className="space-y-4">
          <h1 className="font-serif text-5xl text-cream">{view.youAre === "challenger" ? `Waiting for ${them}` : `${them} challenged you`}</h1>
          <p className="text-lg text-parchment">
            {presetLabel(view.preset)} · {view.questionCount} questions · {stakeLabel(view.stake)}
          </p>
          {view.stake === 0 ? (
            <p className="text-parchment">This match is free. Giacominos stay where they are.</p>
          ) : (
            <p className="text-parchment">
              Accepting takes {view.stake} Giacominos from each of you. The winner receives {view.stake * 2}. A draw returns both fees.
            </p>
          )}
          {view.youAre === "opponent" ? (
            <div className="flex flex-wrap gap-3">
              <form action={respondBattleAction}>
                <input type="hidden" name="id" value={view.id} />
                <input type="hidden" name="accept" value="yes" />
                <Button type="submit">{view.stake === 0 ? "Accept free match" : `Accept for ${view.stake} Giacominos`}</Button>
              </form>
              <form action={respondBattleAction}>
                <input type="hidden" name="id" value={view.id} />
                <input type="hidden" name="accept" value="no" />
                <Button type="submit" variant="ghost">
                  Decline
                </Button>
              </form>
            </div>
          ) : (
            <form action={cancelBattleAction}>
              <input type="hidden" name="id" value={view.id} />
              <Button type="submit" variant="ghost">
                Cancel challenge
              </Button>
            </form>
          )}
        </section>
      ) : null}
      {view.status === "active" ? (
        <>
          <h1 className="font-serif text-5xl text-cream">Match with {them}</h1>
          <BattleRoom battle={view} />
        </>
      ) : null}
      {view.status === "complete" || view.status === "forfeited" ? (
        <section className="space-y-4">
          <h1 className="font-serif text-5xl text-cream">{view.winner === "you" ? "You won" : view.winner === "them" ? "You lost" : "Draw"}</h1>
          <p className="text-lg text-cream">{describeBattleResult(view)}</p>
          <p className="font-serif text-4xl text-gold">
            {view.you.score} <span className="text-parchment">to</span> {view.them.score}
          </p>
          <p className="text-parchment">
            {view.you.correct} of {view.questionCount} correct
            {view.yourXp > 0 ? ` · +${view.yourXp} XP` : ""}
          </p>
          <p className="text-parchment">
            {presetLabel(view.preset)} against {them}
          </p>
        </section>
      ) : null}
      {view.status === "declined" || view.status === "cancelled" ? (
        <section className="space-y-3">
          <h1 className="font-serif text-5xl text-cream">{view.status === "declined" ? "Challenge declined" : "Challenge cancelled"}</h1>
          <p className="text-parchment">No Giacominos moved.</p>
        </section>
      ) : null}
    </div>
  );
}
