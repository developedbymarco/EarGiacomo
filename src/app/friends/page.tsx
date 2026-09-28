import type { ReactNode } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { FriendControls } from "@/components/friends/FriendControls";
import { PlayerAvatar } from "@/components/friends/PlayerAvatar";
import { getAccountContext } from "@/lib/account/session";
import { loadFriendLists, searchPlayers, type FriendCard, type FriendRelation } from "@/lib/friends/load";

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
  const returnTo = query ? `/friends?q=${encodeURIComponent(query)}` : "/friends";

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <h1 className="font-serif text-4xl text-cream">Friends</h1>
      {notice ? <p className="rounded-2xl bg-plum/60 px-4 py-3 text-sm text-cream">{notice}</p> : null}
      {error ? <p className="rounded-2xl bg-plum/60 px-4 py-3 text-sm text-rose">{error}</p> : null}
      {!lists.ready ? (
        <p className="text-cream/75">
          Friend requests are not in this Supabase project yet. Run supabase/migrations/20260927230000_friends.sql in the SQL editor, then reload.
        </p>
      ) : (
        <>
          <form action="/friends" className="relative">
            <label className="sr-only" htmlFor="q">
              Search username
            </label>
            <SearchMark />
            <input
              id="q"
              name="q"
              defaultValue={query}
              autoComplete="off"
              placeholder="Search"
              className="w-full rounded-full bg-cream/10 py-3 pr-4 pl-11 text-cream placeholder:text-cream/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cream"
            />
            <button type="submit" className="sr-only">
              Search
            </button>
          </form>
          {query.length === 1 ? <p className="text-sm text-cream/60">Use at least 2 characters.</p> : null}
          {found && !found.ready ? <p className="text-sm text-cream/60">Run the friends migration, then search again.</p> : null}
          {found && found.ready && "error" in found ? <p className="text-sm text-rose">{found.error}</p> : null}
          {found && found.ready && "data" in found ? (
            <Section title="Results">
              {found.data.length === 0 ? (
                <p className="px-1 text-sm text-cream/60">No player matches that username.</p>
              ) : (
                <ul className="overflow-hidden rounded-2xl bg-plum/50">
                  {found.data.map((hit) => (
                    <PersonRow
                      key={hit.username}
                      username={hit.username}
                      displayName={hit.displayName}
                      level={hit.level}
                      relation={hit.relation}
                      friendshipId={hit.friendshipId}
                      returnTo={returnTo}
                    />
                  ))}
                </ul>
              )}
            </Section>
          ) : null}
          {"error" in lists ? <p className="text-sm text-rose">{lists.error}</p> : null}
          {"data" in lists ? (
            <>
              <Roster title="Requests" empty="No requests waiting." people={lists.data.incoming} relation="pending_in" />
              {lists.data.outgoing.length > 0 ? <Roster title="Sent" empty="" people={lists.data.outgoing} relation="pending_out" /> : null}
              <Roster title="Friends" empty="No friends yet. Search for a username." people={lists.data.friends} relation="friends" />
              {lists.data.blocked.length > 0 ? <Roster title="Blocked" empty="" people={lists.data.blocked} relation="blocked" /> : null}
            </>
          ) : null}
        </>
      )}
    </div>
  );
}

function PersonRow({
  username,
  displayName,
  level,
  relation,
  friendshipId,
  returnTo,
}: {
  username: string;
  displayName: string | null;
  level: number | null;
  relation: FriendRelation;
  friendshipId: string | null;
  returnTo: string;
}) {
  const name = displayName || username;
  return (
    <li className="flex items-center gap-3 border-b border-cream/10 px-3 py-2.5 last:border-b-0">
      <Link
        href={`/friends/${username}`}
        className="flex min-w-0 flex-1 items-center gap-3 rounded-xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cream"
      >
        <PlayerAvatar name={name} />
        <span className="min-w-0">
          <span className="block truncate font-semibold text-cream">{name}</span>
          <span className="block truncate text-sm text-cream/60">
            @{username}
            {level != null ? ` · Lv ${level}` : ""}
          </span>
        </span>
      </Link>
      <FriendControls layout="row" username={username} relation={relation} friendshipId={friendshipId} returnTo={returnTo} />
    </li>
  );
}

function Roster({
  title,
  empty,
  people,
  relation,
}: {
  title: string;
  empty: string;
  people: FriendCard[];
  relation: FriendRelation;
}) {
  return (
    <Section title={title}>
      {people.length === 0 ? <p className="px-1 text-sm text-cream/60">{empty}</p> : null}
      {people.length > 0 ? (
        <ul className="overflow-hidden rounded-2xl bg-plum/50">
          {people.map((person) => (
            <PersonRow
              key={person.id}
              username={person.username}
              displayName={person.displayName}
              level={person.level}
              relation={relation}
              friendshipId={person.id}
              returnTo="/friends"
            />
          ))}
        </ul>
      ) : null}
    </Section>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-2">
      <h2 className="px-1 text-sm font-semibold text-cream/70">{title}</h2>
      {children}
    </section>
  );
}

function SearchMark() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-cream/50" fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="11" cy="11" r="6" />
      <path d="M16 16.5 20 20.5" strokeLinecap="round" />
    </svg>
  );
}
