import Link from "next/link";
import { redirect } from "next/navigation";
import { FriendControls } from "@/components/friends/FriendControls";
import { fieldClass } from "@/components/auth/AuthCard";
import { Button } from "@/components/ui/button";
import { getAccountContext } from "@/lib/account/session";
import { loadFriendLists, searchPlayers, type FriendCard } from "@/lib/friends/load";

const notices: Record<string, string> = {
  sent: "Friend request sent.",
  accepted: "Friend request accepted.",
  declined: "Friend request declined.",
  removed: "Friend removed.",
  blocked: "Player blocked.",
  unblocked: "Player unblocked.",
};

const errors: Record<string, string> = {
  hidden: "That player cannot be added.",
  self: "That username is yours.",
  already: "That request is already sent.",
  incoming: "They already sent you a request.",
  slow: "You have 15 requests waiting. Wait for a reply before sending more.",
  invalid: "Use a username of letters, numbers, or underscores.",
  missing: "That request is no longer waiting.",
  unavailable: "Run the friends migration in Supabase, then try again.",
};

export default async function FriendsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; notice?: string; error?: string }>;
}) {
  const account = await getAccountContext();
  if (!account.configured) redirect("/");
  if (!account.user) redirect("/login");

  const params = await searchParams;
  const query = (params.q ?? "").trim().toLowerCase();
  const lists = await loadFriendLists();
  const found = query.length >= 2 && lists.ready ? await searchPlayers(query) : null;
  const notice = params.notice ? notices[params.notice] : null;
  const error = params.error ? errors[params.error] ?? "That action could not be finished." : null;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-serif text-5xl text-cream">Friends</h1>
        <p className="mt-3 text-lg text-parchment">Search by username, then send a request.</p>
      </div>
      {notice ? <p className="text-cream">{notice}</p> : null}
      {error ? <p className="text-rose">{error}</p> : null}
      {!lists.ready ? (
        <p className="text-lg text-parchment">
          Friend requests are not in this Supabase project yet. Run <code>supabase/migrations/20260927230000_friends.sql</code> in the
          SQL editor, then reload.
        </p>
      ) : (
        <>
          <form action="/friends" className="flex flex-wrap items-end gap-3">
            <label className="block min-w-64 flex-1 text-parchment" htmlFor="q">
              Username
              <input id="q" name="q" defaultValue={query} autoComplete="off" className={fieldClass} />
            </label>
            <Button type="submit">Search</Button>
          </form>
          {query.length === 1 ? <p className="text-parchment">Use at least 2 characters.</p> : null}
          {found && !found.ready ? (
            <p className="text-parchment">Run the friends migration, then search again.</p>
          ) : null}
          {found && found.ready && "error" in found ? <p className="text-rose">{found.error}</p> : null}
          {found && found.ready && "data" in found ? (
            <section className="space-y-3">
              <h2 className="font-serif text-3xl text-cream">Results</h2>
              {found.data.length === 0 ? <p className="text-parchment">No player matches that username.</p> : null}
              <ul className="space-y-3">
                {found.data.map((hit) => (
                  <li key={hit.username} className="rounded-3xl border border-gold/30 bg-plum/40 p-5">
                    <PlayerLine username={hit.username} displayName={hit.displayName} level={hit.level} />
                    <div className="mt-4">
                      <FriendControls
                        username={hit.username}
                        relation={hit.relation}
                        friendshipId={hit.friendshipId}
                        returnTo={query ? `/friends?q=${encodeURIComponent(query)}` : "/friends"}
                      />
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
          {"error" in lists ? <p className="text-rose">{lists.error}</p> : null}
          {"data" in lists ? (
            <div className="grid gap-8 lg:grid-cols-2">
              <Roster title="Requests" empty="No requests waiting." people={lists.data.incoming} incoming />
              <Roster title="Sent" empty="No requests sent." people={lists.data.outgoing} />
              <Roster title="Friends" empty="No friends yet." people={lists.data.friends} />
              <Roster title="Blocked" empty="No blocked players." people={lists.data.blocked} blocked />
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}

function PlayerLine({ username, displayName, level }: { username: string; displayName: string | null; level: number | null }) {
  return (
    <div>
      <Link href={`/friends/${username}`} className="font-serif text-3xl text-cream hover:text-gold">
        {displayName || username}
      </Link>
      <p className="text-parchment">
        @{username}
        {level != null ? ` · Level ${level}` : ""}
      </p>
    </div>
  );
}

function Roster({
  title,
  empty,
  people,
  incoming = false,
  blocked = false,
}: {
  title: string;
  empty: string;
  people: FriendCard[];
  incoming?: boolean;
  blocked?: boolean;
}) {
  return (
    <section className="space-y-3">
      <h2 className="font-serif text-3xl text-cream">{title}</h2>
      {people.length === 0 ? <p className="text-parchment">{empty}</p> : null}
      <ul className="space-y-3">
        {people.map((person) => (
          <li key={person.id} className="rounded-3xl border border-gold/30 bg-plum/40 p-5">
            <PlayerLine username={person.username} displayName={person.displayName} level={person.level} />
            <div className="mt-4">
              <FriendControls
                username={person.username}
                relation={blocked ? "blocked" : incoming ? "pending_in" : person.level != null ? "friends" : "pending_out"}
                friendshipId={person.id}
                returnTo="/friends"
              />
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
