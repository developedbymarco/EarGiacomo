import { cache } from "react";
import { noteNaming, type NoteNaming } from "@/lib/music-theory/naming";
import { jwtPayload } from "@/lib/supabase/access-token";
import { createClient } from "@/lib/supabase/server";
import { supabaseEnv } from "@/lib/supabase/env";

export interface Profile {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  preferred_piano_id: string | null;
  default_range_low: number | null;
  default_range_high: number | null;
  xp: number;
  giacominos: number;
  account_level: number;
  profile_visibility: "public" | "friends" | "private";
  show_accuracy: boolean;
  allow_challenges: boolean;
  show_battle_history: boolean;
  note_names: NoteNaming;
}

export interface AccountContext {
  configured: boolean;
  user: { id: string; email: string } | null;
  profile: Profile | null;
  profileIssue: "missing" | "unmigrated" | null;
  friendsReady: boolean;
}

const empty: AccountContext = { configured: false, user: null, profile: null, profileIssue: null, friendsReady: false };

const baseColumns =
  "id, username, display_name, avatar_url, preferred_piano_id, default_range_low, default_range_high, xp, giacominos, account_level";
const privacyColumns = "profile_visibility, show_accuracy, allow_challenges, show_battle_history";

const loggedOut: AccountContext = { configured: true, user: null, profile: null, profileIssue: null, friendsReady: false };

export const getAccountContext = cache(async (): Promise<AccountContext> => {
  if (!supabaseEnv()) return empty;

  try {
    const supabase = await createClient();
    const { data } = await supabase.auth.getSession();
    const accessToken = data.session?.access_token;
    const claims = accessToken ? jwtPayload(accessToken) : null;
    const userId = typeof claims?.sub === "string" ? claims.sub : null;
    if (!userId) return loggedOut;

    let withPrivacy = await supabase
      .from("profiles")
      .select(`${baseColumns}, ${privacyColumns}, note_names`)
      .eq("id", userId)
      .maybeSingle();
    if (withPrivacy.error && missingColumn(withPrivacy.error.message) && withPrivacy.error.message.toLowerCase().includes("note_names")) {
      withPrivacy = await supabase.from("profiles").select(`${baseColumns}, ${privacyColumns}`).eq("id", userId).maybeSingle();
    }

    let friendsReady = false;
    let profile = withPrivacy.data as Profile | null;
    let profileError = withPrivacy.error;
    if (profileError && missingColumn(profileError.message)) {
      const fallback = await supabase.from("profiles").select(baseColumns).eq("id", userId).maybeSingle();
      profile = fallback.data as Profile | null;
      profileError = fallback.error;
    } else if (!profileError && profile) {
      friendsReady = true;
    }

    if (profileError && authRejected(profileError.message)) return loggedOut;

    const message = profileError?.message?.toLowerCase() ?? "";
    const unmigrated =
      Boolean(profileError) &&
      (message.includes("schema cache") || message.includes("does not exist") || message.includes("could not find"));
    const row = profile;
    const visibility = row?.profile_visibility;
    return {
      configured: true,
      user: { id: userId, email: typeof claims?.email === "string" ? claims.email : "" },
      profile: row
        ? {
            ...row,
            profile_visibility: visibility === "friends" || visibility === "private" ? visibility : "public",
            show_accuracy: row.show_accuracy !== false,
            allow_challenges: row.allow_challenges !== false,
            show_battle_history: Boolean(row.show_battle_history),
            note_names: noteNaming(row.note_names),
            xp: Number(row.xp ?? 0),
            giacominos: Number(row.giacominos ?? 0),
            account_level: Number(row.account_level ?? 1),
          }
        : null,
      profileIssue: row ? null : unmigrated ? "unmigrated" : "missing",
      friendsReady,
    };
  } catch {
    return loggedOut;
  }
});

function missingColumn(message: string | undefined): boolean {
  const text = message?.toLowerCase() ?? "";
  return text.includes("schema cache") || text.includes("does not exist") || text.includes("could not find");
}

function authRejected(message: string | undefined): boolean {
  const text = message?.toLowerCase() ?? "";
  return text.includes("jwt") || text.includes("not authenticated");
}
