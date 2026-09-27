import { generateSession, type PracticeSettings, type Question } from "@/lib/question-generation/generate";
import type { BattleStimulus } from "@/lib/battles/types";

export const BATTLE_RANGE_LOW = 48;
export const BATTLE_RANGE_HIGH = 84;

export const BATTLE_PRESETS = [
  { id: "intervals", label: "Intervals", detail: "Seconds, thirds, fourths, fifths, and the octave." },
  { id: "triads", label: "Triads", detail: "Major, minor, diminished, and augmented." },
  { id: "sevenths", label: "Seventh chords", detail: "The seventh chords used on the path." },
  { id: "mixed", label: "Mixed", detail: "Intervals and triads in one sitting." },
  { id: "visual", label: "Visual", detail: "Name intervals and triads written on the staff." },
  { id: "cadences", label: "Cadences", detail: "IV–I and V–I, in major and minor." },
] as const;

export const BATTLE_STAKES = [
  { amount: 0, label: "Free", detail: "Nothing is wagered." },
  { amount: 10, label: "10 Giacominos", detail: "Each player pays 10. The winner takes 20." },
  { amount: 25, label: "25 Giacominos", detail: "Each player pays 25. The winner takes 50." },
  { amount: 50, label: "50 Giacominos", detail: "Each player pays 50. The winner takes 100." },
] as const;

export type BattlePreset = (typeof BATTLE_PRESETS)[number]["id"];
export type BattleStake = (typeof BATTLE_STAKES)[number]["amount"];

export function isBattlePreset(value: string): value is BattlePreset {
  return BATTLE_PRESETS.some((preset) => preset.id === value);
}

export function isBattleStake(value: number): value is BattleStake {
  return BATTLE_STAKES.some((stake) => stake.amount === value);
}

export function presetLabel(id: string): string {
  return BATTLE_PRESETS.find((preset) => preset.id === id)?.label ?? "Battle";
}

export function stakeLabel(amount: number): string {
  if (amount <= 0) return "Free";
  return `${amount} Giacominos`;
}

export function describeBattleResult(input: { winner: "you" | "them" | "draw" | null; stake: number; refunded: boolean }): string {
  if (input.refunded) {
    return input.stake > 0 ? "This match ended before three answers. Both entry fees are back." : "This match ended before three answers.";
  }
  if (input.winner === "you") {
    return input.stake > 0 ? `You won. Both entry fees come to you: ${input.stake * 2} Giacominos.` : "You won this free match.";
  }
  if (input.winner === "them") {
    return input.stake > 0 ? "You lost. The entry fee stays with the winner." : "You lost this free match.";
  }
  if (input.winner === "draw") {
    return input.stake > 0 ? "Draw. Both entry fees are back." : "Draw. The match was free.";
  }
  return "This match is closed.";
}

export function battleSettings(input: {
  preset: BattlePreset;
  count: number;
  seed: string;
}): PracticeSettings {
  const shared: PracticeSettings = {
    seed: input.seed,
    count: input.count,
    rangeLow: BATTLE_RANGE_LOW,
    rangeHigh: BATTLE_RANGE_HIGH,
    pianoInstrumentId: "concert-grand",
    intervals: [],
    triads: [],
    sevenths: [],
    directions: ["ascending", "harmonic"],
    presentations: ["harmonic"],
    modes: input.preset === "visual" ? ["staff"] : ["audio"],
    inversion: 0,
    inversions: [0],
    voicing: "closed",
    voicings: ["closed"],
    cadences: [],
  };
  if (input.preset === "intervals") {
    return { ...shared, intervals: ["m2", "M2", "m3", "M3", "P4", "P5", "P8"] };
  }
  if (input.preset === "triads") {
    return { ...shared, triads: ["major", "minor", "diminished", "augmented"] };
  }
  if (input.preset === "sevenths") {
    return {
      ...shared,
      sevenths: ["major7", "dominant7", "minor7", "halfDiminished7", "diminished7", "minorMajor7", "augmented7"],
    };
  }
  if (input.preset === "mixed") {
    return { ...shared, intervals: ["m3", "M3", "P4", "P5", "P8"], triads: ["major", "minor", "diminished", "augmented"] };
  }
  if (input.preset === "visual") {
    return { ...shared, intervals: ["m3", "M3", "P4", "P5", "P8"], triads: ["major", "minor", "diminished"] };
  }
  return { ...shared, cadences: ["plagalMajor", "authenticMajor", "plagalMinor", "authenticMinor"] };
}

export interface StoredBattleQuestion {
  questionIndex: number;
  stimulus: BattleStimulus;
  correctAnswer: string;
}

export function battleQuestions(input: { preset: BattlePreset; count: number; seed: string }): StoredBattleQuestion[] {
  return generateSession(battleSettings(input)).map((question, questionIndex) => ({
    questionIndex,
    stimulus: stimulusOf(question),
    correctAnswer: correctAnswerOf(question),
  }));
}

function correctAnswerOf(question: Question): string {
  if (question.type === "interval") return question.interval;
  if (question.type === "chord") return question.quality;
  return question.cadenceId;
}

function stimulusOf(question: Question): BattleStimulus {
  return {
    type: question.type,
    mode: question.mode,
    notes: question.notes,
    playback: question.playback,
    spelled: question.spelled,
    spelledChords: question.type === "cadence" ? question.spelledChords : undefined,
    answerChoices: question.answerChoices,
    pianoInstrumentId: question.pianoInstrumentId,
    hint: hintFor(question),
  };
}

function hintFor(question: Question): string {
  if (question.mode === "staff") return "On the staff";
  if (question.mode === "piano") return "On the keys";
  if (question.type === "cadence") return "Two chords";
  if (question.type === "interval" && question.direction === "ascending") return "Rising";
  if (question.type === "interval" && question.direction === "descending") return "Falling";
  return "Together";
}
