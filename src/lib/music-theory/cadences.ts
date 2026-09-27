import type { SpellInterval, SpelledNote } from "@/lib/music-theory/types";
import { semitonesOf } from "@/lib/music-theory/pitch";
import { spellInterval } from "@/lib/music-theory/spelling";

export interface CadenceSpec {
  id: string;
  label: string;
  chords: SpellInterval[][];
}

export const CADENCES = [
  { id: "plagalMajor", label: "IV – I", chords: [["P4", "M6", "P8"], ["P1", "M3", "P5"]] },
  { id: "authenticMajor", label: "V – I", chords: [["P5", "M7", "M9"], ["P1", "M3", "P5"]] },
  { id: "plagalMinor", label: "iv – i", chords: [["P4", "m6", "P8"], ["P1", "m3", "P5"]] },
  { id: "authenticMinor", label: "V – i", chords: [["P5", "M7", "M9"], ["P1", "m3", "P5"]] },
  { id: "dominantSeventh", label: "V7 – I", chords: [["P5", "M7", "M9", "P11"], ["P1", "M3", "P5"]] },
  { id: "dominantSeventhMinor", label: "V7 – i", chords: [["P5", "M7", "M9", "P11"], ["P1", "m3", "P5"]] },
  { id: "dominantSix", label: "V6 – I", chords: [["M7", "M9", "P12"], ["P1", "M3", "P5"]] },
] as const satisfies readonly CadenceSpec[];

export type CadenceId = (typeof CADENCES)[number]["id"];

export const CADENCE_IDS = CADENCES.map((cadence) => cadence.id) as [CadenceId, ...CadenceId[]];

export function cadenceById(id: string): CadenceSpec | null {
  return CADENCES.find((cadence) => cadence.id === id) ?? null;
}

export function cadenceSpan(id: string): number {
  const cadence = cadenceById(id);
  if (!cadence) return 0;
  let span = 0;
  for (const chord of cadence.chords) {
    for (const interval of chord) span = Math.max(span, semitonesOf(interval));
  }
  return span;
}

export function realizeCadence(
  tonic: SpelledNote,
  id: string,
  low: number,
  high: number,
): SpelledNote[][] | null {
  const cadence = cadenceById(id);
  if (!cadence || Math.abs(tonic.accidental) > 1) return null;
  try {
    const chords = cadence.chords.map((intervals) => intervals.map((interval) => spellInterval(tonic, interval)));
    const notes = chords.flat();
    if (notes.some((note) => Math.abs(note.accidental) > 1)) return null;
    if (notes.some((note) => note.midi < low || note.midi > high || note.midi < 21 || note.midi > 108)) return null;
    return chords;
  } catch {
    return null;
  }
}
