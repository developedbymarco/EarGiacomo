"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { supabaseEnv } from "@/lib/supabase/env";

const attemptSchema = z.object({
  conceptKey: z.string().regex(/^(interval|chord|cadence):[A-Za-z0-9]+$/),
  chosenKey: z.string().regex(/^(interval|chord|cadence):[A-Za-z0-9]+$/),
  correct: z.boolean(),
  repeats: z.number().int().min(0).max(20),
});

const payloadSchema = z.object({
  mode: z.enum(["practice", "guided", "review"]),
  nodeSlug: z.string().min(1).max(80).nullable(),
  token: z.string().min(8).max(80),
  attempts: z.array(attemptSchema).min(1).max(100),
});

export type PurchasableLesson = { slug: string; cost: number };

export type RecordResult =
  | {
      saved: true;
      passed: boolean;
      unlocked: string[];
      purchasable: PurchasableLesson[];
      duplicate: boolean;
      xpEarned: number;
      giacominosEarned: number;
    }
  | { saved: false; reason: "signed_out" | "not_configured" | "unavailable" };

export type UnlockState = { error?: string; message?: string } | null;

export async function recordPracticeResult(input: unknown): Promise<RecordResult> {
  if (!supabaseEnv()) return { saved: false, reason: "not_configured" };
  const parsed = payloadSchema.safeParse(input);
  if (!parsed.success) {
    console.error("record_practice_result rejected the session");
    return { saved: false, reason: "unavailable" };
  }

  try {
    const supabase = await createClient();
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return { saved: false, reason: "signed_out" };

    const { data, error } = await supabase.rpc("record_practice_result", {
      p_mode: parsed.data.mode,
      p_node_slug: parsed.data.nodeSlug,
      p_token: parsed.data.token,
      p_attempts: parsed.data.attempts,
    });
    if (error) {
      console.error("record_practice_result", error.message);
      return { saved: false, reason: "unavailable" };
    }
    const body = (data ?? {}) as {
      passed?: boolean;
      unlocked?: unknown;
      purchasable?: unknown;
      duplicate?: boolean;
      xpEarned?: number;
      giacominosEarned?: number;
    };
    return {
      saved: true,
      passed: Boolean(body.passed),
      unlocked: stringList(body.unlocked),
      purchasable: purchasableList(body.purchasable),
      duplicate: Boolean(body.duplicate),
      xpEarned: Number(body.xpEarned ?? 0),
      giacominosEarned: Number(body.giacominosEarned ?? 0),
    };
  } catch (error) {
    console.error("record_practice_result", error instanceof Error ? error.message : "failed");
    return { saved: false, reason: "unavailable" };
  }
}

export async function unlockLessonAction(_prev: UnlockState, formData: FormData): Promise<UnlockState> {
  if (!supabaseEnv()) return { error: "Accounts are not connected yet." };
  const slug = String(formData.get("slug") ?? "");
  if (!/^[a-z0-9-]{3,80}$/.test(slug)) return { error: "That lesson could not be unlocked." };

  try {
    const supabase = await createClient();
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) return { error: "Log in to unlock a lesson." };
    const { data, error } = await supabase.rpc("unlock_node", { p_slug: slug });
    if (error) return { error: "Run the economy migration in Supabase, then try again." };
    const body = (data ?? {}) as { ok?: boolean; reason?: string; balance?: number; cost?: number; already?: boolean };
    if (!body.ok) {
      if (body.reason === "short") {
        return { error: `This lesson costs ${body.cost} Giacominos. You have ${body.balance}.` };
      }
      if (body.reason === "locked") return { error: "Finish the lesson before this one first." };
      return { error: "That lesson could not be unlocked." };
    }
    revalidatePath("/path", "layout");
    return { message: body.already ? "This lesson is already open." : "Unlocked." };
  } catch {
    return { error: "That lesson could not be unlocked." };
  }
}

function stringList(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function purchasableList(value: unknown): PurchasableLesson[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const slug = "slug" in item && typeof item.slug === "string" ? item.slug : null;
    const rawCost = "cost" in item ? Number(item.cost) : Number.NaN;
    if (!slug || !Number.isFinite(rawCost)) return [];
    return [{ slug, cost: rawCost }];
  });
}
