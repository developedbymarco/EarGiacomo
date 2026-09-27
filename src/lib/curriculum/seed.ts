import { DEPTH_NODES } from "@/lib/curriculum/depth";
import type { LessonConfig } from "@/lib/curriculum/types";

export const PATHS = [
  {
    id: "intervals",
    title: "Intervals",
    lede: "Name the distance you hear.",
  },
  {
    id: "chords",
    title: "Chords",
    lede: "Name the chord you hear, in root position or inversion.",
  },
  {
    id: "visual",
    title: "Visual",
    lede: "Name what is written, or what the piano lights up.",
  },
  {
    id: "cadences",
    title: "Cadences",
    lede: "Name cadences from the IV – I and V – I families.",
  },
] as const;

export type PathId = (typeof PATHS)[number]["id"];

export interface CurriculumNode {
  id: string;
  slug: string;
  title: string;
  description: string;
  category: "interval" | "chord" | "visual_interval" | "visual_chord" | "cadence";
  path: PathId;
  difficulty: number;
  unlockCost: number;
  xpReward: number;
  sortOrder: number;
  concepts: string[];
  prerequisites: string[];
  config: LessonConfig;
}

const listen = ["audio"] as const;
const look = ["staff", "piano"] as const;
const intervalDirections = ["ascending", "descending", "harmonic"] as const;
const chordPresentations = ["harmonic", "melodicAscending", "melodicDescending"] as const;

function intervalLesson(
  slug: string,
  title: string,
  intervals: LessonConfig["intervals"],
  stimulus: LessonConfig["stimulus"],
  max = 72,
): LessonConfig {
  return {
    slug,
    title,
    exerciseType: stimulus.includes("audio") ? "interval-identification" : "visual-interval",
    intervals,
    presentation: [...intervalDirections],
    inversions: [0],
    voicing: ["closed"],
    pitchRange: { min: 48, max },
    questions: 10,
    stimulus,
  };
}

function triadLesson(
  slug: string,
  title: string,
  qualities: LessonConfig["qualities"],
  stimulus: LessonConfig["stimulus"],
): LessonConfig {
  return {
    slug,
    title,
    exerciseType: stimulus.includes("audio") ? "chord-identification" : "visual-chord",
    qualities,
    presentation: [...chordPresentations],
    inversions: [0],
    voicing: ["closed"],
    pitchRange: { min: 48, max: 72 },
    questions: 10,
    stimulus,
  };
}

function keys(prefix: "interval" | "chord", values: readonly string[]): string[] {
  return values.map((value) => `${prefix}:${value}`);
}

export const FOUNDATION_SLUGS = [
  "seconds",
  "thirds",
  "seconds-and-thirds",
  "through-the-octave",
  "major-minor-triads",
  "add-augmented",
  "four-triads",
  "visual-seconds",
  "visual-thirds",
  "visual-seconds-and-thirds",
  "visual-through-the-octave",
  "visual-major-minor",
  "visual-augmented",
  "visual-four-triads",
] as const;

const FOUNDATION_NODES: CurriculumNode[] = [
  {
    id: "c1000001-0000-4000-8000-000000000001",
    slug: "seconds",
    title: "Major and minor seconds",
    description: "Tell a minor second from a major second by ear.",
    category: "interval",
    path: "intervals",
    difficulty: 1,
    unlockCost: 0,
    xpReward: 10,
    sortOrder: 10,
    concepts: keys("interval", ["m2", "M2"]),
    prerequisites: [],
    config: intervalLesson("seconds", "Major and minor seconds", ["m2", "M2"], [...listen]),
  },
  {
    id: "c1000001-0000-4000-8000-000000000002",
    slug: "thirds",
    title: "Major and minor thirds",
    description: "Tell a minor third from a major third by ear.",
    category: "interval",
    path: "intervals",
    difficulty: 2,
    unlockCost: 40,
    xpReward: 10,
    sortOrder: 20,
    concepts: keys("interval", ["m3", "M3"]),
    prerequisites: ["seconds"],
    config: intervalLesson("thirds", "Major and minor thirds", ["m3", "M3"], [...listen]),
  },
  {
    id: "c1000001-0000-4000-8000-000000000003",
    slug: "seconds-and-thirds",
    title: "Seconds and thirds",
    description: "The four intervals, mixed.",
    category: "interval",
    path: "intervals",
    difficulty: 3,
    unlockCost: 60,
    xpReward: 10,
    sortOrder: 30,
    concepts: keys("interval", ["m2", "M2", "m3", "M3"]),
    prerequisites: ["thirds"],
    config: intervalLesson("seconds-and-thirds", "Seconds and thirds", ["m2", "M2", "m3", "M3"], [...listen]),
  },
  {
    id: "c1000001-0000-4000-8000-000000000004",
    slug: "through-the-octave",
    title: "Through the octave",
    description: "Add the perfect fourth, fifth, and octave.",
    category: "interval",
    path: "intervals",
    difficulty: 4,
    unlockCost: 80,
    xpReward: 10,
    sortOrder: 40,
    concepts: keys("interval", ["m2", "M2", "m3", "M3", "P4", "P5", "P8"]),
    prerequisites: ["seconds-and-thirds"],
    config: intervalLesson(
      "through-the-octave",
      "Through the octave",
      ["m2", "M2", "m3", "M3", "P4", "P5", "P8"],
      [...listen],
      84,
    ),
  },
  {
    id: "c1000001-0000-4000-8000-000000000005",
    slug: "major-minor-triads",
    title: "Major and minor triads",
    description: "Root-position major and minor triads.",
    category: "chord",
    path: "chords",
    difficulty: 1,
    unlockCost: 0,
    xpReward: 10,
    sortOrder: 10,
    concepts: keys("chord", ["major", "minor"]),
    prerequisites: [],
    config: triadLesson("major-minor-triads", "Major and minor triads", ["major", "minor"], [...listen]),
  },
  {
    id: "c1000001-0000-4000-8000-000000000006",
    slug: "add-augmented",
    title: "Add augmented",
    description: "Augmented joins major and minor.",
    category: "chord",
    path: "chords",
    difficulty: 2,
    unlockCost: 40,
    xpReward: 10,
    sortOrder: 20,
    concepts: keys("chord", ["major", "minor", "augmented"]),
    prerequisites: ["major-minor-triads"],
    config: triadLesson("add-augmented", "Add augmented", ["major", "minor", "augmented"], [...listen]),
  },
  {
    id: "c1000001-0000-4000-8000-000000000007",
    slug: "four-triads",
    title: "Four triads",
    description: "Diminished joins the other three triads.",
    category: "chord",
    path: "chords",
    difficulty: 3,
    unlockCost: 60,
    xpReward: 10,
    sortOrder: 30,
    concepts: keys("chord", ["major", "minor", "augmented", "diminished"]),
    prerequisites: ["add-augmented"],
    config: triadLesson("four-triads", "Four triads", ["major", "minor", "augmented", "diminished"], [...listen]),
  },
  {
    id: "c1000001-0000-4000-8000-000000000008",
    slug: "visual-seconds",
    title: "Seconds on the page",
    description: "Name seconds on the staff or on the lit keys.",
    category: "visual_interval",
    path: "visual",
    difficulty: 1,
    unlockCost: 30,
    xpReward: 10,
    sortOrder: 10,
    concepts: keys("interval", ["m2", "M2"]),
    prerequisites: ["seconds"],
    config: intervalLesson("visual-seconds", "Seconds on the page", ["m2", "M2"], [...look]),
  },
  {
    id: "c1000001-0000-4000-8000-000000000009",
    slug: "visual-thirds",
    title: "Thirds on the page",
    description: "Name thirds on the staff or on the lit keys.",
    category: "visual_interval",
    path: "visual",
    difficulty: 2,
    unlockCost: 40,
    xpReward: 10,
    sortOrder: 20,
    concepts: keys("interval", ["m3", "M3"]),
    prerequisites: ["thirds", "visual-seconds"],
    config: intervalLesson("visual-thirds", "Thirds on the page", ["m3", "M3"], [...look]),
  },
  {
    id: "c1000001-0000-4000-8000-00000000000a",
    slug: "visual-seconds-and-thirds",
    title: "Seconds and thirds on the page",
    description: "The four intervals, seen rather than heard.",
    category: "visual_interval",
    path: "visual",
    difficulty: 3,
    unlockCost: 60,
    xpReward: 10,
    sortOrder: 30,
    concepts: keys("interval", ["m2", "M2", "m3", "M3"]),
    prerequisites: ["seconds-and-thirds", "visual-thirds"],
    config: intervalLesson("visual-seconds-and-thirds", "Seconds and thirds on the page", ["m2", "M2", "m3", "M3"], [...look]),
  },
  {
    id: "c1000001-0000-4000-8000-00000000000b",
    slug: "visual-through-the-octave",
    title: "Through the octave on the page",
    description: "Fourths, fifths, and octaves, on the staff or the keys.",
    category: "visual_interval",
    path: "visual",
    difficulty: 4,
    unlockCost: 80,
    xpReward: 10,
    sortOrder: 40,
    concepts: keys("interval", ["m2", "M2", "m3", "M3", "P4", "P5", "P8"]),
    prerequisites: ["through-the-octave", "visual-seconds-and-thirds"],
    config: intervalLesson(
      "visual-through-the-octave",
      "Through the octave on the page",
      ["m2", "M2", "m3", "M3", "P4", "P5", "P8"],
      [...look],
      84,
    ),
  },
  {
    id: "c1000001-0000-4000-8000-00000000000c",
    slug: "visual-major-minor",
    title: "Triads on the page",
    description: "Major and minor triads, written or lit.",
    category: "visual_chord",
    path: "visual",
    difficulty: 2,
    unlockCost: 40,
    xpReward: 10,
    sortOrder: 50,
    concepts: keys("chord", ["major", "minor"]),
    prerequisites: ["major-minor-triads", "visual-through-the-octave"],
    config: triadLesson("visual-major-minor", "Triads on the page", ["major", "minor"], [...look]),
  },
  {
    id: "c1000001-0000-4000-8000-00000000000d",
    slug: "visual-augmented",
    title: "Augmented on the page",
    description: "Augmented joins major and minor, on the staff or the keys.",
    category: "visual_chord",
    path: "visual",
    difficulty: 3,
    unlockCost: 60,
    xpReward: 10,
    sortOrder: 60,
    concepts: keys("chord", ["major", "minor", "augmented"]),
    prerequisites: ["add-augmented", "visual-major-minor"],
    config: triadLesson("visual-augmented", "Augmented on the page", ["major", "minor", "augmented"], [...look]),
  },
  {
    id: "c1000001-0000-4000-8000-00000000000e",
    slug: "visual-four-triads",
    title: "Four triads on the page",
    description: "All four triads, seen rather than heard.",
    category: "visual_chord",
    path: "visual",
    difficulty: 4,
    unlockCost: 80,
    xpReward: 10,
    sortOrder: 70,
    concepts: keys("chord", ["major", "minor", "augmented", "diminished"]),
    prerequisites: ["four-triads", "visual-augmented"],
    config: triadLesson("visual-four-triads", "Four triads on the page", ["major", "minor", "augmented", "diminished"], [...look]),
  },
];

export const CURRICULUM_NODES: CurriculumNode[] = [...FOUNDATION_NODES, ...DEPTH_NODES];

export function isPathId(value: string): value is PathId {
  return PATHS.some((path) => path.id === value);
}
