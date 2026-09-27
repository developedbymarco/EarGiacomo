import { cache } from "react";
import type { BattleCard, BattleLists, BattleRecord, BattleStimulus, BattleView } from "@/lib/battles/types";
import { createClient } from "@/lib/supabase/server";

export type BattleLoad<T> = { ready: true; data: T } | { ready: false } | { ready: true; error: string } | { ready: true; missing: true };

function unavailable(message: string): boolean {
  const text = message.toLowerCase();
  return text.includes("function") || text.includes("schema") || text.includes("could not find") || text.includes("does not exist");
}

function winner(value: unknown): "you" | "them" | "draw" | null {
  return value === "you" || value === "them" || value === "draw" ? value : null;
}

function cards(value: unknown): BattleCard[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const id = "id" in item && typeof item.id === "string" ? item.id : null;
    const username = "username" in item && typeof item.username === "string" ? item.username : null;
    if (!id || !username) return [];
    return [
      {
        id,
        status: "status" in item && typeof item.status === "string" ? item.status : "pending",
        preset: "preset" in item && typeof item.preset === "string" ? item.preset : "mixed",
        stake: "stake" in item && typeof item.stake === "number" ? item.stake : 0,
        questionCount: "questionCount" in item && typeof item.questionCount === "number" ? item.questionCount : 10,
        username,
        displayName: "displayName" in item && typeof item.displayName === "string" ? item.displayName : null,
        yourScore: "yourScore" in item && typeof item.yourScore === "number" ? item.yourScore : 0,
        theirScore: "theirScore" in item && typeof item.theirScore === "number" ? item.theirScore : 0,
        winner: winner("winner" in item ? item.winner : null),
      },
    ];
  });
}

function playback(value: unknown): number[][] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((group) => (Array.isArray(group) && group.every((note) => typeof note === "number") ? [group] : []));
}

function stimulus(value: unknown): BattleStimulus | null {
  if (!value || typeof value !== "object") return null;
  const type = "type" in value && (value.type === "interval" || value.type === "chord" || value.type === "cadence") ? value.type : null;
  const mode = "mode" in value && (value.mode === "audio" || value.mode === "staff" || value.mode === "piano") ? value.mode : null;
  const notes = "notes" in value && Array.isArray(value.notes) && value.notes.every((note) => typeof note === "number") ? value.notes : null;
  const choices = "answerChoices" in value && Array.isArray(value.answerChoices) && value.answerChoices.every((choice) => typeof choice === "string") ? value.answerChoices : null;
  if (!type || !mode || !notes || !choices) return null;
  const spelled = "spelled" in value && Array.isArray(value.spelled) && value.spelled.every((name) => typeof name === "string") ? value.spelled : undefined;
  const spelledChords =
    "spelledChords" in value && Array.isArray(value.spelledChords)
      ? value.spelledChords.flatMap((chord) => (Array.isArray(chord) && chord.every((name) => typeof name === "string") ? [chord] : []))
      : undefined;
  return {
    type,
    mode,
    notes,
    playback: playback("playback" in value ? value.playback : null),
    spelled,
    spelledChords,
    answerChoices: choices,
    pianoInstrumentId: "pianoInstrumentId" in value && typeof value.pianoInstrumentId === "string" ? value.pianoInstrumentId : "concert-grand",
    hint: "hint" in value && typeof value.hint === "string" ? value.hint : "",
  };
}

function side(value: unknown): { username: string; displayName: string | null; score: number; answered: number; correct: number } {
  const row = value && typeof value === "object" ? value : {};
  return {
    username: "username" in row && typeof row.username === "string" ? row.username : "player",
    displayName: "displayName" in row && typeof row.displayName === "string" ? row.displayName : null,
    score: "score" in row && typeof row.score === "number" ? row.score : 0,
    answered: "answered" in row && typeof row.answered === "number" ? row.answered : 0,
    correct: "correct" in row && typeof row.correct === "number" ? row.correct : 0,
  };
}

export const loadBattleLists = cache(async (): Promise<BattleLoad<BattleLists>> => {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("list_battles");
  if (error) return unavailable(error.message) ? { ready: false } : { ready: true, error: "Battles could not be loaded." };
  const body = (data ?? {}) as Record<string, unknown>;
  return {
    ready: true,
    data: {
      incoming: cards(body.incoming),
      outgoing: cards(body.outgoing),
      active: cards(body.active),
      recent: cards(body.recent),
    },
  };
});

export async function loadBattle(id: string): Promise<BattleLoad<BattleView>> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("battle_view", { p_id: id, p_open: true });
  if (error) return unavailable(error.message) ? { ready: false } : { ready: true, error: "That battle could not be loaded." };
  const body = (data ?? {}) as Record<string, unknown>;
  if (body.ok !== true) return body.reason === "missing" ? { ready: true, missing: true } : { ready: true, error: "That battle could not be loaded." };
  return {
    ready: true,
    data: {
      id: String(body.id ?? id),
      status: typeof body.status === "string" ? body.status : "pending",
      preset: typeof body.preset === "string" ? body.preset : "mixed",
      stake: typeof body.stake === "number" ? body.stake : 0,
      questionCount: typeof body.questionCount === "number" ? body.questionCount : 10,
      youAre: body.youAre === "opponent" ? "opponent" : "challenger",
      you: side(body.you),
      them: side(body.them),
      winner: winner(body.winner),
      refunded: body.refunded === true,
      yourXp: typeof body.yourXp === "number" ? body.yourXp : 0,
      question: stimulus(body.question),
      questionIndex: typeof body.questionIndex === "number" ? body.questionIndex : null,
    },
  };
}

export async function loadBattleRecord(username: string): Promise<BattleRecord | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("battle_record", { p_username: username });
  if (error) return null;
  const body = (data ?? {}) as Record<string, unknown>;
  if (body.ok !== true || body.visible !== true) return body.visible === false ? { visible: false, wins: 0, losses: 0, draws: 0, played: 0 } : null;
  return {
    visible: true,
    wins: typeof body.wins === "number" ? body.wins : 0,
    losses: typeof body.losses === "number" ? body.losses : 0,
    draws: typeof body.draws === "number" ? body.draws : 0,
    played: typeof body.played === "number" ? body.played : 0,
  };
}
