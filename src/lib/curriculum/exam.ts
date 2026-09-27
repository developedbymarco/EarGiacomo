import type { ProgressNode } from "@/lib/curriculum/progress";
import { CADENCE_IDS } from "@/lib/music-theory/cadences";
import { INTERVAL_QUALITIES, SEVENTH_QUALITIES, TRIAD_QUALITIES } from "@/lib/music-theory/types";
import { rangeProblem, type PracticeSettings } from "@/lib/question-generation/generate";
import { CONCERT_GRAND } from "@/lib/practice/settings";

export const EXAM_PRESETS = [
  { id: "intervals", title: "Intervals", lede: "Every unlocked interval, by ear." },
  { id: "triads", title: "Triads", lede: "Every unlocked triad, by ear." },
  { id: "sevenths", title: "Sevenths", lede: "Every unlocked seventh chord, by ear." },
  { id: "cadences", title: "Cadences", lede: "Every unlocked cadence, by ear." },
  { id: "visual", title: "Visual", lede: "The same unlocked sounds, on the staff or the keys." },
  { id: "full", title: "Full", lede: "A mix of everything you have unlocked." },
] as const;

export type ExamPresetId = (typeof EXAM_PRESETS)[number]["id"];

export function examSettings(
  nodes: ProgressNode[],
  preset: ExamPresetId,
  range: { low: number; high: number } | null,
  pianoInstrumentId: string = CONCERT_GRAND.id,
): PracticeSettings | null {
  const concepts = openConcepts(nodes);
  const intervals = ordered(concepts, "interval", INTERVAL_QUALITIES);
  const triads = ordered(concepts, "chord", TRIAD_QUALITIES);
  const sevenths = ordered(concepts, "chord", SEVENTH_QUALITIES);
  const cadences = ordered(concepts, "cadence", CADENCE_IDS);
  const visual = preset === "visual";
  const settings: PracticeSettings = {
    seed: "exam",
    count: 10,
    rangeLow: range?.low ?? 48,
    rangeHigh: range?.high ?? 84,
    pianoInstrumentId,
    intervals: preset === "intervals" || preset === "full" || visual ? intervals : [],
    triads: preset === "triads" || preset === "full" || visual ? triads : [],
    sevenths: preset === "sevenths" || preset === "full" || visual ? sevenths : [],
    cadences: preset === "cadences" || preset === "full" || visual ? cadences : [],
    directions: ["ascending", "descending", "harmonic"],
    presentations: ["harmonic", "melodicAscending", "melodicDescending"],
    modes: visual ? ["staff", "piano"] : ["audio"],
    inversion: 0,
    voicing: "closed",
  };
  if (rangeProblem(settings)) {
    settings.rangeLow = 36;
    settings.rangeHigh = 96;
  }
  if (rangeProblem(settings)) return null;
  return settings;
}

function openConcepts(nodes: ProgressNode[]): string[] {
  const keys = new Set<string>();
  for (const node of nodes) {
    if (node.status === "locked" || node.status === "purchasable") continue;
    for (const key of node.concepts) keys.add(key);
  }
  return [...keys];
}

function ordered<T extends string>(concepts: string[], prefix: string, catalog: readonly T[]): T[] {
  const selected = new Set(
    concepts.filter((key) => key.startsWith(`${prefix}:`)).map((key) => key.slice(prefix.length + 1)),
  );
  return catalog.filter((item) => selected.has(item));
}
