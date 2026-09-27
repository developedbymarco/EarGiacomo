import { z } from "zod";
import { CADENCE_IDS, cadenceSpan, realizeCadence, type CadenceId } from "@/lib/music-theory/cadences";
import { chordOffsets, semitonesOf } from "@/lib/music-theory/pitch";
import { pick, hashSeed, mulberry32 } from "@/lib/music-theory/rng";
import { candidateRoots, formatDisplay, spellInterval } from "@/lib/music-theory/spelling";
import { realizeChord } from "@/lib/music-theory/voicing";
import {
  INTERVAL_QUALITIES,
  SEVENTH_QUALITIES,
  TRIAD_QUALITIES,
  type ChordPresentation,
  type ChordQuality,
  type Direction,
  type IntervalQuality,
  type StimulusMode,
  type VoicingKind,
} from "@/lib/music-theory/types";

export const practiceSettingsSchema = z.object({
  seed: z.string().min(1),
  count: z.number().int().min(1).max(100),
  rangeLow: z.number().int().min(21).max(108),
  rangeHigh: z.number().int().min(21).max(108),
  pianoInstrumentId: z.string().min(1),
  intervals: z.array(z.enum(INTERVAL_QUALITIES)),
  triads: z.array(z.enum(TRIAD_QUALITIES)),
  sevenths: z.array(z.enum(SEVENTH_QUALITIES)),
  directions: z.array(z.enum(["ascending", "descending", "harmonic"])),
  presentations: z.array(z.enum(["harmonic", "melodicAscending", "melodicDescending"])),
  modes: z.array(z.enum(["audio", "staff", "piano"])).min(1),
  inversion: z.number().int().min(0).max(3),
  inversions: z.array(z.number().int().min(0).max(3)).optional(),
  voicing: z.enum(["closed", "open"]),
  voicings: z.array(z.enum(["closed", "open"])).optional(),
  cadences: z.array(z.enum(CADENCE_IDS)).optional(),
});

export type PracticeSettings = z.infer<typeof practiceSettingsSchema>;

export interface IntervalQuestion {
  id: string;
  type: "interval";
  mode: StimulusMode;
  interval: IntervalQuality;
  rootMidi: number;
  direction: Direction;
  notes: number[];
  playback: number[][];
  spelled: string[];
  answerChoices: IntervalQuality[];
  pianoInstrumentId: string;
}

export interface ChordQuestion {
  id: string;
  type: "chord";
  mode: StimulusMode;
  quality: ChordQuality;
  rootMidi: number;
  inversion: number;
  voicing: VoicingKind;
  presentation: ChordPresentation;
  notes: number[];
  playback: number[][];
  spelled: string[];
  answerChoices: ChordQuality[];
  pianoInstrumentId: string;
}

export interface CadenceQuestion {
  id: string;
  type: "cadence";
  mode: StimulusMode;
  cadenceId: CadenceId;
  notes: number[];
  playback: number[][];
  spelled: string[];
  spelledChords: string[][];
  answerChoices: CadenceId[];
  pianoInstrumentId: string;
}

export type Question = IntervalQuestion | ChordQuestion | CadenceQuestion;

export function rangeProblem(settings: PracticeSettings): string | null {
  if (settings.rangeHigh <= settings.rangeLow) {
    return "The highest note has to sit above the lowest note.";
  }
  if (settings.modes.length === 0) {
    return "Choose at least one way to present the question.";
  }
  const intervalReady = settings.intervals.length >= 2;
  const triadReady = settings.triads.length >= 2;
  const seventhReady = settings.sevenths.length >= 2;
  const cadenceReady = (settings.cadences?.length ?? 0) >= 2;
  if (!intervalReady && !triadReady && !seventhReady && !cadenceReady) {
    return "Choose at least two intervals, two triads, two seventh chords, or two cadences so each question has a real choice.";
  }
  if (intervalReady && settings.directions.length === 0) {
    return "Choose ascending, descending, or harmonic for interval questions.";
  }
  if ((triadReady || seventhReady) && settings.presentations.length === 0) {
    return "Choose how chords are played.";
  }

  const inversions = chosenInversions(settings);
  if (settings.triads.length >= 2 && inversions.some((inversion) => inversion > 2)) {
    return "Triads stop at second inversion.";
  }
  const width = settings.rangeHigh - settings.rangeLow;
  const needed = requiredSpan(settings);
  if (width < needed) {
    return `This range is ${width} semitones wide. The largest selected concept needs ${needed}.`;
  }
  return null;
}

export function generateSession(settings: PracticeSettings): Question[] {
  const problem = rangeProblem(settings);
  if (problem) throw new Error(problem);
  const random = mulberry32(hashSeed(settings.seed));
  const questions: Question[] = [];
  for (let index = 0; index < settings.count; index += 1) {
    questions.push(generateQuestion(settings, random, index));
  }
  return questions;
}

function generateQuestion(
  settings: PracticeSettings,
  random: () => number,
  index: number,
): Question {
  const families = availableFamilies(settings);
  const family = pick(random, families);
  if (family === "interval") return generateInterval(settings, random, index);
  if (family === "cadence") return generateCadence(settings, random, index);
  return generateChord(settings, random, index, family);
}

function generateInterval(
  settings: PracticeSettings,
  random: () => number,
  index: number,
): IntervalQuestion {
  const interval = pick(random, ordered(settings.intervals, INTERVAL_QUALITIES));
  const direction = pick(random, settings.directions);
  const mode = pick(random, settings.modes);
  const size = semitonesOf(interval);
  const roots = candidateRoots(settings.rangeLow, settings.rangeHigh - size).filter((root) => {
    try {
      const upper = spellInterval(root, interval);
      return Math.abs(root.accidental) <= 1 && Math.abs(upper.accidental) <= 1;
    } catch {
      return false;
    }
  });
  if (roots.length === 0) {
    throw new Error(`No root fits ${interval} inside the selected range.`);
  }
  const root = pick(random, roots);
  const upper = spellInterval(root, interval);
  const notes = [root.midi, upper.midi];
  return {
    id: `${settings.seed}:${index}`,
    type: "interval",
    mode,
    interval,
    rootMidi: root.midi,
    direction,
    notes,
    playback: playbackFor(notes, direction),
    spelled: [formatDisplay(root), formatDisplay(upper)],
    answerChoices: ordered(settings.intervals, INTERVAL_QUALITIES),
    pianoInstrumentId: settings.pianoInstrumentId,
  };
}

function generateChord(
  settings: PracticeSettings,
  random: () => number,
  index: number,
  family: "triad" | "seventh",
): ChordQuestion {
  const pool = family === "triad" ? settings.triads : settings.sevenths;
  const catalog = family === "triad" ? TRIAD_QUALITIES : SEVENTH_QUALITIES;
  const quality = pick(random, ordered(pool, catalog));
  const presentation = pick(random, settings.presentations);
  const mode = pick(random, settings.modes);
  const inversion = pick(random, inversionChoices(settings, family));
  const voicing = pick(random, chosenVoicings(settings));
  const roots = candidateRoots(settings.rangeLow, settings.rangeHigh).filter(
    (root) => realizeChord(root, quality, inversion, voicing, settings.rangeLow, settings.rangeHigh) !== null,
  );
  if (roots.length === 0) {
    throw new Error(`No voicing of ${quality} fits inside the selected range.`);
  }
  const root = pick(random, roots);
  const voiced = realizeChord(root, quality, inversion, voicing, settings.rangeLow, settings.rangeHigh);
  if (!voiced) throw new Error(`Could not voice ${quality}`);
  const notes = voiced.map((note) => note.midi);
  return {
    id: `${settings.seed}:${index}`,
    type: "chord",
    mode,
    quality,
    rootMidi: root.midi,
    inversion,
    voicing,
    presentation,
    notes,
    playback: playbackFor(notes, presentationToDirection(presentation)),
    spelled: voiced.map(formatDisplay),
    answerChoices: ordered(pool, catalog),
    pianoInstrumentId: settings.pianoInstrumentId,
  };
}

function generateCadence(settings: PracticeSettings, random: () => number, index: number): CadenceQuestion {
  const pool = ordered(settings.cadences ?? [], CADENCE_IDS);
  const cadenceId = pick(random, pool);
  const mode = pick(random, settings.modes);
  const tonics = candidateRoots(settings.rangeLow, settings.rangeHigh).filter(
    (tonic) => realizeCadence(tonic, cadenceId, settings.rangeLow, settings.rangeHigh) !== null,
  );
  if (tonics.length === 0) {
    throw new Error(`No key fits ${cadenceId} inside the selected range.`);
  }
  const tonic = pick(random, tonics);
  const chords = realizeCadence(tonic, cadenceId, settings.rangeLow, settings.rangeHigh);
  if (!chords) throw new Error(`Could not spell ${cadenceId}`);
  const spelledChords = chords.map((chord) => chord.map(formatDisplay));
  const notes = chords.flat().map((note) => note.midi);
  return {
    id: `${settings.seed}:${index}`,
    type: "cadence",
    mode,
    cadenceId,
    notes,
    playback: chords.map((chord) => chord.map((note) => note.midi)),
    spelled: spelledChords.map((chord) => chord.join(" ")),
    spelledChords,
    answerChoices: pool,
    pianoInstrumentId: settings.pianoInstrumentId,
  };
}

function availableFamilies(settings: PracticeSettings): Array<"interval" | "triad" | "seventh" | "cadence"> {
  const families: Array<"interval" | "triad" | "seventh" | "cadence"> = [];
  if (settings.intervals.length >= 2) families.push("interval");
  if (settings.triads.length >= 2) families.push("triad");
  if (settings.sevenths.length >= 2) families.push("seventh");
  if ((settings.cadences?.length ?? 0) >= 2) families.push("cadence");
  return families;
}

function chosenInversions(settings: PracticeSettings): number[] {
  return settings.inversions?.length ? settings.inversions : [settings.inversion];
}

function chosenVoicings(settings: PracticeSettings): VoicingKind[] {
  return settings.voicings?.length ? settings.voicings : [settings.voicing];
}

function inversionChoices(settings: PracticeSettings, family: "triad" | "seventh"): number[] {
  const max = family === "triad" ? 2 : 3;
  const choices = chosenInversions(settings).filter((inversion) => inversion <= max);
  return choices.length > 0 ? choices : [0];
}

function requiredSpan(settings: PracticeSettings): number {
  let needed = 0;
  if (settings.intervals.length >= 2) {
    for (const interval of settings.intervals) {
      const size = semitonesOf(interval);
      needed = Math.max(needed, size > 12 ? size + 12 : size);
    }
  }
  const chords = [
    ...(settings.triads.length >= 2 ? settings.triads : []),
    ...(settings.sevenths.length >= 2 ? settings.sevenths : []),
  ];
  for (const quality of chords) {
    for (const inversion of chosenInversions(settings)) {
      for (const voicing of chosenVoicings(settings)) {
        needed = Math.max(needed, chordElevation(quality, inversion, voicing));
      }
    }
  }
  for (const cadenceId of settings.cadences ?? []) {
    needed = Math.max(needed, cadenceSpan(cadenceId) + 12);
  }
  return needed;
}

function chordElevation(quality: ChordQuality, inversion: number, voicing: VoicingKind): number {
  const offsets = chordOffsets(quality);
  const bass = offsets[Math.min(inversion, offsets.length - 1)]!;
  let top = 0;
  for (const offset of offsets) {
    let placed = offset;
    while (placed < bass) placed += 12;
    top = Math.max(top, placed);
  }
  return top + (voicing === "open" ? 12 : 0);
}

function playbackFor(notes: number[], direction: Direction): number[][] {
  if (direction === "harmonic") return [notes];
  const orderedNotes = direction === "ascending" ? notes : [...notes].reverse();
  return orderedNotes.map((note) => [note]);
}

function presentationToDirection(presentation: ChordPresentation): Direction {
  if (presentation === "melodicAscending") return "ascending";
  if (presentation === "melodicDescending") return "descending";
  return "harmonic";
}

function ordered<T extends string>(selected: readonly T[], catalog: readonly T[]): T[] {
  return catalog.filter((item) => selected.includes(item));
}
