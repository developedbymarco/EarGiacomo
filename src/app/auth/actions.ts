"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import {
  authErrorMessage,
  firstIssue,
  passwordUpdateSchema,
  profileFormSchema,
  rangePairSchema,
  signupSchema,
} from "@/lib/account/profile";
import { createAdminClient } from "@/lib/supabase/admin";
import { supabaseEnv } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

export type AuthState = { error?: string; message?: string } | null;

const PIANO_SLUG = /^[a-z0-9-]{3,40}$/;

function notReady(): AuthState {
  return { error: "Accounts are not connected yet. Add the Supabase keys from .env.example." };
}

async function appOrigin(): Promise<string> {
  const configured = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "");
  if (configured) return configured;
  const headerList = await headers();
  const host = headerList.get("x-forwarded-host") ?? headerList.get("host") ?? "localhost:3000";
  const proto = headerList.get("x-forwarded-proto") ?? "http";
  return `${proto}://${host}`;
}

async function pianoIdBySlug(supabase: Awaited<ReturnType<typeof createClient>>, slug: string): Promise<string | null> {
  if (!PIANO_SLUG.test(slug)) return null;
  const { data } = await supabase.from("piano_instruments").select("id").eq("slug", slug).maybeSingle();
  return data?.id ?? null;
}

export async function loginAction(_prev: AuthState, formData: FormData): Promise<AuthState> {
  if (!supabaseEnv()) return notReady();
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  if (!email || password.length < 8) return { error: "Enter your email and a password of at least 8 characters." };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: authErrorMessage(error) };
  redirect("/practice");
}

export async function signupAction(_prev: AuthState, formData: FormData): Promise<AuthState> {
  if (!supabaseEnv()) return notReady();
  const parsed = signupSchema.safeParse({
    email: String(formData.get("email") ?? "").trim(),
    password: String(formData.get("password") ?? ""),
    confirm: String(formData.get("confirm") ?? ""),
    username: String(formData.get("username") ?? ""),
    displayName: String(formData.get("displayName") ?? ""),
  });
  if (!parsed.success) return { error: firstIssue(parsed.error) };

  const supabase = await createClient();
  const { data: available, error: availabilityError } = await supabase.rpc("username_available", {
    candidate: parsed.data.username,
  });
  if (availabilityError) return { error: "Accounts are not ready yet. Apply the profiles migration in Supabase." };
  if (!available) return { error: "That username is taken." };

  const origin = await appOrigin();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      emailRedirectTo: `${origin}/auth/callback`,
      data: {
        username: parsed.data.username,
        display_name: parsed.data.displayName,
      },
    },
  });
  if (error) return { error: authErrorMessage(error) };
  if (!data.session) {
    return { message: "Check your email to confirm the account, then log in." };
  }
  redirect("/practice");
}

export async function forgotPasswordAction(_prev: AuthState, formData: FormData): Promise<AuthState> {
  if (!supabaseEnv()) return notReady();
  const email = String(formData.get("email") ?? "").trim();
  if (!email.includes("@")) return { error: "Enter a valid email." };
  const supabase = await createClient();
  const origin = await appOrigin();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/auth/callback?next=/auth/reset`,
  });
  if (error) return { error: authErrorMessage(error) };
  return { message: "If that email has an account, a reset link is on its way." };
}

export async function updatePasswordAction(_prev: AuthState, formData: FormData): Promise<AuthState> {
  if (!supabaseEnv()) return notReady();
  const parsed = passwordUpdateSchema.safeParse({
    password: String(formData.get("password") ?? ""),
    confirm: String(formData.get("confirm") ?? ""),
  });
  if (!parsed.success) return { error: firstIssue(parsed.error) };

  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return { error: "Open the reset link from your email, then choose a new password." };
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) return { error: authErrorMessage(error) };
  redirect("/account");
}

export async function updateProfileAction(_prev: AuthState, formData: FormData): Promise<AuthState> {
  if (!supabaseEnv()) return notReady();
  const parsed = profileFormSchema.safeParse({
    username: String(formData.get("username") ?? ""),
    displayName: String(formData.get("displayName") ?? ""),
    rangeLow: Number(formData.get("rangeLow")),
    rangeHigh: Number(formData.get("rangeHigh")),
    noteNames: String(formData.get("noteNames") ?? "letters"),
  });
  if (!parsed.success) return { error: firstIssue(parsed.error) };

  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect("/login");

  const saved = {
    username: parsed.data.username,
    display_name: parsed.data.displayName,
    default_range_low: parsed.data.rangeLow,
    default_range_high: parsed.data.rangeHigh,
    note_names: parsed.data.noteNames,
  };
  let { error } = await supabase.from("profiles").update(saved).eq("id", data.user.id);
  if (error && missingProfileColumn(error.message)) {
    const withoutNames = { ...saved };
    delete withoutNames.note_names;
    const retry = await supabase.from("profiles").update(withoutNames).eq("id", data.user.id);
    if (!retry.error) return { error: "Run supabase/migrations/20260928030000_note_names.sql, then save Do Re Mi again." };
    error = retry.error;
  }
  if (error) return { error: authErrorMessage(error) };
  revalidatePath("/", "layout");
  return { message: "Saved." };
}

export async function savePracticePreferences(input: {
  rangeLow: number;
  rangeHigh: number;
  pianoSlug?: string;
}): Promise<{ error?: string }> {
  if (!supabaseEnv()) return {};
  const parsed = rangePairSchema.safeParse(input);
  if (!parsed.success) return { error: firstIssue(parsed.error) };

  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return {};

  const pianoId = input.pianoSlug ? await pianoIdBySlug(supabase, input.pianoSlug) : null;
  const { error } = await supabase
    .from("profiles")
    .update({
      default_range_low: parsed.data.rangeLow,
      default_range_high: parsed.data.rangeHigh,
      ...(pianoId ? { preferred_piano_id: pianoId } : {}),
    })
    .eq("id", data.user.id);
  if (error) return { error: "The pitch range could not be saved to your account." };
  return {};
}

export async function logoutAction(): Promise<void> {
  if (supabaseEnv()) {
    const supabase = await createClient();
    await supabase.auth.signOut();
  }
  redirect("/");
}

export async function deleteAccountAction(_prev: AuthState, formData: FormData): Promise<AuthState> {
  if (!supabaseEnv()) return notReady();
  if (String(formData.get("confirm") ?? "") !== "DELETE") {
    return { error: "Type DELETE to confirm." };
  }

  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect("/login");

  const admin = createAdminClient();
  if (!admin) {
    return { error: "Account deletion needs the server service role key." };
  }

  const { error } = await admin.auth.admin.deleteUser(data.user.id);
  if (error) return { error: "The account could not be deleted. Try again." };
  await supabase.auth.signOut();
  redirect("/");
}

function missingProfileColumn(message: string): boolean {
  const text = message.toLowerCase();
  return text.includes("note_names") && (text.includes("schema") || text.includes("does not exist") || text.includes("could not find"));
}
