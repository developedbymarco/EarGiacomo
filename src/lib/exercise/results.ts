import type { PracticeDraft } from "@/lib/practice/settings";
import type { Attempt } from "@/lib/exercise/store";
import { INTERVAL_QUALITIES, TRIAD_QUALITIES, type IntervalQuality, type TriadQuality } from "@/lib/music-theory/types";
import { conceptLabel } from "@/lib/question-generation/labels";

export interface ConceptScore {
  key: string;
  label: string;
  correct: number;
  total: number;
}

export function summarize(records: Attempt[]): ConceptScore[] {
  const scores = new Map<string, ConceptScore>();
  for (const record of records) {
    const current = scores.get(record.conceptKey) ?? {
      key: record.conceptKey,
      label: conceptLabel(record.conceptKey),
      correct: 0,
      total: 0,
    };
    current.total += 1;
    if (record.correct) current.correct += 1;
    scores.set(record.conceptKey, current);
  }
  return [...scores.values()];
}

export function strongest(scores: ConceptScore[]): ConceptScore | null {
  return [...scores].sort((left, right) => accuracy(right) - accuracy(left) || right.total - left.total)[0] ?? null;
}

export function weakest(scores: ConceptScore[]): ConceptScore | null {
  return [...scores].sort((left, right) => accuracy(left) - accuracy(right) || right.total - left.total)[0] ?? null;
}

export function mistakeDraft(draft: PracticeDraft, records: Attempt[]): PracticeDraft | null {
  const missed = records.filter((record) => !record.correct);
  if (missed.length === 0) return null;
  const intervals = new Set<IntervalQuality>();
  const triads = new Set<TriadQuality>();
  for (const record of missed) {
    const [kind, value] = record.conceptKey.split(":");
    const chosen = record.chosenKey.split(":")[1];
    if (kind === "interval" && isInterval(value)) {
      intervals.add(value);
      if (isInterval(chosen)) intervals.add(chosen);
    }
    if (kind === "chord" && isTriad(value)) {
      triads.add(value);
      if (isTriad(chosen)) triads.add(chosen);
    }
  }
  const next: PracticeDraft = {
    ...draft,
    intervals: intervals.size >= 2 ? INTERVAL_QUALITIES.filter((interval) => intervals.has(interval)) : [],
    triads: triads.size >= 2 ? TRIAD_QUALITIES.filter((triad) => triads.has(triad)) : [],
  };
  if (next.intervals.length < 2 && next.triads.length < 2) return draft;
  return next;
}

function accuracy(score: ConceptScore): number {
  return score.total === 0 ? 0 : score.correct / score.total;
}

function isInterval(value: string | undefined): value is IntervalQuality {
  return INTERVAL_QUALITIES.includes(value as IntervalQuality);
}

function isTriad(value: string | undefined): value is TriadQuality {
  return TRIAD_QUALITIES.includes(value as TriadQuality);
}
