import { unlockCostFor } from "@/lib/economy/rewards";
import type { LessonConfig } from "@/lib/curriculum/types";
import type { CurriculumNode, PathId } from "@/lib/curriculum/seed";
import type { ChordQuality, IntervalQuality, VoicingKind } from "@/lib/music-theory/types";

const listen = ["audio"] as const;
const look = ["staff", "piano"] as const;
const intervalDirections = ["ascending", "descending", "harmonic"] as const;
const chordPresentations = ["harmonic", "melodicAscending", "melodicDescending"] as const;

let serial = 15;

function nodeId(): string {
  const id = `c1000001-0000-4000-8000-${serial.toString(16).padStart(12, "0")}`;
  serial += 1;
  return id;
}

function keys(prefix: "interval" | "chord" | "cadence", values: readonly string[]): string[] {
  return values.map((value) => `${prefix}:${value}`);
}

function intervalConfig(
  slug: string,
  title: string,
  intervals: IntervalQuality[],
  stimulus: LessonConfig["stimulus"],
  min = 48,
  max = 84,
): LessonConfig {
  return {
    slug,
    title,
    exerciseType: stimulus.includes("audio") ? "interval-identification" : "visual-interval",
    intervals,
    presentation: [...intervalDirections],
    inversions: [0],
    voicing: ["closed"],
    pitchRange: { min, max },
    questions: 10,
    stimulus,
  };
}

function chordConfig(
  slug: string,
  title: string,
  qualities: ChordQuality[],
  stimulus: LessonConfig["stimulus"],
  inversions: number[],
  voicing: VoicingKind[],
  min = 48,
  max = 84,
): LessonConfig {
  return {
    slug,
    title,
    exerciseType: stimulus.includes("audio") ? "chord-identification" : "visual-chord",
    qualities,
    presentation: [...chordPresentations],
    inversions,
    voicing,
    pitchRange: { min, max },
    questions: 10,
    stimulus,
  };
}

function cadenceConfig(slug: string, title: string, cadences: string[], stimulus: LessonConfig["stimulus"]): LessonConfig {
  return {
    slug,
    title,
    exerciseType: stimulus.includes("audio") ? "cadence-identification" : "visual-cadence",
    cadences,
    presentation: ["harmonic"],
    inversions: [0],
    voicing: ["closed"],
    pitchRange: { min: 48, max: 84 },
    questions: 10,
    stimulus,
  };
}

function lesson(input: {
  slug: string;
  title: string;
  description: string;
  category: CurriculumNode["category"];
  path: PathId;
  difficulty: number;
  sortOrder: number;
  concepts: string[];
  prerequisites: string[];
  config: LessonConfig;
}): CurriculumNode {
  return {
    id: nodeId(),
    unlockCost: unlockCostFor(input),
    xpReward: 10,
    ...input,
  };
}

const intervalLessons: Array<{
  slug: string;
  title: string;
  description: string;
  intervals: IntervalQuality[];
  min?: number;
  max?: number;
}> = [
  {
    slug: "sixths",
    title: "Major and minor sixths",
    description: "Tell a minor sixth from a major sixth by ear.",
    intervals: ["m6", "M6"],
  },
  {
    slug: "interval-sevenths",
    title: "Major and minor sevenths",
    description: "Tell a minor seventh from a major seventh by ear.",
    intervals: ["m7", "M7"],
  },
  {
    slug: "tritone",
    title: "The tritone",
    description: "The augmented fourth sits between the perfect fourth and the perfect fifth.",
    intervals: ["P4", "A4", "P5"],
  },
  {
    slug: "ninths",
    title: "Major and minor ninths",
    description: "Compound seconds, past the octave.",
    intervals: ["m9", "M9"],
    min: 36,
    max: 96,
  },
  {
    slug: "tenths",
    title: "Major and minor tenths",
    description: "Compound thirds.",
    intervals: ["m10", "M10"],
    min: 36,
    max: 96,
  },
  {
    slug: "compound-perfect",
    title: "Elevenths and twelfths",
    description: "The perfect eleventh and the perfect twelfth.",
    intervals: ["P11", "P12"],
    min: 36,
    max: 96,
  },
  {
    slug: "thirteenths",
    title: "Major and minor thirteenths",
    description: "Compound sixths.",
    intervals: ["m13", "M13"],
    min: 36,
    max: 96,
  },
  {
    slug: "to-the-fifteenth",
    title: "To the fifteenth",
    description: "Fourteenths and the perfect fifteenth.",
    intervals: ["m14", "M14", "P15"],
    min: 36,
    max: 96,
  },
];

const chordLessons: Array<{
  slug: string;
  title: string;
  description: string;
  qualities: ChordQuality[];
  inversions: number[];
  voicing: VoicingKind[];
  min?: number;
  max?: number;
}> = [
  {
    slug: "triad-inversions",
    title: "Triads in inversion",
    description: "Major and minor triads in root position, first inversion, and second inversion.",
    qualities: ["major", "minor"],
    inversions: [0, 1, 2],
    voicing: ["closed"],
  },
  {
    slug: "open-triads",
    title: "Open triads",
    description: "The four triads, spread wider than an octave.",
    qualities: ["major", "minor", "augmented", "diminished"],
    inversions: [0],
    voicing: ["open"],
    min: 36,
    max: 96,
  },
  {
    slug: "major-dominant-sevenths",
    title: "Major and dominant sevenths",
    description: "A major seventh against a dominant seventh.",
    qualities: ["major7", "dominant7"],
    inversions: [0],
    voicing: ["closed"],
  },
  {
    slug: "minor-sevenths",
    title: "Minor sevenths",
    description: "The minor seventh joins the major seventh and the dominant seventh.",
    qualities: ["minor7", "major7", "dominant7"],
    inversions: [0],
    voicing: ["closed"],
  },
  {
    slug: "diminished-sevenths",
    title: "Diminished sevenths",
    description: "Half-diminished and diminished sevenths, beside the minor seventh.",
    qualities: ["halfDiminished7", "diminished7", "minor7"],
    inversions: [0],
    voicing: ["closed"],
  },
  {
    slug: "color-sevenths",
    title: "Color sevenths",
    description: "Minor-major and augmented sevenths join the common seventh chords.",
    qualities: ["minorMajor7", "augmented7", "major7", "dominant7"],
    inversions: [0],
    voicing: ["closed"],
  },
  {
    slug: "seventh-inversions",
    title: "Sevenths in inversion",
    description: "Major and dominant sevenths in every inversion.",
    qualities: ["major7", "dominant7"],
    inversions: [0, 1, 2, 3],
    voicing: ["closed"],
    min: 36,
    max: 96,
  },
];

const cadenceLessons: Array<{
  slug: string;
  title: string;
  description: string;
  cadences: string[];
  stimulus: LessonConfig["stimulus"];
  difficulty: number;
  prerequisites: string[];
}> = [
  {
    slug: "cadence-major",
    title: "IV – I and V – I",
    description: "Two major cadences: the fourth degree to the tonic, and the fifth degree to the tonic.",
    cadences: ["plagalMajor", "authenticMajor"],
    stimulus: [...listen],
    difficulty: 1,
    prerequisites: [],
  },
  {
    slug: "cadence-minor",
    title: "iv – i and V – i",
    description: "The same two families in a minor key. The dominant stays major.",
    cadences: ["plagalMinor", "authenticMinor"],
    stimulus: [...listen],
    difficulty: 2,
    prerequisites: ["cadence-major"],
  },
  {
    slug: "cadence-seventh",
    title: "V7 – I",
    description: "The dominant seventh cadence beside a plain V – I.",
    cadences: ["dominantSeventh", "authenticMajor"],
    stimulus: [...listen],
    difficulty: 3,
    prerequisites: ["cadence-minor"],
  },
  {
    slug: "cadence-sixth",
    title: "V6 – I",
    description: "The dominant in first inversion, beside root-position V – I.",
    cadences: ["dominantSix", "authenticMajor"],
    stimulus: [...listen],
    difficulty: 4,
    prerequisites: ["cadence-seventh"],
  },
  {
    slug: "cadence-on-the-staff",
    title: "Cadences on the staff",
    description: "Name a major cadence from the notes on the staff.",
    cadences: ["plagalMajor", "authenticMajor"],
    stimulus: ["staff"],
    difficulty: 4,
    prerequisites: ["cadence-sixth"],
  },
];

function buildIntervals(): CurriculumNode[] {
  let previous = "through-the-octave";
  return intervalLessons.map((item, index) => {
    const node = lesson({
      slug: item.slug,
      title: item.title,
      description: item.description,
      category: "interval",
      path: "intervals",
      difficulty: 4,
      sortOrder: 50 + index * 10,
      concepts: keys("interval", item.intervals),
      prerequisites: [previous],
      config: intervalConfig(item.slug, item.title, item.intervals, [...listen], item.min, item.max),
    });
    previous = item.slug;
    return node;
  });
}

function buildChords(): CurriculumNode[] {
  let previous = "four-triads";
  return chordLessons.map((item, index) => {
    const node = lesson({
      slug: item.slug,
      title: item.title,
      description: item.description,
      category: "chord",
      path: "chords",
      difficulty: 4,
      sortOrder: 40 + index * 10,
      concepts: keys("chord", item.qualities),
      prerequisites: [previous],
      config: chordConfig(item.slug, item.title, item.qualities, [...listen], item.inversions, item.voicing, item.min, item.max),
    });
    previous = item.slug;
    return node;
  });
}

function buildVisual(): CurriculumNode[] {
  let previousVisual = "visual-four-triads";
  const intervalVisual = intervalLessons.map((item, index) => {
    const node = lesson({
      slug: `visual-${item.slug}`,
      title: `${item.title} on the page`,
      description: "Name it on the staff or on the lit keys.",
      category: "visual_interval",
      path: "visual",
      difficulty: 4,
      sortOrder: 80 + index * 10,
      concepts: keys("interval", item.intervals),
      prerequisites: [item.slug, previousVisual],
      config: intervalConfig(`visual-${item.slug}`, `${item.title} on the page`, item.intervals, [...look], item.min, item.max),
    });
    previousVisual = node.slug;
    return node;
  });
  const chordVisualSource = chordLessons.filter((item) =>
    ["triad-inversions", "open-triads", "major-dominant-sevenths"].includes(item.slug),
  );
  const chordVisual = chordVisualSource.map((item, index) => {
    const node = lesson({
      slug: `visual-${item.slug}`,
      title: `${item.title} on the page`,
      description: "Name it on the staff or on the lit keys.",
      category: "visual_chord",
      path: "visual",
      difficulty: 4,
      sortOrder: 160 + index * 10,
      concepts: keys("chord", item.qualities),
      prerequisites: [item.slug, previousVisual],
      config: chordConfig(
        `visual-${item.slug}`,
        `${item.title} on the page`,
        item.qualities,
        [...look],
        item.inversions,
        item.voicing,
        item.min,
        item.max,
      ),
    });
    previousVisual = node.slug;
    return node;
  });
  return [...intervalVisual, ...chordVisual];
}

function buildCadences(): CurriculumNode[] {
  return cadenceLessons.map((item, index) =>
    lesson({
      slug: item.slug,
      title: item.title,
      description: item.description,
      category: "cadence",
      path: "cadences",
      difficulty: item.difficulty,
      sortOrder: 10 + index * 10,
      concepts: keys("cadence", item.cadences),
      prerequisites: item.prerequisites,
      config: cadenceConfig(item.slug, item.title, item.cadences, item.stimulus),
    }),
  );
}

const intervalNodes = buildIntervals();
const chordNodes = buildChords();

export const DEPTH_NODES: CurriculumNode[] = [
  ...intervalNodes,
  ...chordNodes,
  ...buildVisual(),
  ...buildCadences(),
];
