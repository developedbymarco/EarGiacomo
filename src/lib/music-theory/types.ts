export const INTERVAL_QUALITIES = [
  "P1",
  "m2",
  "M2",
  "m3",
  "M3",
  "P4",
  "A4",
  "P5",
  "m6",
  "M6",
  "m7",
  "M7",
  "P8",
  "m9",
  "M9",
  "m10",
  "M10",
  "P11",
  "A11",
  "P12",
  "m13",
  "M13",
  "m14",
  "M14",
  "P15",
] as const;

export type IntervalQuality = (typeof INTERVAL_QUALITIES)[number];

export const TRIAD_QUALITIES = ["major", "minor", "diminished", "augmented"] as const;
export type TriadQuality = (typeof TRIAD_QUALITIES)[number];

export const SEVENTH_QUALITIES = [
  "major7",
  "dominant7",
  "minor7",
  "halfDiminished7",
  "diminished7",
  "minorMajor7",
  "augmented7",
] as const;

export type SeventhQuality = (typeof SEVENTH_QUALITIES)[number];
export type ChordQuality = TriadQuality | SeventhQuality;

export const SPELL_INTERVALS = ["d5", "A5", "d7"] as const;
export type SpellInterval = IntervalQuality | (typeof SPELL_INTERVALS)[number];

export type Direction = "ascending" | "descending" | "harmonic";
export type ChordPresentation = "harmonic" | "melodicAscending" | "melodicDescending";
export type VoicingKind = "closed" | "open";
export type StimulusMode = "audio" | "staff" | "piano";
export type TriadInversion = 0 | 1 | 2;
export type SeventhInversion = 0 | 1 | 2 | 3;

export const LETTERS = ["C", "D", "E", "F", "G", "A", "B"] as const;
export type Letter = (typeof LETTERS)[number];

export interface SpelledNote {
  letter: Letter;
  accidental: number;
  octave: number;
  midi: number;
}
