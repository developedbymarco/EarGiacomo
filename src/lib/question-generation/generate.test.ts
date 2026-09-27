import { Chord } from "@tonaljs/tonal";
import { describe, expect, it } from "vitest";
import {
  INTERVAL_QUALITIES,
  SEVENTH_QUALITIES,
  candidateRoots,
  chordOffsets,
  closedVoicing,
  formatDisplay,
  openVoicing,
  parseSpelled,
  realizeChord,
  semitonesOf,
  spellInterval,
} from "@/lib/music-theory";
import { CURRICULUM_NODES } from "@/lib/curriculum/seed";
import { lessonToSettings } from "@/lib/curriculum/progress";
import { generateSession, rangeProblem, type PracticeSettings } from "@/lib/question-generation/generate";
import { realizeCadence } from "@/lib/music-theory/cadences";
import { intervalGuidance } from "@/lib/question-generation/labels";

const EXPECTED_SEMITONES: Record<(typeof INTERVAL_QUALITIES)[number], number> = {
  P1: 0,
  m2: 1,
  M2: 2,
  m3: 3,
  M3: 4,
  P4: 5,
  A4: 6,
  P5: 7,
  m6: 8,
  M6: 9,
  m7: 10,
  M7: 11,
  P8: 12,
  m9: 13,
  M9: 14,
  m10: 15,
  M10: 16,
  P11: 17,
  A11: 18,
  P12: 19,
  m13: 20,
  M13: 21,
  m14: 22,
  M14: 23,
  P15: 24,
};

function settings(overrides: Partial<PracticeSettings> = {}): PracticeSettings {
  return {
    seed: "eargiacomo",
    count: 6,
    rangeLow: 48,
    rangeHigh: 84,
    pianoInstrumentId: "concert-grand",
    intervals: ["m2", "M2", "m3", "M3", "P4", "P5", "P8"],
    triads: ["major", "minor", "diminished", "augmented"],
    sevenths: [],
    directions: ["ascending", "descending", "harmonic"],
    presentations: ["harmonic", "melodicAscending", "melodicDescending"],
    modes: ["audio", "staff", "piano"],
    inversion: 0,
    voicing: "closed",
    ...overrides,
  };
}

describe("intervals", () => {
  it("maps every interval through the 15th", () => {
    for (const interval of INTERVAL_QUALITIES) {
      expect(semitonesOf(interval)).toBe(EXPECTED_SEMITONES[interval]);
    }
  });

  it("spells a minor third with a flat, not a sharp", () => {
    const upper = spellInterval(parseSpelled("C4"), "m3");
    expect(formatDisplay(upper)).toBe("E♭4");
  });

  it("spells a major tenth and a perfect fifteenth", () => {
    expect(formatDisplay(spellInterval(parseSpelled("C4"), "M10"))).toBe("E5");
    expect(formatDisplay(spellInterval(parseSpelled("C4"), "P15"))).toBe("C6");
    expect(formatDisplay(spellInterval(parseSpelled("Bb3"), "M3"))).toBe("D4");
  });
});

describe("chords", () => {
  it("builds the required triads and sevenths", () => {
    expect(chordOffsets("major")).toEqual([0, 4, 7]);
    expect(chordOffsets("minor")).toEqual([0, 3, 7]);
    expect(chordOffsets("diminished")).toEqual([0, 3, 6]);
    expect(chordOffsets("augmented")).toEqual([0, 4, 8]);
    expect(chordOffsets("major7")).toEqual([0, 4, 7, 11]);
    expect(chordOffsets("dominant7")).toEqual([0, 4, 7, 10]);
    expect(chordOffsets("minor7")).toEqual([0, 3, 7, 10]);
    expect(chordOffsets("halfDiminished7")).toEqual([0, 3, 6, 10]);
    expect(chordOffsets("diminished7")).toEqual([0, 3, 6, 9]);
    expect(chordOffsets("minorMajor7")).toEqual([0, 3, 7, 11]);
    expect(chordOffsets("augmented7")).toEqual([0, 4, 8, 10]);
  });

  it("does not include an augmented major seventh", () => {
    expect(SEVENTH_QUALITIES).not.toContain("augmentedMajor7");
    expect(Chord.get("augmaj7").empty).toBe(true);
    expect(chordOffsets("augmented7")).not.toContain(11);
  });

  it("spells C minor as C E♭ G", () => {
    const notes = realizeChord(parseSpelled("C4"), "minor", 0, "closed", 48, 76);
    expect(notes?.map(formatDisplay)).toEqual(["C4", "E♭4", "G4"]);
  });

  it("spells a diminished seventh with a double flat", () => {
    const notes = realizeChord(parseSpelled("C4"), "diminished7", 0, "closed", 48, 76);
    expect(notes?.map(formatDisplay)).toEqual(["C4", "E♭4", "G♭4", "B𝄫4"]);
  });

  it("rotates inversions without leaving an octave", () => {
    expect(closedVoicing(60, [0, 4, 7], 1)).toEqual([64, 67, 72]);
    expect(closedVoicing(60, [0, 4, 7], 2)).toEqual([67, 72, 76]);
    const thirdInversion = closedVoicing(60, [0, 4, 7, 10], 3);
    expect(thirdInversion[0]! - 60).toBe(10);
    expect(Math.max(...thirdInversion) - Math.min(...thirdInversion)).toBeLessThan(12);
  });

  it("opens a triad by more than an octave and keeps the bass", () => {
    const closed = closedVoicing(60, [0, 4, 7], 0);
    const opened = openVoicing(closed, 36, 96);
    expect(opened?.[0]).toBe(60);
    expect(opened).toEqual([60, 64, 79]);
    expect(Math.max(...opened!) - Math.min(...opened!)).toBeGreaterThan(12);
  });
});

describe("question generation", () => {
  it("repeats a seed exactly", () => {
    const first = generateSession(settings());
    const second = generateSession(settings());
    expect(second).toEqual(first);
  });

  it("keeps every note inside the range and the answer inside the choices", () => {
    const session = settings({ count: 20, rangeLow: 53, rangeHigh: 77 });
    for (const question of generateSession(session)) {
      expect(question.notes.every((note) => note >= 53 && note <= 77)).toBe(true);
      if (question.type === "interval") {
        expect(question.answerChoices).toContain(question.interval);
        expect(question.spelled.join(" ")).not.toMatch(/𝄫|𝄪/);
      } else if (question.type === "chord") {
        expect(question.answerChoices).toContain(question.quality);
        if (question.quality !== "diminished7") {
          expect(question.spelled.join(" ")).not.toMatch(/𝄫|𝄪/);
        }
        expect(question.inversion).toBe(0);
        expect(question.voicing).toBe("closed");
      }
    }
  });

  it("plays descending intervals from the top note", () => {
    const [question] = generateSession(
      settings({
        seed: "descending",
        count: 1,
        intervals: ["m3", "M3"],
        triads: [],
        directions: ["descending"],
        modes: ["audio"],
      }),
    );
    expect(question?.type).toBe("interval");
    if (question?.type === "interval") {
      expect(question.playback[0]).toEqual([question.notes[1]]);
      expect(question.playback[1]).toEqual([question.notes[0]]);
    }
  });

  it("plays harmonic questions as one group", () => {
    const [question] = generateSession(
      settings({
        seed: "harmonic",
        count: 1,
        intervals: [],
        triads: ["major", "minor"],
        presentations: ["harmonic"],
        modes: ["staff"],
      }),
    );
    expect(question?.type).toBe("chord");
    if (question?.type === "chord") {
      expect(question.playback).toEqual([question.notes]);
    }
  });

  it("refuses a range that cannot hold a perfect octave", () => {
    const problem = rangeProblem(
      settings({
        intervals: ["P8", "P5"],
        triads: [],
        rangeLow: 60,
        rangeHigh: 70,
      }),
    );
    expect(problem).toMatch(/needs 12/);
  });

  it("voices open triads and seventh inversions inside the range", () => {
    const opened = generateSession(
      settings({
        seed: "open",
        count: 4,
        intervals: [],
        triads: ["major", "minor"],
        voicing: "open",
        modes: ["piano"],
        rangeLow: 36,
        rangeHigh: 96,
      }),
    );
    for (const question of opened) {
      expect(question.type).toBe("chord");
      if (question.type === "chord") {
        expect(Math.max(...question.notes) - Math.min(...question.notes)).toBeGreaterThan(12);
        expect(question.notes.every((note) => note >= 36 && note <= 96)).toBe(true);
      }
    }

    const inverted = generateSession(
      settings({
        seed: "sevenths",
        count: 4,
        intervals: [],
        triads: [],
        sevenths: ["dominant7", "diminished7"],
        inversion: 3,
        rangeLow: 36,
        rangeHigh: 96,
      }),
    );
    for (const question of inverted) {
      expect(question.type).toBe("chord");
      if (question.type === "chord") {
        expect((question.notes[0]! - question.rootMidi) % 12).toBe(
          question.quality === "dominant7" ? 10 : 9,
        );
      }
    }
  });

  it("mixes inversions and spells cadences without double accidentals", () => {
    const mixed = generateSession(
      settings({
        seed: "mix-inversions",
        count: 24,
        intervals: [],
        triads: ["major", "minor"],
        inversions: [0, 1, 2],
        rangeLow: 36,
        rangeHigh: 96,
      }),
    );
    const inversions = new Set(mixed.flatMap((question) => (question.type === "chord" ? [question.inversion] : [])));
    expect(inversions.size).toBeGreaterThan(1);

    const cadences = generateSession(
      settings({
        seed: "cadences",
        count: 8,
        intervals: [],
        triads: [],
        cadences: ["plagalMajor", "authenticMajor", "plagalMinor", "authenticMinor"],
        modes: ["audio"],
        rangeLow: 48,
        rangeHigh: 84,
      }),
    );
    expect(cadences.every((question) => question.type === "cadence")).toBe(true);
    for (const question of cadences) {
      if (question.type !== "cadence") continue;
      expect(question.playback).toHaveLength(2);
      expect(question.answerChoices[0]).toBe("plagalMajor");
      expect(question.spelled.join(" ")).not.toMatch(/𝄫|𝄪/);
    }
    expect(realizeCadence(parseSpelled("C4"), "plagalMinor", 48, 84)?.[0]?.map(formatDisplay)).toEqual(["F4", "A♭4", "C5"]);
  });

  it("can ask a question from every lesson", () => {
    for (const node of CURRICULUM_NODES) {
      const lesson = lessonToSettings(node.config, node.slug, null);
      expect(rangeProblem(lesson), node.slug).toBeNull();
      expect(generateSession({ ...lesson, count: 2 })).toHaveLength(2);
    }
  });

  it("offers both enharmonic spellings of the same piano key", () => {
    const roots = candidateRoots(61, 61).map(formatDisplay);
    expect(roots).toContain("C♯4");
    expect(roots).toContain("D♭4");
  });
});

describe("guidance", () => {
  it("describes a major third as one semitone wider", () => {
    expect(intervalGuidance("M3", "m3")).toBe(
      "The major 3rd is one semitone wider than the minor 3rd.",
    );
  });
});
