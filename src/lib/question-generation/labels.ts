import { CADENCES, type CadenceId } from "@/lib/music-theory/cadences";
import type { ChordQuality, IntervalQuality } from "@/lib/music-theory/types";
import { semitonesOf } from "@/lib/music-theory/pitch";

export const INTERVAL_LABELS: Record<IntervalQuality, string> = {
  P1: "Perfect unison",
  m2: "Minor 2nd",
  M2: "Major 2nd",
  m3: "Minor 3rd",
  M3: "Major 3rd",
  P4: "Perfect 4th",
  A4: "Augmented 4th",
  P5: "Perfect 5th",
  m6: "Minor 6th",
  M6: "Major 6th",
  m7: "Minor 7th",
  M7: "Major 7th",
  P8: "Perfect octave",
  m9: "Minor 9th",
  M9: "Major 9th",
  m10: "Minor 10th",
  M10: "Major 10th",
  P11: "Perfect 11th",
  A11: "Augmented 11th",
  P12: "Perfect 12th",
  m13: "Minor 13th",
  M13: "Major 13th",
  m14: "Minor 14th",
  M14: "Major 14th",
  P15: "Perfect 15th",
};

export const CHORD_LABELS: Record<ChordQuality, string> = {
  major: "Major",
  minor: "Minor",
  diminished: "Diminished",
  augmented: "Augmented",
  major7: "Major 7th",
  dominant7: "Dominant 7th",
  minor7: "Minor 7th",
  halfDiminished7: "Half-diminished 7th",
  diminished7: "Diminished 7th",
  minorMajor7: "Minor-major 7th",
  augmented7: "Augmented 7th",
};

const CHORD_GUIDANCE: Record<ChordQuality, string> = {
  major: "A major triad stacks a major third and a perfect fifth.",
  minor: "A minor triad stacks a minor third and a perfect fifth.",
  diminished: "A diminished triad stacks a minor third and a diminished fifth.",
  augmented: "An augmented triad stacks a major third and an augmented fifth.",
  major7: "A major seventh chord is a major triad plus a major seventh.",
  dominant7: "A dominant seventh chord is a major triad plus a minor seventh.",
  minor7: "A minor seventh chord is a minor triad plus a minor seventh.",
  halfDiminished7: "A half-diminished seventh chord is a diminished triad plus a minor seventh.",
  diminished7: "A diminished seventh chord stacks minor thirds up to a diminished seventh.",
  minorMajor7: "A minor-major seventh chord is a minor triad plus a major seventh.",
  augmented7: "An augmented seventh chord is an augmented triad plus a minor seventh.",
};

export const CADENCE_LABELS: Record<CadenceId, string> = Object.fromEntries(
  CADENCES.map((cadence) => [cadence.id, cadence.label]),
) as Record<CadenceId, string>;

const CADENCE_GUIDANCE: Record<CadenceId, string> = {
  plagalMajor: "IV – I moves from the fourth degree to the major tonic.",
  authenticMajor: "V – I moves from the fifth degree to the major tonic.",
  plagalMinor: "iv – i moves from the minor fourth degree to the minor tonic.",
  authenticMinor: "V – i uses a major dominant, then the minor tonic.",
  dominantSeventh: "V7 – I adds a seventh to the dominant before the major tonic.",
  dominantSeventhMinor: "V7 – i adds a seventh to the dominant before the minor tonic.",
  dominantSix: "V6 – I is the dominant in first inversion, then the major tonic.",
};

export function cadenceGuidance(correct: CadenceId): string {
  return CADENCE_GUIDANCE[correct];
}

export function intervalGuidance(correct: IntervalQuality, chosen: IntervalQuality): string {
  const delta = semitonesOf(correct) - semitonesOf(chosen);
  if (delta === 0) return `${INTERVAL_LABELS[correct]} is the sounding interval.`;
  const amount = Math.abs(delta) === 1 ? "one semitone" : `${Math.abs(delta)} semitones`;
  const direction = delta > 0 ? "wider" : "narrower";
  return `The ${phrase(INTERVAL_LABELS[correct])} is ${amount} ${direction} than the ${phrase(INTERVAL_LABELS[chosen])}.`;
}

export function chordGuidance(correct: ChordQuality): string {
  return CHORD_GUIDANCE[correct];
}

export function conceptKey(kind: "interval" | "chord" | "cadence", value: string): string {
  return `${kind}:${value}`;
}

export function conceptLabel(key: string): string {
  const [kind, value] = key.split(":");
  if (kind === "interval" && value && value in INTERVAL_LABELS) {
    return INTERVAL_LABELS[value as IntervalQuality];
  }
  if (kind === "chord" && value && value in CHORD_LABELS) {
    return CHORD_LABELS[value as ChordQuality];
  }
  if (kind === "cadence" && value && value in CADENCE_LABELS) {
    return CADENCE_LABELS[value as CadenceId];
  }
  return key;
}

function phrase(label: string): string {
  return label.charAt(0).toLowerCase() + label.slice(1);
}
