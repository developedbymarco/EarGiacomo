"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { battleQuestions, isBattlePreset, isBattleStake } from "@/lib/battles/rules";
import type { BattleSubmit } from "@/lib/battles/types";
import { createClient } from "@/lib/supabase/server";
import { supabaseEnv } from "@/lib/supabase/env";

const usernamePattern = /^[a-z0-9_]{3,20}$/;

function withNotice(path: string, key: string, value: string): string {
  const join = path.includes("?") ? "&" : "?";
  return `${path}${join}${key}=${value}`;
}

async function callBattle(name: string, args: Record<string, unknown>): Promise<Record<string, unknown>> {
  if (!supabaseEnv()) return { ok: false, reason: "unavailable" };
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) redirect("/login");
  const { data, error } = await supabase.rpc(name, args);
  if (error) return { ok: false, reason: "unavailable" };
  return (data ?? {}) as Record<string, unknown>;
}

export async function ensureBattleQuestions(id: string): Promise<void> {
  const setup = await callBattle("battle_setup", { p_id: id });
  if (setup.ok !== true || setup.ready === true) return;
  const preset = typeof setup.preset === "string" ? setup.preset : "";
  const seed = typeof setup.seed === "string" ? setup.seed : "";
  const count = typeof setup.count === "number" ? setup.count : 0;
  if (!isBattlePreset(preset) || !seed || (count !== 10 && count !== 20)) return;
  await callBattle("install_battle_questions", {
    p_id: id,
    p_seed: seed,
    p_questions: battleQuestions({ preset, count, seed }),
  });
}

export async function createBattleAction(formData: FormData): Promise<void> {
  const username = String(formData.get("username") ?? "").trim().toLowerCase();
  const preset = String(formData.get("preset") ?? "");
  const count = Number(formData.get("count"));
  const stake = Number(formData.get("stake"));
  const back = usernamePattern.test(username) ? `/battles/challenge/${username}` : "/friends";
  if (!usernamePattern.test(username) || !isBattlePreset(preset) || (count !== 10 && count !== 20) || !isBattleStake(stake)) {
    redirect(withNotice(back, "error", "invalid"));
  }
  const result = await callBattle("create_battle", { p_username: username, p_preset: preset, p_count: count, p_stake: stake });
  revalidatePath("/battles");
  if (result.ok === true && typeof result.battleId === "string") redirect(`/battles/${result.battleId}`);
  redirect(withNotice(back, "error", typeof result.reason === "string" ? result.reason : "missing"));
}

export async function respondBattleAction(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  const accept = formData.get("accept") === "yes";
  if (!/^[0-9a-f-]{36}$/i.test(id)) redirect("/battles?error=missing");
  const result = await callBattle("respond_battle", { p_id: id, p_accept: accept });
  if (result.ok !== true) redirect(withNotice(`/battles/${id}`, "error", typeof result.reason === "string" ? result.reason : "missing"));
  if (accept) await ensureBattleQuestions(id);
  revalidatePath("/battles");
  revalidatePath("/", "layout");
  redirect(`/battles/${id}`);
}

export async function cancelBattleAction(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  if (!/^[0-9a-f-]{36}$/i.test(id)) redirect("/battles?error=missing");
  await callBattle("cancel_battle", { p_id: id });
  revalidatePath("/battles");
  redirect(`/battles/${id}`);
}

export async function forfeitBattleAction(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  if (!/^[0-9a-f-]{36}$/i.test(id)) redirect("/battles?error=missing");
  await callBattle("forfeit_battle", { p_id: id });
  revalidatePath("/battles");
  revalidatePath("/", "layout");
  redirect(`/battles/${id}`);
}

export async function submitBattleAnswer(id: string, index: number, answer: string): Promise<BattleSubmit | { error: string }> {
  const result = await callBattle("submit_battle_answer", { p_id: id, p_index: index, p_answer: answer });
  if (result.ok !== true) return { error: typeof result.reason === "string" ? result.reason : "missing" };
  const spelled = Array.isArray(result.spelled) && result.spelled.every((name) => typeof name === "string") ? result.spelled : [];
  const winner = result.winner === "you" || result.winner === "them" || result.winner === "draw" ? result.winner : null;
  if (result.status === "complete" || result.status === "forfeited") {
    revalidatePath("/battles");
    revalidatePath("/", "layout");
  }
  return {
    correct: result.correct === true,
    correctAnswer: typeof result.correctAnswer === "string" ? result.correctAnswer : answer,
    spelled,
    awarded: typeof result.awarded === "number" ? result.awarded : 0,
    yourScore: typeof result.yourScore === "number" ? result.yourScore : 0,
    theirScore: typeof result.theirScore === "number" ? result.theirScore : 0,
    yourAnswered: typeof result.yourAnswered === "number" ? result.yourAnswered : 0,
    theirAnswered: typeof result.theirAnswered === "number" ? result.theirAnswered : 0,
    questionCount: typeof result.questionCount === "number" ? result.questionCount : 10,
    status: typeof result.status === "string" ? result.status : "active",
    winner,
    refunded: result.refunded === true,
  };
}

export async function pulseBattle(id: string): Promise<{
  status: string;
  yourScore: number;
  theirScore: number;
  yourAnswered: number;
  theirAnswered: number;
  questionCount: number;
  winner: "you" | "them" | "draw" | null;
  refunded: boolean;
} | null> {
  const result = await callBattle("battle_pulse", { p_id: id });
  if (result.ok !== true) return null;
  return {
    status: typeof result.status === "string" ? result.status : "active",
    yourScore: typeof result.yourScore === "number" ? result.yourScore : 0,
    theirScore: typeof result.theirScore === "number" ? result.theirScore : 0,
    yourAnswered: typeof result.yourAnswered === "number" ? result.yourAnswered : 0,
    theirAnswered: typeof result.theirAnswered === "number" ? result.theirAnswered : 0,
    questionCount: typeof result.questionCount === "number" ? result.questionCount : 10,
    winner: result.winner === "you" || result.winner === "them" || result.winner === "draw" ? result.winner : null,
    refunded: result.refunded === true,
  };
}
