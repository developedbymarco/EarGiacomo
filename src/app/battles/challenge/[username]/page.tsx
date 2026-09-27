import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createBattleAction } from "@/app/battles/actions";
import { Button } from "@/components/ui/button";
import { getAccountContext } from "@/lib/account/session";
import { BATTLE_PRESETS, BATTLE_STAKES } from "@/lib/battles/rules";
import { loadPlayer } from "@/lib/friends/load";

const errors: Record<string, string> = {
  hidden: "You can challenge a friend.",
  closed: "That player is not accepting challenges.",
  already: "You already have an open match with that player.",
  slow: "You have 8 challenges waiting. Cancel one before sending more.",
  broke: "One of you does not have enough Giacominos for that stake.",
  invalid: "Choose a preset, a length, and a stake.",
  unavailable: "Run the battles migration in Supabase, then try again.",
};

export default async function ChallengePage({
  params,
  searchParams,
}: {
  params: Promise<{ username: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const account = await getAccountContext();
  if (!account.configured) redirect("/");
  if (!account.user) redirect("/login");
  const { username } = await params;
  if (!/^[a-z0-9_]{3,20}$/.test(username)) notFound();
  const player = await loadPlayer(username);
  if (!player.ready || "missing" in player || "hidden" in player || "error" in player) notFound();
  if (player.data.relation !== "friends") {
    return (
      <section className="space-y-4">
        <h1 className="font-serif text-5xl text-cream">Challenge</h1>
        <p className="text-lg text-parchment">Become friends before you send a challenge.</p>
        <Link href={`/friends/${username}`} className="text-gold underline-offset-4 hover:underline">
          Back to @{username}
        </Link>
      </section>
    );
  }

  const query = await searchParams;
  const error = query.error ? errors[query.error] ?? "That challenge could not be sent." : null;
  const name = player.data.displayName || player.data.username;

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <p>
        <Link href={`/friends/${player.data.username}`} className="text-gold underline-offset-4 hover:underline">
          @{player.data.username}
        </Link>
      </p>
      <h1 className="font-serif text-5xl text-cream">Challenge {name}</h1>
      <p className="text-lg text-parchment">You both hear the same questions. A paid stake is taken from both players when they accept. The winner receives both fees. A draw returns them.</p>
      {error ? <p className="text-rose">{error}</p> : null}
      <form action={createBattleAction} className="space-y-6">
        <input type="hidden" name="username" value={player.data.username} />
        <fieldset className="space-y-3">
          <legend className="font-serif text-3xl text-cream">What you will hear</legend>
          {BATTLE_PRESETS.map((preset) => (
            <label key={preset.id} className="flex items-start gap-3 rounded-2xl border border-gold/30 bg-plum/40 px-4 py-3 text-parchment">
              <input type="radio" name="preset" value={preset.id} defaultChecked={preset.id === "intervals"} className="mt-1 accent-gold" required />
              <span>
                <span className="text-cream">{preset.label}</span>
                <span className="block text-sm">{preset.detail}</span>
              </span>
            </label>
          ))}
        </fieldset>
        <fieldset className="space-y-3">
          <legend className="font-serif text-3xl text-cream">Length</legend>
          {[10, 20].map((count) => (
            <label key={count} className="flex items-center gap-3 rounded-2xl border border-gold/30 bg-plum/40 px-4 py-3 text-cream">
              <input type="radio" name="count" value={count} defaultChecked={count === 10} className="accent-gold" required />
              {count} questions
            </label>
          ))}
        </fieldset>
        <fieldset className="space-y-3">
          <legend className="font-serif text-3xl text-cream">Stake</legend>
          {BATTLE_STAKES.map((stake) => (
            <label key={stake.amount} className="flex items-start gap-3 rounded-2xl border border-gold/30 bg-plum/40 px-4 py-3 text-parchment">
              <input type="radio" name="stake" value={stake.amount} defaultChecked={stake.amount === 0} className="mt-1 accent-gold" required />
              <span>
                <span className="text-cream">{stake.label}</span>
                <span className="block text-sm">{stake.detail}</span>
              </span>
            </label>
          ))}
        </fieldset>
        <Button type="submit">Send challenge</Button>
      </form>
    </div>
  );
}
