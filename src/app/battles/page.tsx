import Link from "next/link";
import { redirect } from "next/navigation";
import { presetLabel, stakeLabel } from "@/lib/battles/rules";
import { loadBattleLists } from "@/lib/battles/load";
import type { BattleCard } from "@/lib/battles/types";
import { getAccountContext } from "@/lib/account/session";

const errors: Record<string, string> = {
  missing: "That battle is no longer open.",
  unavailable: "Run the battles migration in Supabase, then try again.",
};

export default async function BattlesPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const account = await getAccountContext();
  if (!account.configured) redirect("/");
  if (!account.user) redirect("/login");
  const params = await searchParams;
  const lists = await loadBattleLists();
  const error = params.error ? errors[params.error] ?? "That action could not be finished." : null;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-serif text-5xl text-cream">Battles</h1>
        <p className="mt-3 text-lg text-parchment">Challenge a friend to the same questions. The server keeps the score.</p>
      </div>
      {error ? <p className="text-rose">{error}</p> : null}
      {!lists.ready ? (
        <p className="text-lg text-parchment">
          Battles are not in this Supabase project yet. Run <code>supabase/migrations/20260927240000_battles.sql</code> in the SQL editor, then reload.
        </p>
      ) : "error" in lists ? (
        <p className="text-rose">{lists.error}</p>
      ) : "data" in lists ? (
        <div className="grid gap-8 lg:grid-cols-2">
          <Roster title="Challenges" empty="No challenges waiting." people={lists.data.incoming} />
          <Roster title="Sent" empty="No challenges sent." people={lists.data.outgoing} />
          <Roster title="In progress" empty="No match in progress." people={lists.data.active} />
          <Roster title="Recent" empty="No finished matches yet." people={lists.data.recent} />
        </div>
      ) : null}
    </div>
  );
}

function Roster({ title, empty, people }: { title: string; empty: string; people: BattleCard[] }) {
  return (
    <section className="space-y-3">
      <h2 className="font-serif text-3xl text-cream">{title}</h2>
      {people.length === 0 ? <p className="text-parchment">{empty}</p> : null}
      <ul className="space-y-3">
        {people.map((battle) => (
          <li key={battle.id}>
            <Link href={`/battles/${battle.id}`} className="block rounded-3xl border border-gold/30 bg-plum/40 p-5 hover:border-gold">
              <p className="font-serif text-3xl text-cream">{battle.displayName || battle.username}</p>
              <p className="text-parchment">
                @{battle.username} · {presetLabel(battle.preset)} · {stakeLabel(battle.stake)}
                {battle.status === "complete" || battle.status === "forfeited"
                  ? ` · ${battle.yourScore}–${battle.theirScore}${battle.winner === "you" ? " · Won" : battle.winner === "them" ? " · Lost" : battle.winner === "draw" ? " · Draw" : ""}`
                  : ""}
              </p>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
