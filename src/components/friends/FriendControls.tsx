import Link from "next/link";
import {
  blockPlayerAction,
  removeFriendAction,
  respondFriendRequestAction,
  sendFriendRequestAction,
  unblockPlayerAction,
} from "@/app/friends/actions";
import { Button } from "@/components/ui/button";
import type { FriendRelation } from "@/lib/friends/load";

export function FriendControls({
  username,
  relation,
  friendshipId,
  returnTo,
  layout = "profile",
}: {
  username: string;
  relation: FriendRelation;
  friendshipId: string | null;
  returnTo: string;
  layout?: "profile" | "row";
}) {
  const row = layout === "row";
  const size = row ? "sm" : "md";
  if (relation === "self") return <p className="text-sm text-cream/60">This is you.</p>;
  if (relation === "friends" && friendshipId) {
    return (
      <div className={row ? "shrink-0" : "space-y-3"}>
        <Link href={`/battles/challenge/${username}`} className={row ? pillGold : pillGoldWide}>
          Challenge
        </Link>
        {row ? null : (
          <div className="flex flex-wrap gap-2">
            <form action={removeFriendAction}>
              <input type="hidden" name="id" value={friendshipId} />
              <input type="hidden" name="returnTo" value={returnTo} />
              <Button type="submit" variant="ghost" size="sm">
                Remove
              </Button>
            </form>
            <BlockForm username={username} />
          </div>
        )}
      </div>
    );
  }
  if (relation === "pending_out") {
    return row ? <p className="shrink-0 text-sm text-cream/50">Requested</p> : (
      <div className="flex flex-wrap items-center gap-3">
        <p className="text-cream/70">Request sent.</p>
        <BlockForm username={username} />
      </div>
    );
  }
  if (relation === "pending_in" && friendshipId) {
    return (
      <div className={row ? "flex shrink-0 gap-2" : "flex flex-wrap gap-2"}>
        <form action={respondFriendRequestAction}>
          <input type="hidden" name="id" value={friendshipId} />
          <input type="hidden" name="accept" value="yes" />
          <input type="hidden" name="returnTo" value={returnTo} />
          <Button type="submit" size={size}>
            Accept
          </Button>
        </form>
        <form action={respondFriendRequestAction}>
          <input type="hidden" name="id" value={friendshipId} />
          <input type="hidden" name="accept" value="no" />
          <input type="hidden" name="returnTo" value={returnTo} />
          <Button type="submit" variant="ghost" size={size}>
            Decline
          </Button>
        </form>
        {row ? null : <BlockForm username={username} />}
      </div>
    );
  }
  if (relation === "blocked" && friendshipId) {
    return (
      <form action={unblockPlayerAction}>
        <input type="hidden" name="id" value={friendshipId} />
        <Button type="submit" variant="ghost" size={size}>
          Unblock
        </Button>
      </form>
    );
  }
  return (
    <div className={row ? "shrink-0" : "flex flex-wrap gap-2"}>
      <form action={sendFriendRequestAction}>
        <input type="hidden" name="username" value={username} />
        <input type="hidden" name="returnTo" value={returnTo} />
        <Button type="submit" size={size}>
          Add
        </Button>
      </form>
      {row ? null : <BlockForm username={username} />}
    </div>
  );
}

const pillGold =
  "inline-flex items-center justify-center rounded-full bg-gold px-3 py-1.5 text-sm font-semibold text-espresso hover:brightness-105 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cream";
const pillGoldWide =
  "inline-flex w-full items-center justify-center rounded-full bg-gold px-5 py-3 text-base font-semibold text-espresso hover:brightness-105 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cream";

function BlockForm({ username }: { username: string }) {
  return (
    <form action={blockPlayerAction}>
      <input type="hidden" name="username" value={username} />
      <Button type="submit" variant="ghost" size="sm">
        Block
      </Button>
    </form>
  );
}
