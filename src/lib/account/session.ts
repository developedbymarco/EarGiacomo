import { cache } from "react";
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
}

export interface AccountContext {
  configured: boolean;
  user: { id: string; email: string } | null;
  profile: Profile | null;
  profileIssue: "missing" | "unmigrated" | null;
  friendsReady: boolean;
}

const empty: AccountContext = { configured: false, user: null, profile: null, profileIssue: null, friendsReady: false };

const privacyColumns = "profile_visibility, show_accuracy, allow_challenges, show_battle_history";

export const getAccountContext = cache(async (): Promise<AccountContext> => {
  if (!supabaseEnv()) return empty;

  try {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) {
      return { configured: true, user: null, profile: null, profileIssue: null, friendsReady: false };
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select(
        "id, username, display_name, avatar_url, preferred_piano_id, default_range_low, default_range_high, xp, giacominos, account_level",
      )
      .eq("id", data.user.id)
      .maybeSingle();

    const message = profileError?.message?.toLowerCase() ?? "";
    const unmigrated =
      Boolean(profileError) &&
      (message.includes("schema cache") || message.includes("does not exist") || message.includes("could not find"));

    let friendsReady = false;
    let privacy = {
      profile_visibility: "public" as const,
      show_accuracy: true,
      allow_challenges: true,
      show_battle_history: false,
    };
    if (profile) {
      const privacyResult = await supabase.from("profiles").select(privacyColumns).eq("id", data.user.id).maybeSingle();
      if (!privacyResult.error && privacyResult.data) {
        friendsReady = true;
        const row = privacyResult.data;
        privacy = {
          profile_visibility:
            row.profile_visibility === "friends" || row.profile_visibility === "private" ? row.profile_visibility : "public",
          show_accuracy: Boolean(row.show_accuracy),
          allow_challenges: Boolean(row.allow_challenges),
          show_battle_history: Boolean(row.show_battle_history),
        };
      }
    }

    return {
      configured: true,
      user: { id: data.user.id, email: data.user.email ?? "" },
      profile: profile
        ? {
            ...(profile as Profile),
            ...privacy,
            xp: Number(profile.xp ?? 0),
            giacominos: Number(profile.giacominos ?? 0),
            account_level: Number(profile.account_level ?? 1),
          }
        : null,
      profileIssue: profile ? null : unmigrated ? "unmigrated" : profileError || !profile ? "missing" : null,
      friendsReady,
    };
  } catch {
    return { configured: true, user: null, profile: null, profileIssue: null, friendsReady: false };
  }
});
