import { Chord, Interval } from "@tonaljs/tonal";
import type { ChordQuality, SpellInterval } from "./types";

const INTERVAL_SYMBOL: Record<SpellInterval, string> = {
  P1: "1P",
  m2: "2m",
  M2: "2M",
  m3: "3m",
  M3: "3M",
  P4: "4P",
  A4: "4A",
  P5: "5P",
  m6: "6m",
  M6: "6M",
  m7: "7m",
  M7: "7M",
  P8: "8P",
  m9: "9m",
  M9: "9M",
  m10: "10m",
  M10: "10M",
  P11: "11P",
  A11: "11A",
  P12: "12P",
  m13: "13m",
  M13: "13M",
  m14: "14m",
  M14: "14M",
  P15: "15P",
  d5: "5d",
  A5: "5A",
  d7: "7d",
};

const CHORD_SYMBOL: Record<ChordQuality, string> = {
  major: "M",
  minor: "m",
  diminished: "o",
  augmented: "aug",
  major7: "maj7",
  dominant7: "7",
  minor7: "m7",
  halfDiminished7: "m7b5",
  diminished7: "dim7",
  minorMajor7: "mMaj7",
  augmented7: "aug7",
};

const CHORD_SPELLING: Record<ChordQuality, SpellInterval[]> = {
  major: ["P1", "M3", "P5"],
  minor: ["P1", "m3", "P5"],
  diminished: ["P1", "m3", "d5"],
  augmented: ["P1", "M3", "A5"],
  major7: ["P1", "M3", "P5", "M7"],
  dominant7: ["P1", "M3", "P5", "m7"],
  minor7: ["P1", "m3", "P5", "m7"],
  halfDiminished7: ["P1", "m3", "d5", "m7"],
  diminished7: ["P1", "m3", "d5", "d7"],
  minorMajor7: ["P1", "m3", "P5", "M7"],
  augmented7: ["P1", "M3", "A5", "m7"],
};

export function semitonesOf(interval: SpellInterval): number {
  const value = Interval.semitones(INTERVAL_SYMBOL[interval]);
  if (value === null || value === undefined) {
    throw new Error(`No semitone size for ${interval}`);
  }
  return value;
}

export function chordOffsets(quality: ChordQuality): number[] {
  const chord = Chord.get(CHORD_SYMBOL[quality]);
  if (chord.empty || chord.intervals.length === 0) {
    throw new Error(`No tonal chord for ${quality}`);
  }
  return chord.intervals.map((interval) => {
    const semitones = Interval.semitones(interval);
    if (semitones === null || semitones === undefined) {
      throw new Error(`No semitone size for ${interval}`);
    }
    return semitones;
  });
}

export function chordSpellIntervals(quality: ChordQuality): SpellInterval[] {
  const spelling = CHORD_SPELLING[quality];
  const offsets = chordOffsets(quality);
  if (spelling.length !== offsets.length) {
    throw new Error(`Spelling does not match ${quality}`);
  }
  spelling.forEach((interval, index) => {
    if (semitonesOf(interval) !== offsets[index]) {
      throw new Error(`Spelling of ${quality} does not match its semitones`);
    }
  });
  return spelling;
}

export function isTriad(quality: ChordQuality): boolean {
  return chordOffsets(quality).length === 3;
}
