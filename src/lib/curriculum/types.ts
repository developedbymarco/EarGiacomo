import type { ChordQuality, IntervalQuality, VoicingKind } from "@/lib/music-theory/types";

export interface LessonConfig {
  slug: string;
  title: string;
  exerciseType:
    | "interval-identification"
    | "chord-identification"
    | "visual-interval"
    | "visual-chord"
    | "cadence-identification"
    | "visual-cadence";
  intervals?: IntervalQuality[];
  qualities?: ChordQuality[];
  cadences?: string[];
  presentation: string[];
  inversions: number[];
  voicing: VoicingKind[];
  pitchRange: { min: number; max: number };
  questions: number;
  stimulus: Array<"audio" | "staff" | "piano">;
}
