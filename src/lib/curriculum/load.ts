import { cache } from "react";
import { getAccountContext } from "@/lib/account/session";
import { decorateNodes, type MasteryRow, type ProgressNode } from "@/lib/curriculum/progress";
import { CONCERT_GRAND } from "@/lib/practice/settings";
import { CURRICULUM_NODES, FOUNDATION_SLUGS, PRESENTATION_SLUGS } from "@/lib/curriculum/seed";
import { DEPTH_NODES } from "@/lib/curriculum/depth";
import { createClient } from "@/lib/supabase/server";
import { supabaseEnv } from "@/lib/supabase/env";

export interface PathPageData {
  ready: boolean;
  signedIn: boolean;
  range: { low: number; high: number } | null;
  nodes: ProgressNode[];
  mastery: MasteryRow[];
  latest: { correct: number; total: number } | null;
  now: number;
  giacominos: number;
  economyReady: boolean;
  depthReady: boolean;
  presentationReady: boolean;
  pianoId: string;
}

const emptyProgress = {
  passingSlugs: new Set<string>(),
  sessionCounts: new Map<string, number>(),
  masteryByConcept: new Map<string, number>(),
  unlockedSlugs: new Set<string>(),
};

export const getPathData = cache(async (): Promise<PathPageData> => {
  const account = await getAccountContext();
  const range = rangeFrom(account.profile);
  const base: PathPageData = {
    ready: false,
    signedIn: Boolean(account.user),
    range,
    nodes: decorateNodes(CURRICULUM_NODES, emptyProgress),
    mastery: [],
    latest: null,
    now: Date.now(),
    giacominos: account.profile?.giacominos ?? 0,
    economyReady: false,
    depthReady: false,
    presentationReady: false,
    pianoId: CONCERT_GRAND.id,
  };
  if (!supabaseEnv()) return base;

  try {
    const supabase = await createClient();
    const catalog = await readCatalog(supabase);
    if (!catalog) return base;
    const known = new Set(catalog.map((row) => row.slug as string));
    const foundationReady = FOUNDATION_SLUGS.every((slug) => known.has(slug));
    if (!foundationReady) return base;
    const costs = new Map(catalog.map((row) => [row.slug as string, Number(row.unlock_cost)]));
    const depthReady = DEPTH_NODES.every((node) => known.has(node.slug));
    const presentationReady = PRESENTATION_SLUGS.every((slug) => known.has(slug));
    const priced = CURRICULUM_NODES.filter((node) => known.has(node.slug)).map((node) => ({
      ...node,
      unlockCost: costs.get(node.slug) ?? node.unlockCost,
    }));
    const economyReady = (costs.get("add-augmented") ?? 0) > 0;
    if (!account.user) {
      return {
        ...base,
        ready: true,
        economyReady,
        depthReady,
        presentationReady,
        pianoId: CONCERT_GRAND.id,
        nodes: decorateNodes(priced, emptyProgress),
        now: Date.now(),
      };
    }

    const idToSlug = new Map(catalog.map((row) => [row.id as string, row.slug as string]));
    const [sessionsResult, masteryResult, unlocksResult, pianoId] = await Promise.all([
      supabase
        .from("practice_sessions")
        .select("node_id, mode, question_count, correct_count, completed_at")
        .eq("user_id", account.user.id)
        .order("completed_at", { ascending: false }),
      supabase
        .from("user_mastery")
        .select("concept_key, mastery, attempts, correct, last_practiced_at, last_correct, confusion_map")
        .eq("user_id", account.user.id),
      supabase.from("user_unlocks").select("node_id").eq("user_id", account.user.id),
      preferredPianoSlug(supabase, account.profile?.preferred_piano_id ?? null),
    ]);

    const sessions = sessionsResult.data ?? [];
    const passingSlugs = new Set<string>();
    const sessionCounts = new Map<string, number>();
    for (const session of sessions) {
      const slug = session.node_id ? idToSlug.get(session.node_id as string) : null;
      if (!slug || session.mode !== "guided") continue;
      sessionCounts.set(slug, (sessionCounts.get(slug) ?? 0) + 1);
      const correct = Number(session.correct_count);
      const total = Number(session.question_count);
      if (session.completed_at && total > 0 && correct * 5 >= total * 4) passingSlugs.add(slug);
    }

    const mastery = (masteryResult.data ?? []).map(toMasteryRow);
    const masteryByConcept = new Map(mastery.map((row) => [row.conceptKey, row.mastery]));
    const unlockedSlugs = new Set(
      (unlocksResult.data ?? [])
        .map((row) => (row.node_id ? idToSlug.get(row.node_id as string) : null))
        .filter((slug): slug is string => Boolean(slug)),
    );
    const latestSession = sessions[0];
    return {
      ready: true,
      signedIn: true,
      range,
      nodes: decorateNodes(priced, { passingSlugs, sessionCounts, masteryByConcept, unlockedSlugs }),
      giacominos: account.profile?.giacominos ?? 0,
      economyReady,
      depthReady,
      presentationReady,
      pianoId,
      mastery,
      latest: latestSession
        ? { correct: Number(latestSession.correct_count), total: Number(latestSession.question_count) }
        : null,
      now: Date.now(),
    };
  } catch {
    return base;
  }
});

function rangeFrom(profile: { default_range_low: number | null; default_range_high: number | null } | null) {
  if (!profile) return null;
  const low = profile.default_range_low;
  const high = profile.default_range_high;
  if (typeof low !== "number" || typeof high !== "number" || high <= low) return null;
  return { low, high };
}

function toMasteryRow(row: {
  concept_key: string;
  mastery: number | string;
  attempts: number;
  correct: number;
  last_practiced_at: string | null;
  last_correct: boolean;
  confusion_map: unknown;
}): MasteryRow {
  const confusionMap: Record<string, number> = {};
  if (row.confusion_map && typeof row.confusion_map === "object") {
    for (const [key, value] of Object.entries(row.confusion_map)) {
      if (typeof value === "number") confusionMap[key] = value;
    }
  }
  return {
    conceptKey: row.concept_key,
    mastery: Number(row.mastery),
    attempts: row.attempts,
    correct: row.correct,
    lastPracticedAt: row.last_practiced_at,
    lastCorrect: row.last_correct,
    confusionMap,
  };
}

type CatalogRow = { id: string; slug: string; unlock_cost: number | string };

let catalogCache: { at: number; rows: CatalogRow[] } | null = null;

async function readCatalog(
  supabase: Awaited<ReturnType<typeof createClient>>,
): Promise<CatalogRow[] | null> {
  const now = Date.now();
  if (catalogCache && now - catalogCache.at < 20_000) return catalogCache.rows;
  const { data, error } = await supabase.from("curriculum_nodes").select("id, slug, unlock_cost");
  if (error || !data) return catalogCache?.rows ?? null;
  catalogCache = { at: now, rows: data };
  return catalogCache.rows;
}

async function preferredPianoSlug(
  supabase: Awaited<ReturnType<typeof createClient>>,
  pianoId: string | null,
): Promise<string> {
  if (!pianoId) return CONCERT_GRAND.id;
  const { data } = await supabase.from("piano_instruments").select("slug").eq("id", pianoId).maybeSingle();
  return typeof data?.slug === "string" ? data.slug : CONCERT_GRAND.id;
}
