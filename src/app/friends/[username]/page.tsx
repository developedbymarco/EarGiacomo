import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { FriendControls } from "@/components/friends/FriendControls";
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

  return (
    <div className="space-y-6">
      <p>
        <Link href="/friends" className="text-gold underline-offset-4 hover:underline">
          All friends
        </Link>
      </p>
      <h1 className="font-serif text-5xl text-cream">{profile.displayName || profile.username}</h1>
      <p className="text-lg text-parchment">
        @{profile.username}
        {profile.level != null ? ` · Level ${profile.level}` : ""}
      </p>
      {profile.relation !== "self" && profile.level == null && profile.relation !== "blocked" ? (
        <p className="text-parchment">Their level and accuracy stay hidden until you are friends.</p>
      ) : null}
      {profile.accuracy != null ? <p className="text-parchment">Accuracy {profile.accuracy}% across practiced questions.</p> : null}
      {record?.visible ? (
        <p className="text-parchment">
          Battles together: {record.played}. You have {record.wins} {record.wins === 1 ? "win" : "wins"}, {record.losses}{" "}
          {record.losses === 1 ? "loss" : "losses"}, and {record.draws} {record.draws === 1 ? "draw" : "draws"}.
        </p>
      ) : null}
      {notice ? <p className="text-cream">{notice}</p> : null}
      {error ? <p className="text-rose">{error}</p> : null}
      <FriendControls username={profile.username} relation={profile.relation} friendshipId={profile.friendshipId} returnTo={returnTo} />
    </div>
  );
}
