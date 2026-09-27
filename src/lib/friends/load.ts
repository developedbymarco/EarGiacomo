import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

export type FriendRelation = "none" | "self" | "friends" | "pending_out" | "pending_in" | "blocked";

export interface FriendCard {
  id: string;
  username: string;
  displayName: string | null;
  level: number | null;
}

export interface FriendSearchHit {
  username: string;
  displayName: string | null;
  level: number | null;
  relation: FriendRelation;
  friendshipId: string | null;
}

export interface FriendLists {
  friends: FriendCard[];
  incoming: FriendCard[];
  outgoing: FriendCard[];
  blocked: FriendCard[];
}

export interface PlayerProfile {
  username: string;
  displayName: string | null;
  level: number | null;
  accuracy: number | null;
  relation: FriendRelation;
  friendshipId: string | null;
}

export type FriendLoad<T> = { ready: true; data: T } | { ready: false } | { ready: true; error: string };

function unavailable(message: string): boolean {
  const text = message.toLowerCase();
  return text.includes("function") || text.includes("schema") || text.includes("could not find") || text.includes("does not exist");
}

function cards(value: unknown): FriendCard[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const username = "username" in item && typeof item.username === "string" ? item.username : null;
    const id = "id" in item && typeof item.id === "string" ? item.id : null;
    if (!username || !id) return [];
    const displayName = "displayName" in item && typeof item.displayName === "string" ? item.displayName : null;
    const level = "level" in item && typeof item.level === "number" ? item.level : null;
    return [{ id, username, displayName, level }];
  });
}

export const loadFriendLists = cache(async (): Promise<FriendLoad<FriendLists>> => {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("list_friendships");
  if (error) return unavailable(error.message) ? { ready: false } : { ready: true, error: "Friends could not be loaded." };
  const body = (data ?? {}) as Record<string, unknown>;
  return {
    ready: true,
    data: {
      friends: cards(body.friends),
      incoming: cards(body.incoming),
      outgoing: cards(body.outgoing),
      blocked: cards(body.blocked),
    },
  };
});

export async function searchPlayers(query: string): Promise<FriendLoad<FriendSearchHit[]>> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("search_players", { p_query: query });
  if (error) return unavailable(error.message) ? { ready: false } : { ready: true, error: "Search could not be loaded." };
  if (!Array.isArray(data)) return { ready: true, data: [] };
  const hits = data.flatMap((item) => {
    if (!item || typeof item !== "object" || !("username" in item) || typeof item.username !== "string") return [];
    const relation = "relation" in item && typeof item.relation === "string" ? item.relation : "none";
    const known: FriendRelation[] = ["none", "self", "friends", "pending_out", "pending_in", "blocked"];
    return [
      {
        username: item.username,
        displayName: "displayName" in item && typeof item.displayName === "string" ? item.displayName : null,
        level: "level" in item && typeof item.level === "number" ? item.level : null,
        relation: known.includes(relation as FriendRelation) ? (relation as FriendRelation) : "none",
        friendshipId: "friendshipId" in item && typeof item.friendshipId === "string" ? item.friendshipId : null,
      },
    ];
  });
  return { ready: true, data: hits };
}

export async function loadPlayer(username: string): Promise<FriendLoad<PlayerProfile> | { ready: true; missing: true } | { ready: true; hidden: true }> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("player_profile", { p_username: username });
  if (error) return unavailable(error.message) ? { ready: false } : { ready: true, error: "That profile could not be loaded." };
  const body = (data ?? {}) as Record<string, unknown>;
  if (body.ok !== true) {
    return body.reason === "hidden" ? { ready: true, hidden: true } : { ready: true, missing: true };
  }
  const relation = typeof body.relation === "string" ? body.relation : "none";
  const known: FriendRelation[] = ["none", "self", "friends", "pending_out", "pending_in", "blocked"];
  return {
    ready: true,
    data: {
      username: String(body.username ?? username),
      displayName: typeof body.displayName === "string" ? body.displayName : null,
      level: typeof body.level === "number" ? body.level : null,
      accuracy: typeof body.accuracy === "number" ? body.accuracy : null,
      relation: known.includes(relation as FriendRelation) ? (relation as FriendRelation) : "none",
      friendshipId: typeof body.friendshipId === "string" ? body.friendshipId : null,
    },
  };
}
