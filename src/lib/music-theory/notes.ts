const PITCHES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"] as const;

export function midiToNoteName(midi: number): string {
  const pitch = PITCHES[((midi % 12) + 12) % 12]!;
  const octave = Math.floor(midi / 12) - 1;
  return `${pitch}${octave}`;
}

export const SELECTABLE_NOTES = Array.from({ length: 61 }, (_, index) => 36 + index);
