import { chordSpellIntervals } from "./pitch";
import { spellInterval } from "./spelling";
import type { ChordQuality, SpelledNote, VoicingKind } from "./types";

export function closedVoicing(rootMidi: number, offsets: number[], inversion: number): number[] {
  if (inversion < 0 || inversion >= offsets.length) {
    throw new Error(`Inversion ${inversion} is outside this chord`);
  }
  const bassOffset = offsets[inversion]!;
  return offsets
    .map((offset) => {
      let placed = offset;
      while (placed < bassOffset) placed += 12;
      return rootMidi + placed;
    })
    .sort((left, right) => left - right);
}

export function openVoicing(closed: number[], low: number, high: number): number[] | null {
  if (closed.length < 3) return null;
  const bass = closed[0]!;
  const raisedTop = closed.map((note, index) => (index === closed.length - 1 ? note + 12 : note));
  if (fits(raisedTop, low, high) && span(raisedTop) > 12) return raisedTop;

  for (let index = 1; index < closed.length - 1; index += 1) {
    const next = [...closed];
    next[index] = next[index]! + 12;
    next.sort((left, right) => left - right);
    if (next[0] === bass && fits(next, low, high) && span(next) > 12) return next;
  }
  return null;
}

export function realizeChord(
  root: SpelledNote,
  quality: ChordQuality,
  inversion: number,
  voicing: VoicingKind,
  low: number,
  high: number,
): SpelledNote[] | null {
  const spelling = chordSpellIntervals(quality);
  let spelledTones: SpelledNote[];
  try {
    spelledTones = spelling.map((interval) => spellInterval(root, interval));
  } catch {
    return null;
  }
  const offsets = spelledTones.map((tone) => tone.midi - root.midi);
  const closed = closedVoicing(root.midi, offsets, inversion);
  const midis = voicing === "open" ? openVoicing(closed, low, high) : closed;
  if (!midis || !fits(midis, low, high)) return null;

  const placed = midis.map((midi) => {
    const tone = spelledTones.find((candidate) => mod12(candidate.midi) === mod12(midi));
    if (!tone) throw new Error(`No spelling for MIDI ${midi}`);
    const octaves = Math.round((midi - tone.midi) / 12);
    return { ...tone, octave: tone.octave + octaves, midi };
  });
  const allowDoubleFlat = quality === "diminished7";
  if (placed.some((note) => Math.abs(note.accidental) > (allowDoubleFlat ? 2 : 1))) return null;
  return placed;
}

function fits(notes: number[], low: number, high: number): boolean {
  return notes.every((note) => note >= low && note <= high);
}

function span(notes: number[]): number {
  return Math.max(...notes) - Math.min(...notes);
}

function mod12(midi: number): number {
  return ((midi % 12) + 12) % 12;
}
