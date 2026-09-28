"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { savePracticePreferences } from "@/app/auth/actions";
import { previewPiano, unlockAudio } from "@/lib/audio/engine";
import { FOUNDATION_INTERVALS, FOUNDATION_TRIADS } from "@/lib/curriculum/foundations";
import { useNoteNames } from "@/components/shell/NoteNames";
import { nameNotes } from "@/lib/music-theory/naming";
import { midiToNoteName, SELECTABLE_NOTES } from "@/lib/music-theory/notes";
import type { ChordPresentation, Direction, IntervalQuality, SeventhQuality, StimulusMode, TriadQuality } from "@/lib/music-theory/types";
import { SEVENTH_QUALITIES } from "@/lib/music-theory/types";
import { CHORD_LABELS, INTERVAL_LABELS } from "@/lib/question-generation/labels";
import { rangeProblem } from "@/lib/question-generation/generate";
import {
  DEFAULT_DRAFT,
  PIANO_PRESETS,
  QUESTION_COUNTS,
  RANGE_PRESETS,
  loadDraft,
  saveDraft,
  saveSession,
  toSettings,
  type PracticeDraft,
} from "@/lib/practice/settings";

const INTERVAL_PRESETS: Array<{ label: string; intervals: IntervalQuality[] }> = [
  { label: "Seconds", intervals: ["m2", "M2"] },
  { label: "Thirds", intervals: ["m3", "M3"] },
  { label: "Seconds and thirds", intervals: ["m2", "M2", "m3", "M3"] },
  { label: "Through the octave", intervals: ["m2", "M2", "m3", "M3", "P4", "P5", "P8"] },
  { label: "Sixths", intervals: ["m6", "M6"] },
  { label: "Sevenths", intervals: ["m7", "M7"] },
  { label: "Tritone", intervals: ["P4", "A4", "P5"] },
  { label: "Ninths", intervals: ["m9", "M9"] },
  { label: "To the fifteenth", intervals: ["m14", "M14", "P15"] },
];

const MORE_INTERVALS: IntervalQuality[] = ["A4", "m6", "M6", "m7", "M7", "m9", "M9", "m10", "M10", "P11", "P12", "m13", "M13", "m14", "M14", "P15"];

const INTERVAL_PLAYED: Array<{ id: string; label: string; values: Direction[] }> = [
  { id: "ascending", label: "Ascending", values: ["ascending"] },
  { id: "descending", label: "Descending", values: ["descending"] },
  { id: "melodic", label: "Melodic", values: ["ascending", "descending"] },
  { id: "harmonic", label: "Harmonic", values: ["harmonic"] },
  { id: "mixed", label: "Mixed", values: ["ascending", "descending", "harmonic"] },
];

const CHORD_PLAYED: Array<{ id: string; label: string; values: ChordPresentation[] }> = [
  { id: "ascending", label: "Ascending", values: ["melodicAscending"] },
  { id: "descending", label: "Descending", values: ["melodicDescending"] },
  { id: "melodic", label: "Melodic", values: ["melodicAscending", "melodicDescending"] },
  { id: "harmonic", label: "Harmonic", values: ["harmonic"] },
  { id: "mixed", label: "Mixed", values: ["harmonic", "melodicAscending", "melodicDescending"] },
];

const TRIAD_PRESETS: Array<{ label: string; triads: TriadQuality[] }> = [
  { label: "Major and minor", triads: ["major", "minor"] },
  { label: "Add augmented", triads: ["major", "minor", "augmented"] },
  { label: "Four triads", triads: ["major", "minor", "augmented", "diminished"] },
];

export function PracticeBuilder({
  signedIn = false,
  savedRangeLow = null,
  savedRangeHigh = null,
}: {
  signedIn?: boolean;
  savedRangeLow?: number | null;
  savedRangeHigh?: number | null;
}) {
  const router = useRouter();
  const noteNames = useNoteNames();
  const [draft, setDraft] = useState<PracticeDraft>(DEFAULT_DRAFT);
  const [customCount, setCustomCount] = useState(false);
  const [ready, setReady] = useState(false);
  const [previewing, setPreviewing] = useState(false);

  useEffect(() => {
    const saved = loadDraft();
    const next =
      savedRangeLow != null && savedRangeHigh != null
        ? { ...saved, rangeLow: savedRangeLow, rangeHigh: savedRangeHigh }
        : saved;
    // Saved settings live in localStorage, which is only readable after mount.
    // eslint-disable-next-line react-hooks/set-state-in-effect -- hydrate the practice form once
    setDraft(next);
    setCustomCount(!QUESTION_COUNTS.includes(next.count as (typeof QUESTION_COUNTS)[number]));
    setReady(true);
  }, [savedRangeLow, savedRangeHigh]);

  const problem = rangeProblem(toSettings(draft, "preview"));
  const ignored =
    draft.triads.length === 1
      ? "Add a second triad if you want chord questions."
      : draft.intervals.length === 1
        ? "Add a second interval if you want interval questions."
        : null;

  async function start() {
    if (problem) return;
    await unlockAudio();
    const settings = toSettings(draft, crypto.randomUUID());
    saveDraft(draft);
    if (signedIn) {
      try {
        await savePracticePreferences({
          rangeLow: draft.rangeLow,
          rangeHigh: draft.rangeHigh,
          pianoSlug: draft.pianoId,
        });
      } catch {
        // The session still starts from this browser if the account cannot be reached.
      }
    }
    saveSession(settings);
    router.push("/session");
  }

  async function preview() {
    setPreviewing(true);
    try {
      await unlockAudio();
      await previewPiano(draft.pianoId);
    } finally {
      setPreviewing(false);
    }
  }

  if (!ready) {
    return <p className="text-parchment">Opening your practice desk…</p>;
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-serif text-5xl text-cream">Practice</h1>
        <p className="mt-3 max-w-2xl text-lg text-parchment">
          Choose a small set of sounds, then name what you hear or what you see. The answer list stays in theory order.
        </p>
      </div>

      <section className="space-y-3 rounded-3xl border border-gold/30 bg-plum/70 p-5">
        <h2 className="font-serif text-3xl text-cream">Piano</h2>
        <p className="text-parchment">Three characters of the same sampled grand. Preview uses one short phrase.</p>
        <div className="flex flex-wrap gap-2">
          {PIANO_PRESETS.map((piano) => (
            <Button
              key={piano.id}
              type="button"
              variant={draft.pianoId === piano.id ? "gold" : "ghost"}
              onClick={() => setDraft({ ...draft, pianoId: piano.id })}
            >
              {piano.name}
            </Button>
          ))}
        </div>
        <p className="text-parchment">{PIANO_PRESETS.find((piano) => piano.id === draft.pianoId)?.description}</p>
        <Button variant="ghost" type="button" onClick={preview} disabled={previewing}>
          {previewing ? "Playing…" : "Preview"}
        </Button>
      </section>

      <section className="space-y-3">
        <h2 className="font-serif text-3xl">How the question appears</h2>
        <div className="flex flex-wrap gap-2">
          <Toggle
            checked={draft.modes.includes("audio")}
            label="Listen"
            onChange={() => setDraft(toggleMode(draft, "audio"))}
          />
          <Toggle
            checked={draft.modes.includes("staff")}
            label="Staff"
            onChange={() => setDraft(toggleMode(draft, "staff"))}
          />
          <Toggle
            checked={draft.modes.includes("piano")}
            label="Piano keys"
            onChange={() => setDraft(toggleMode(draft, "piano"))}
          />
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="font-serif text-3xl">Intervals</h2>
        <div className="flex flex-wrap gap-2">
          {INTERVAL_PRESETS.map((preset) => (
            <Button
              key={preset.label}
              type="button"
              variant="ghost"
              onClick={() => setDraft({ ...draft, intervals: preset.intervals })}
            >
              {preset.label}
            </Button>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {FOUNDATION_INTERVALS.map((interval) => (
            <Toggle
              key={interval}
              checked={draft.intervals.includes(interval)}
              label={INTERVAL_LABELS[interval]}
              onChange={() => setDraft(toggleInterval(draft, interval))}
            />
          ))}
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {MORE_INTERVALS.map((interval) => (
            <Toggle
              key={interval}
              checked={draft.intervals.includes(interval)}
              label={INTERVAL_LABELS[interval]}
              onChange={() => setDraft(toggleInterval(draft, interval))}
            />
          ))}
        </div>
        <div className="space-y-2">
          <p className="text-parchment">How it is played</p>
          <PlayedAs
            active={playedAsId(draft.directions, INTERVAL_PLAYED)}
            options={INTERVAL_PLAYED}
            onChoose={(directions) => setDraft({ ...draft, directions })}
          />
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="font-serif text-3xl">Triads</h2>
        <div className="flex flex-wrap gap-2">
          <Toggle
            checked={draft.voicing === "closed"}
            label="Closed"
            onChange={() => setDraft({ ...draft, voicing: "closed" })}
          />
          <Toggle
            checked={draft.voicing === "open"}
            label="Open"
            onChange={() => setDraft({ ...draft, voicing: "open" })}
          />
          <Toggle
            checked={draft.mixedInversions}
            label="Mix inversions"
            onChange={() => setDraft({ ...draft, mixedInversions: !draft.mixedInversions })}
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {TRIAD_PRESETS.map((preset) => (
            <Button
              key={preset.label}
              type="button"
              variant="ghost"
              onClick={() => setDraft({ ...draft, triads: preset.triads })}
            >
              {preset.label}
            </Button>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {FOUNDATION_TRIADS.map((triad) => (
            <Toggle
              key={triad}
              checked={draft.triads.includes(triad)}
              label={CHORD_LABELS[triad]}
              onChange={() => setDraft(toggleTriad(draft, triad))}
            />
          ))}
        </div>
        <div className="space-y-2">
          <p className="text-parchment">How it is played</p>
          <PlayedAs
            active={playedAsId(draft.presentations, CHORD_PLAYED)}
            options={CHORD_PLAYED}
            onChoose={(presentations) => setDraft({ ...draft, presentations })}
          />
        </div>
        <p className="text-sm text-parchment/80">Seventh chords use this same choice.</p>
      </section>

      <section className="space-y-3">
        <h2 className="font-serif text-3xl">Seventh chords</h2>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {SEVENTH_QUALITIES.map((quality) => (
            <Toggle
              key={quality}
              checked={draft.sevenths.includes(quality)}
              label={CHORD_LABELS[quality]}
              onChange={() => setDraft(toggleSeventh(draft, quality))}
            />
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="font-serif text-3xl">Pitch range</h2>
        <p className="text-parchment">
          {signedIn
            ? "Starting practice saves this range to your account."
            : "Log in to keep this range on your account."}
        </p>
        <div className="flex flex-wrap gap-2">
          {RANGE_PRESETS.map((preset) => (
            <Button
              key={preset.id}
              type="button"
              variant={draft.rangeLow === preset.low && draft.rangeHigh === preset.high ? "gold" : "ghost"}
              onClick={() => setDraft({ ...draft, rangeLow: preset.low, rangeHigh: preset.high })}
            >
              {preset.label}
            </Button>
          ))}
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block text-parchment">
            Lowest note
            <select
              className="mt-1 w-full rounded-xl border border-gold/30 bg-espresso px-3 py-3 text-cream"
              value={draft.rangeLow}
              onChange={(event) => setDraft({ ...draft, rangeLow: Number(event.target.value) })}
            >
              {SELECTABLE_NOTES.map((midi) => (
                <option key={midi} value={midi}>
                  {nameNotes(midiToNoteName(midi), noteNames)}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-parchment">
            Highest note
            <select
              className="mt-1 w-full rounded-xl border border-gold/30 bg-espresso px-3 py-3 text-cream"
              value={draft.rangeHigh}
              onChange={(event) => setDraft({ ...draft, rangeHigh: Number(event.target.value) })}
            >
              {SELECTABLE_NOTES.map((midi) => (
                <option key={midi} value={midi}>
                  {nameNotes(midiToNoteName(midi), noteNames)}
                </option>
              ))}
            </select>
          </label>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="font-serif text-3xl">Questions</h2>
        <div className="flex flex-wrap gap-2">
          {QUESTION_COUNTS.map((count) => (
            <Button
              key={count}
              type="button"
              variant={!customCount && draft.count === count ? "gold" : "ghost"}
              onClick={() => {
                setCustomCount(false);
                setDraft({ ...draft, count });
              }}
            >
              {count}
            </Button>
          ))}
          <Button type="button" variant={customCount ? "gold" : "ghost"} onClick={() => setCustomCount(true)}>
            Custom
          </Button>
        </div>
        {customCount ? (
          <label className="block max-w-xs text-parchment">
            Custom count
            <input
              className="mt-1 w-full rounded-xl border border-gold/30 bg-espresso px-3 py-3 text-cream"
              type="number"
              min={1}
              max={100}
              value={draft.count}
              onChange={(event) => setDraft({ ...draft, count: Number(event.target.value) })}
            />
          </label>
        ) : null}
      </section>

      {problem ? (
        <p role="alert" className="text-cream">
          {problem}
        </p>
      ) : null}
      {!problem && ignored ? <p className="text-parchment">{ignored}</p> : null}

      <Button type="button" onClick={start} disabled={Boolean(problem)}>
        Start practice
      </Button>
    </div>
  );
}

function Toggle({ checked, label, onChange }: { checked: boolean; label: string; onChange: () => void }) {
  return (
    <button
      type="button"
      aria-pressed={checked}
      onClick={onChange}
      className={`rounded-2xl border px-3 py-3 text-left ${
        checked ? "border-gold bg-gold/15 text-cream" : "border-cream/20 text-parchment"
      }`}
    >
      {label}
    </button>
  );
}

function toggleMode(draft: PracticeDraft, mode: StimulusMode): PracticeDraft {
  const modes = draft.modes.includes(mode) ? draft.modes.filter((item) => item !== mode) : [...draft.modes, mode];
  return { ...draft, modes };
}

function toggleInterval(draft: PracticeDraft, interval: IntervalQuality): PracticeDraft {
  const intervals = draft.intervals.includes(interval)
    ? draft.intervals.filter((item) => item !== interval)
    : [...draft.intervals, interval];
  return { ...draft, intervals };
}

function toggleSeventh(draft: PracticeDraft, quality: SeventhQuality): PracticeDraft {
  const sevenths = draft.sevenths.includes(quality)
    ? draft.sevenths.filter((item) => item !== quality)
    : [...draft.sevenths, quality];
  return { ...draft, sevenths };
}

function toggleTriad(draft: PracticeDraft, triad: TriadQuality): PracticeDraft {
  const triads = draft.triads.includes(triad) ? draft.triads.filter((item) => item !== triad) : [...draft.triads, triad];
  return { ...draft, triads };
}

function playedAsId<T extends string>(selected: readonly T[], options: Array<{ id: string; values: readonly T[] }>): string | null {
  const match = options.find(
    (option) => option.values.length === selected.length && option.values.every((value) => selected.includes(value)),
  );
  return match?.id ?? null;
}

function PlayedAs<T extends string>({
  active,
  options,
  onChoose,
}: {
  active: string | null;
  options: Array<{ id: string; label: string; values: T[] }>;
  onChoose: (values: T[]) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((option) => (
        <Button key={option.id} type="button" variant={active === option.id ? "gold" : "ghost"} onClick={() => onChoose(option.values)}>
          {option.label}
        </Button>
      ))}
    </div>
  );
}
