"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { privacySchema } from "@/lib/account/profile";
import { createClient } from "@/lib/supabase/server";
import { supabaseEnv } from "@/lib/supabase/env";

const usernamePattern = /^[a-z0-9_]{3,20}$/;

function safeReturn(value: FormDataEntryValue | null): string {
  const path = String(value ?? "/friends");
  if (path === "/friends") return path;
  if (/^\/friends\?q=[a-z0-9_]{2,20}$/.test(path)) return path;
  if (/^\/friends\/[a-z0-9_]{3,20}$/.test(path)) return path;
  return "/friends";
}

function withNotice(path: string, key: string, value: string): string {
  const join = path.includes("?") ? "&" : "?";
  return `${path}${join}${key}=${value}`;
}

async function callFriend(name: string, args: Record<string, unknown>): Promise<string | null> {
  if (!supabaseEnv()) return "unavailable";
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) redirect("/login");
  const { data, error } = await supabase.rpc(name, args);
  if (error) return "unavailable";
  const body = (data ?? {}) as { ok?: boolean; reason?: string };
  if (body.ok) return null;
  return body.reason ?? "missing";
}

export async function sendFriendRequestAction(formData: FormData): Promise<void> {
  const username = String(formData.get("username") ?? "").trim().toLowerCase();
  const back = safeReturn(formData.get("returnTo"));
  if (!usernamePattern.test(username)) redirect(withNotice(back, "error", "invalid"));
  const reason = await callFriend("send_friend_request", { p_username: username });
  revalidatePath("/friends");
  redirect(withNotice(back, reason ? "error" : "notice", reason ?? "sent"));
}

export async function respondFriendRequestAction(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  const accept = formData.get("accept") === "yes";
  const back = safeReturn(formData.get("returnTo"));
  if (!/^[0-9a-f-]{36}$/i.test(id)) redirect(withNotice(back, "error", "missing"));
  const reason = await callFriend("respond_friend_request", { p_id: id, p_accept: accept });
  revalidatePath("/friends");
  redirect(withNotice(back, reason ? "error" : "notice", reason ?? (accept ? "accepted" : "declined")));
}

export async function removeFriendAction(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  const back = safeReturn(formData.get("returnTo"));
  if (!/^[0-9a-f-]{36}$/i.test(id)) redirect(withNotice(back, "error", "missing"));
  const reason = await callFriend("remove_friend", { p_id: id });
  revalidatePath("/friends");
  redirect(withNotice(reason ? back : "/friends", reason ? "error" : "notice", reason ?? "removed"));
}

export async function blockPlayerAction(formData: FormData): Promise<void> {
  const username = String(formData.get("username") ?? "").trim().toLowerCase();
  if (!usernamePattern.test(username)) redirect("/friends?error=invalid");
  const reason = await callFriend("block_player", { p_username: username });
  revalidatePath("/friends");
  redirect(withNotice("/friends", reason ? "error" : "notice", reason ?? "blocked"));
}

export async function unblockPlayerAction(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  if (!/^[0-9a-f-]{36}$/i.test(id)) redirect("/friends?error=missing");
  const reason = await callFriend("unblock_player", { p_id: id });
  revalidatePath("/friends");
  redirect(withNotice("/friends", reason ? "error" : "notice", reason ?? "unblocked"));
}

export async function updatePrivacyAction(_prev: { error?: string; message?: string } | null, formData: FormData): Promise<{ error?: string; message?: string } | null> {
  if (!supabaseEnv()) return { error: "Accounts are not connected yet." };
  const parsed = privacySchema.safeParse({
    profileVisibility: String(formData.get("profileVisibility") ?? ""),
    showAccuracy: formData.get("showAccuracy") === "on",
    allowChallenges: formData.get("allowChallenges") === "on",
    showBattleHistory: formData.get("showBattleHistory") === "on",
  });
  if (!parsed.success) return { error: "Choose who can see your profile." };

  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect("/login");
  const { error } = await supabase
    .from("profiles")
    .update({
      profile_visibility: parsed.data.profileVisibility,
      show_accuracy: parsed.data.showAccuracy,
      allow_challenges: parsed.data.allowChallenges,
      show_battle_history: parsed.data.showBattleHistory,
    })
    .eq("id", data.user.id);
  if (error) {
    const text = error.message.toLowerCase();
    if (text.includes("schema") || text.includes("column") || text.includes("could not find")) {
      return { error: "Run the friends migration in Supabase, then save again." };
    }
    return { error: "Privacy could not be saved." };
  }
  revalidatePath("/account");
  revalidatePath("/friends");
  return { message: "Privacy saved." };
}
