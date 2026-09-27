import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const sql = readFileSync(path.join(process.cwd(), "supabase/migrations/20260927230000_friends.sql"), "utf8");

describe("friends migration", () => {
  it("stores one row per pair and the four relationship states", () => {
    expect(sql).toContain("friendships_pair_idx");
    expect(sql).toContain("least(requester_id, addressee_id)");
    expect(sql).toContain("'pending', 'accepted', 'declined', 'blocked'");
    expect(sql).toContain("profile_visibility in ('public', 'friends', 'private')");
  });

  it("keeps requests, blocks, and profile reads behind definer functions", () => {
    for (const name of [
      "search_players",
      "list_friendships",
      "player_profile",
      "send_friend_request",
      "respond_friend_request",
      "remove_friend",
      "block_player",
      "unblock_player",
    ]) {
      expect(sql).toContain(`function public.${name}`);
      expect(sql).toContain(`grant execute on function public.${name}`);
    }
  });
});
