import type { ChordPresentation, Direction, IntervalQuality, SeventhQuality, StimulusMode, TriadQuality, VoicingKind } from "@/lib/music-theory/types";
import type { PracticeSettings } from "@/lib/question-generation/generate";

export const PRACTICE_STORAGE_KEY = "eargiacomo.practiceSettings";
export const SESSION_STORAGE_KEY = "eargiacomo.session";
export const SESSION_META_KEY = "eargiacomo.sessionMeta";

export interface SessionMeta {
  mode: "practice" | "guided" | "review" | "exam";
  nodeSlug: string | null;
}

export const PIANO_PRESETS = [
  { id: "concert-grand", name: "Concert Grand", description: "Clear and neutral." },
  { id: "warm-felt", name: "Warm Felt", description: "Soft and intimate. Same samples, a darker filter." },
  { id: "bright-classical", name: "Bright Classical", description: "Defined upper register. Same samples, a brighter touch." },
] as const;

export const CONCERT_GRAND = PIANO_PRESETS[0];

export const RANGE_PRESETS = [
  { id: "low", label: "Low", low: 36, high: 60 },
  { id: "middle", label: "Middle", low: 48, high: 72 },
  { id: "high", label: "High", low: 60, high: 84 },
  { id: "full", label: "Full piano", low: 36, high: 84 },
] as const;

export const QUESTION_COUNTS = [5, 10, 15, 20, 30] as const;

export interface PracticeDraft {
  count: number;
  rangeLow: number;
  rangeHigh: number;
  intervals: IntervalQuality[];
  triads: TriadQuality[];
  sevenths: SeventhQuality[];
  directions: Direction[];
  presentations: ChordPresentation[];
  modes: StimulusMode[];
  pianoId: string;
  voicing: VoicingKind;
  mixedInversions: boolean;
}

export const DEFAULT_DRAFT: PracticeDraft = {
  count: 10,
  rangeLow: 48,
  rangeHigh: 72,
  intervals: ["m2", "M2", "m3", "M3"],
  triads: [],
  sevenths: [],
  directions: ["ascending"],
  presentations: ["harmonic"],
  modes: ["audio"],
  pianoId: CONCERT_GRAND.id,
  voicing: "closed",
  mixedInversions: false,
};

export function toSettings(draft: PracticeDraft, seed: string): PracticeSettings {
  const seventhsOnly = draft.sevenths.length >= 2 && draft.triads.length < 2;
  return {
    seed,
    count: draft.count,
    rangeLow: draft.rangeLow,
    rangeHigh: draft.rangeHigh,
    pianoInstrumentId: draft.pianoId || CONCERT_GRAND.id,
    intervals: draft.intervals,
    triads: draft.triads,
    sevenths: draft.sevenths,
    directions: draft.directions,
    presentations: draft.presentations,
    modes: draft.modes,
    inversion: 0,
    inversions: draft.mixedInversions ? (seventhsOnly ? [0, 1, 2, 3] : [0, 1, 2]) : [0],
    voicing: draft.voicing,
    voicings: [draft.voicing],
  };
}

export function loadDraft(): PracticeDraft {
  if (typeof window === "undefined") return DEFAULT_DRAFT;
  try {
    const raw = window.localStorage.getItem(PRACTICE_STORAGE_KEY);
    if (!raw) return DEFAULT_DRAFT;
    const parsed = JSON.parse(raw) as PracticeDraft;
    if (!parsed || !Array.isArray(parsed.intervals) || !Array.isArray(parsed.modes)) return DEFAULT_DRAFT;
    return {
      ...DEFAULT_DRAFT,
      ...parsed,
      sevenths: Array.isArray(parsed.sevenths) ? parsed.sevenths : [],
      pianoId: typeof parsed.pianoId === "string" ? parsed.pianoId : DEFAULT_DRAFT.pianoId,
      voicing: parsed.voicing === "open" ? "open" : "closed",
      mixedInversions: Boolean(parsed.mixedInversions),
    };
  } catch {
    return DEFAULT_DRAFT;
  }
}

export function saveDraft(draft: PracticeDraft): void {
  window.localStorage.setItem(PRACTICE_STORAGE_KEY, JSON.stringify(draft));
}

export function saveSession(settings: PracticeSettings, meta: SessionMeta = { mode: "practice", nodeSlug: null }): void {
  window.sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(settings));
  window.sessionStorage.setItem(SESSION_META_KEY, JSON.stringify(meta));
}

export function loadSessionMeta(): SessionMeta {
  if (typeof window === "undefined") return { mode: "practice", nodeSlug: null };
  try {
    const raw = window.sessionStorage.getItem(SESSION_META_KEY);
    if (!raw) return { mode: "practice", nodeSlug: null };
    const parsed = JSON.parse(raw) as SessionMeta;
    if (parsed?.mode === "guided" || parsed?.mode === "review" || parsed?.mode === "practice" || parsed?.mode === "exam") {
      return { mode: parsed.mode, nodeSlug: parsed.nodeSlug ?? null };
    }
  } catch {
    return { mode: "practice", nodeSlug: null };
  }
  return { mode: "practice", nodeSlug: null };
}

export function loadSession(): PracticeSettings | null {
  try {
    const raw = window.sessionStorage.getItem(SESSION_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as PracticeSettings;
  } catch {
    return null;
  }
}
