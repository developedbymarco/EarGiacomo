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
}: {
  username: string;
  relation: FriendRelation;
  friendshipId: string | null;
  returnTo: string;
}) {
  if (relation === "self") return <p className="text-parchment">This is you.</p>;
  if (relation === "friends" && friendshipId) {
    return (
      <div className="flex flex-wrap gap-3">
        <form action={removeFriendAction}>
          <input type="hidden" name="id" value={friendshipId} />
          <input type="hidden" name="returnTo" value={returnTo} />
          <Button type="submit" variant="ghost">
            Remove friend
          </Button>
        </form>
        <BlockForm username={username} />
      </div>
    );
  }
  if (relation === "pending_out") {
    return (
      <div className="flex flex-wrap items-center gap-3">
        <p className="text-parchment">Request sent.</p>
        <BlockForm username={username} />
      </div>
    );
  }
  if (relation === "pending_in" && friendshipId) {
    return (
      <div className="flex flex-wrap gap-3">
        <form action={respondFriendRequestAction}>
          <input type="hidden" name="id" value={friendshipId} />
          <input type="hidden" name="accept" value="yes" />
          <input type="hidden" name="returnTo" value={returnTo} />
          <Button type="submit">Accept</Button>
        </form>
        <form action={respondFriendRequestAction}>
          <input type="hidden" name="id" value={friendshipId} />
          <input type="hidden" name="accept" value="no" />
          <input type="hidden" name="returnTo" value={returnTo} />
          <Button type="submit" variant="ghost">
            Decline
          </Button>
        </form>
        <BlockForm username={username} />
      </div>
    );
  }
  if (relation === "blocked" && friendshipId) {
    return (
      <form action={unblockPlayerAction}>
        <input type="hidden" name="id" value={friendshipId} />
        <Button type="submit" variant="ghost">
          Unblock
        </Button>
      </form>
    );
  }
  return (
    <div className="flex flex-wrap gap-3">
      <form action={sendFriendRequestAction}>
        <input type="hidden" name="username" value={username} />
        <input type="hidden" name="returnTo" value={returnTo} />
        <Button type="submit">Add friend</Button>
      </form>
      <BlockForm username={username} />
    </div>
  );
}

function BlockForm({ username }: { username: string }) {
  return (
    <form action={blockPlayerAction}>
      <input type="hidden" name="username" value={username} />
      <Button type="submit" variant="ghost">
        Block
      </Button>
    </form>
  );
}
