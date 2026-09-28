import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { FriendControls } from "@/components/friends/FriendControls";
import { PlayerAvatar } from "@/components/friends/PlayerAvatar";
import { getAccountContext } from "@/lib/account/session";
import { loadBattleRecord } from "@/lib/battles/load";
import { loadPlayer } from "@/lib/friends/load";

const notices: Record<string, string> = {
  sent: "Friend request sent.",
  accepted: "You are now friends.",
  declined: "Friend request declined.",
};

const errors: Record<string, string> = {
  hidden: "That player cannot be added.",
  already: "That request is already sent.",
  incoming: "Accept the request they already sent.",
  slow: "You have 15 requests waiting. Wait for a reply before sending more.",
  unavailable: "Run the friends migration in Supabase, then try again.",
};

export default async function FriendProfilePage({
  params,
  searchParams,
}: {
  params: Promise<{ username: string }>;
  searchParams: Promise<{ notice?: string; error?: string }>;
}) {
  const account = await getAccountContext();
  if (!account.configured) redirect("/");
  if (!account.user) redirect("/login");

  const { username } = await params;
  const query = await searchParams;
  if (!/^[a-z0-9_]{3,20}$/.test(username)) notFound();

  const player = await loadPlayer(username);
  if (!player.ready) {
    return (
      <section className="space-y-4">
        <h1 className="font-serif text-5xl text-cream">Friends</h1>
        <p className="text-lg text-parchment">
          Run <code>supabase/migrations/20260927230000_friends.sql</code> in the Supabase SQL editor, then reload.
        </p>
      </section>
    );
  }
  if ("missing" in player || "hidden" in player) notFound();
  if ("error" in player) {
    return <p className="text-lg text-parchment">{player.error}</p>;
  }

  const profile = player.data;
  const record = profile.relation === "friends" ? await loadBattleRecord(profile.username) : null;
  const notice = query.notice ? notices[query.notice] : null;
  const error = query.error ? errors[query.error] ?? "That action could not be finished." : null;
  const returnTo = `/friends/${profile.username}`;

  const name = profile.displayName || profile.username;
  const hidden = profile.relation !== "self" && profile.level == null && profile.relation !== "blocked";

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <Link href="/friends" className="text-sm text-cream/70 hover:text-cream">
        Friends
      </Link>
      <div className="flex items-center gap-4">
        <PlayerAvatar name={name} className="size-20 text-3xl" />
        <div className="min-w-0">
          <h1 className="truncate font-serif text-4xl text-cream">{name}</h1>
          <p className="truncate text-cream/60">@{profile.username}</p>
        </div>
      </div>
      {hidden ? <p className="text-sm text-cream/60">Level and accuracy stay hidden until you are friends.</p> : null}
      <dl className="grid grid-cols-3 text-center">
        <Stat label="Level" value={profile.level != null ? String(profile.level) : "—"} />
        <Stat label="Accuracy" value={profile.accuracy != null ? `${profile.accuracy}%` : "—"} />
        <Stat label="Battles" value={record?.visible ? String(record.played) : "—"} />
      </dl>
      {record?.visible ? (
        <p className="text-center text-sm text-cream/60">
          {record.wins} {record.wins === 1 ? "win" : "wins"} · {record.losses} {record.losses === 1 ? "loss" : "losses"} · {record.draws}{" "}
          {record.draws === 1 ? "draw" : "draws"}
        </p>
      ) : null}
      {notice ? <p className="rounded-2xl bg-plum/60 px-4 py-3 text-sm text-cream">{notice}</p> : null}
      {error ? <p className="rounded-2xl bg-plum/60 px-4 py-3 text-sm text-rose">{error}</p> : null}
      <FriendControls username={profile.username} relation={profile.relation} friendshipId={profile.friendshipId} returnTo={returnTo} />
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col">
      <dt className="order-2 text-xs text-cream/55">{label}</dt>
      <dd className="order-1 text-lg font-semibold text-cream">{value}</dd>
    </div>
  );
}
