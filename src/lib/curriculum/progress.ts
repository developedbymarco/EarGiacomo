import type { LessonConfig } from "@/lib/curriculum/types";
import { conceptLabel } from "@/lib/question-generation/labels";
import { rangeProblem, type PracticeSettings } from "@/lib/question-generation/generate";
import { CADENCE_IDS, type CadenceId } from "@/lib/music-theory/cadences";
import type { ChordPresentation, Direction, IntervalQuality, SeventhQuality, TriadQuality } from "@/lib/music-theory/types";
import { SEVENTH_QUALITIES } from "@/lib/music-theory/types";
import { CONCERT_GRAND } from "@/lib/practice/settings";
import { PATHS, type CurriculumNode, type PathId } from "@/lib/curriculum/seed";

export const MASTERED_AT = 80;

export type NodeStatus = "locked" | "purchasable" | "unlocked" | "in_progress" | "mastered";

const PATH_ORDER: PathId[] = ["intervals", "chords", "visual", "cadences"];

export function passedLesson(correct: number, total: number): boolean {
  return total > 0 && correct * 5 >= total * 4;
}

export function masteryDelta(correct: boolean, repeats: number): number {
  if (!correct) return -2;
  return repeats <= 0 ? 3 : 2;
}

export function nextMastery(current: number, correct: boolean, repeats: number): number {
  return Math.min(100, Math.max(0, current + masteryDelta(correct, repeats)));
}

export function masteryLabel(mastery: number, attempts: number): string {
  if (attempts <= 0) return "New";
  if (mastery >= MASTERED_AT) return "Mastered";
  if (mastery >= 60) return "Strong";
  if (mastery >= 35) return "Practiced";
  return "Familiar";
}

export function nodeStatus(input: {
  concepts: string[];
  prerequisiteSlugs: string[];
  passingSlugs: ReadonlySet<string>;
  sessionCount: number;
  passed: boolean;
  masteryByConcept: ReadonlyMap<string, number>;
  unlockCost: number;
  hasUnlock: boolean;
}): NodeStatus {
  const prereqsMet = input.prerequisiteSlugs.every((slug) => input.passingSlugs.has(slug));
  if (!prereqsMet) return "locked";
  if (input.unlockCost > 0 && !input.hasUnlock) return "purchasable";
  const conceptsMastered =
    input.concepts.length > 0 &&
    input.concepts.every((key) => (input.masteryByConcept.get(key) ?? 0) >= MASTERED_AT);
  if (conceptsMastered && input.passed) return "mastered";
  if (input.sessionCount > 0) return "in_progress";
  return "unlocked";
}

export function statusLabel(status: NodeStatus): string {
  switch (status) {
    case "locked":
      return "Locked";
    case "purchasable":
      return "Ready to purchase";
    case "unlocked":
      return "Ready";
    case "in_progress":
      return "In progress";
    case "mastered":
      return "Mastered";
  }
}

export interface MasteryRow {
  conceptKey: string;
  mastery: number;
  attempts: number;
  correct: number;
  lastPracticedAt: string | null;
  lastCorrect: boolean;
  confusionMap: Record<string, number>;
}

const HOUR = 60 * 60 * 1000;

export function reviewWeight(row: MasteryRow, now: number): number {
  if (row.attempts <= 0) return 0;
  const accuracy = row.correct / row.attempts;
  let weight = 10 + (1 - accuracy) * 40;
  if (!row.lastCorrect) weight += 15;
  if (row.lastPracticedAt) {
    const age = now - Date.parse(row.lastPracticedAt);
    if (Number.isFinite(age) && age > 7 * 24 * HOUR) weight += 10;
    if (Number.isFinite(age) && age >= 0 && age < HOUR && row.attempts >= 8) weight -= 12;
  } else {
    weight += 10;
  }
  const confusion = Object.values(row.confusionMap).reduce((sum, count) => sum + count, 0);
  weight += Math.min(20, confusion);
  if (row.mastery >= MASTERED_AT) weight -= 25;
  return Math.max(row.mastery >= MASTERED_AT ? 1 : 4, weight);
}

export function buildReviewSettings(
  rows: MasteryRow[],
  now: number,
  range: { low: number; high: number } | null,
  pianoInstrumentId: string = CONCERT_GRAND.id,
): PracticeSettings | null {
  const practiced = rows.filter((row) => row.attempts > 0 && row.conceptKey.includes(":"));
  const intervals = pickFamily(practiced, "interval", now);
  const chords = pickFamily(practiced, "chord", now);
  const triads = chords.filter(isTriad);
  const sevenths = chords.filter(isSeventh);
  const cadences = pickFamily(practiced, "cadence", now).filter(isCadence);
  if (intervals.length < 2 && triads.length < 2 && sevenths.length < 2 && cadences.length < 2) return null;

  const settings: PracticeSettings = {
    seed: "review",
    count: 10,
    rangeLow: range?.low ?? 48,
    rangeHigh: range?.high ?? 84,
    pianoInstrumentId,
    intervals: intervals as IntervalQuality[],
    triads,
    sevenths,
    cadences,
    directions: ["ascending", "descending", "harmonic"],
    presentations: ["harmonic", "melodicAscending", "melodicDescending"],
    modes: ["audio"],
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

function pickFamily(rows: MasteryRow[], family: "interval" | "chord" | "cadence", now: number): string[] {
  const members = rows.filter((row) => row.conceptKey.startsWith(`${family}:`));
  const ranked = [...members].sort((left, right) => reviewWeight(right, now) - reviewWeight(left, now));
  const picked = ranked.slice(0, 4);
  const mastered = ranked.find((row) => row.mastery >= MASTERED_AT);
  if (mastered && !picked.some((row) => row.conceptKey === mastered.conceptKey)) {
    if (picked.length < 4) picked.push(mastered);
    else picked[picked.length - 1] = mastered;
  }
  return picked.map((row) => row.conceptKey.split(":")[1]!).filter(Boolean);
}

export function lessonToSettings(
  config: LessonConfig,
  seed: string,
  range: { low: number; high: number } | null,
  pianoInstrumentId: string = CONCERT_GRAND.id,
): PracticeSettings {
  const directions = config.presentation.filter(isDirection);
  const presentations = config.presentation.filter(isPresentation);
  const qualities = config.qualities ?? [];
  const settings: PracticeSettings = {
    seed,
    count: config.questions,
    rangeLow: config.pitchRange.min,
    rangeHigh: config.pitchRange.max,
    pianoInstrumentId,
    intervals: config.intervals ?? [],
    triads: qualities.filter(isTriad),
    sevenths: qualities.filter(isSeventh),
    cadences: (config.cadences ?? []).filter(isCadence),
    directions: directions.length > 0 ? directions : ["ascending"],
    presentations: presentations.length > 0 ? presentations : ["harmonic"],
    modes: config.stimulus,
    inversion: config.inversions[0] ?? 0,
    inversions: config.inversions,
    voicing: config.voicing[0] ?? "closed",
    voicings: config.voicing,
  };
  if (range && range.high > range.low) {
    const preferred = { ...settings, rangeLow: range.low, rangeHigh: range.high };
    if (!rangeProblem(preferred)) return preferred;
  }
  return settings;
}

export interface ProgressNode extends CurriculumNode {
  status: NodeStatus;
  passed: boolean;
  sessionCount: number;
}

export function decorateNodes(
  nodes: CurriculumNode[],
  input: {
    passingSlugs: ReadonlySet<string>;
    sessionCounts: ReadonlyMap<string, number>;
    masteryByConcept: ReadonlyMap<string, number>;
    unlockedSlugs: ReadonlySet<string>;
  },
): ProgressNode[] {
  return nodes.map((node) => {
    const passed = input.passingSlugs.has(node.slug);
    const sessionCount = input.sessionCounts.get(node.slug) ?? 0;
    return {
      ...node,
      passed,
      sessionCount,
      status: nodeStatus({
        concepts: node.concepts,
        prerequisiteSlugs: node.prerequisites,
        passingSlugs: input.passingSlugs,
        sessionCount,
        passed,
        masteryByConcept: input.masteryByConcept,
        unlockCost: node.unlockCost,
        hasUnlock: input.unlockedSlugs.has(node.slug),
      }),
    };
  });
}

export function continueNode(nodes: ProgressNode[]): ProgressNode | null {
  const open = nodes.filter((node) => node.status === "in_progress" || node.status === "unlocked").sort(byPath);
  return (
    open.find((node) => node.status === "in_progress" && !node.passed) ??
    open.find((node) => node.status === "unlocked") ??
    open[0] ??
    null
  );
}

export function nextLocked(nodes: ProgressNode[]): ProgressNode | null {
  return [...nodes].filter((node) => node.status === "locked").sort(byPath)[0] ?? null;
}

export function nextPurchase(nodes: ProgressNode[]): ProgressNode | null {
  return [...nodes].filter((node) => node.status === "purchasable").sort(byPath)[0] ?? null;
}

export function lockReason(node: CurriculumNode, nodes: CurriculumNode[], passingSlugs: ReadonlySet<string>): string {
  const missing = node.prerequisites.filter((slug) => !passingSlugs.has(slug));
  const titles = missing.map((slug) => nodes.find((item) => item.slug === slug)?.title ?? slug);
  if (titles.length === 0) return "This lesson is still locked.";
  if (titles.length === 1) return `Finish ${titles[0]} first.`;
  return `Finish ${titles.slice(0, -1).join(", ")} and ${titles[titles.length - 1]} first.`;
}

export function conceptLine(concepts: string[], mastery: MasteryRow[]): string | null {
  const parts = concepts
    .map((key) => {
      const row = mastery.find((item) => item.conceptKey === key);
      if (!row || row.attempts <= 0) return null;
      return `${conceptLabel(key)} ${masteryLabel(row.mastery, row.attempts).toLowerCase()}`;
    })
    .filter((part): part is string => Boolean(part));
  return parts.length > 0 ? parts.join(" · ") : null;
}

function byPath(left: ProgressNode, right: ProgressNode): number {
  return PATH_ORDER.indexOf(left.path) - PATH_ORDER.indexOf(right.path) || left.sortOrder - right.sortOrder;
}

function isDirection(value: string): value is Direction {
  return value === "ascending" || value === "descending" || value === "harmonic";
}

function isPresentation(value: string): value is ChordPresentation {
  return value === "harmonic" || value === "melodicAscending" || value === "melodicDescending";
}

function isTriad(value: string): value is TriadQuality {
  return value === "major" || value === "minor" || value === "diminished" || value === "augmented";
}

function isSeventh(value: string): value is SeventhQuality {
  return (SEVENTH_QUALITIES as readonly string[]).includes(value);
}

function isCadence(value: string): value is CadenceId {
  return (CADENCE_IDS as readonly string[]).includes(value);
}

export function pathById(id: string) {
  return PATHS.find((path) => path.id === id) ?? null;
}
