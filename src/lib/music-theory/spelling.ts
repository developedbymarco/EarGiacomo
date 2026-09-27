import { semitonesOf } from "./pitch";
import { LETTERS, type Letter, type SpellInterval, type SpelledNote } from "./types";

const PITCH_CLASS: Record<Letter, number> = {
  C: 0,
  D: 2,
  E: 4,
  F: 5,
  G: 7,
  A: 9,
  B: 11,
};

const LETTER_SPAN: Record<SpellInterval, number> = {
  P1: 0,
  m2: 1,
  M2: 1,
  m3: 2,
  M3: 2,
  P4: 3,
  A4: 3,
  d5: 4,
  P5: 4,
  A5: 4,
  m6: 5,
  M6: 5,
  m7: 6,
  M7: 6,
  d7: 6,
  P8: 7,
  m9: 8,
  M9: 8,
  m10: 9,
  M10: 9,
  P11: 10,
  A11: 10,
  P12: 11,
  m13: 12,
  M13: 12,
  m14: 13,
  M14: 13,
  P15: 14,
};

export function midiOf(letter: Letter, accidental: number, octave: number): number {
  return (octave + 1) * 12 + PITCH_CLASS[letter] + accidental;
}

export function formatDisplay(note: SpelledNote): string {
  return `${note.letter}${accidentalGlyph(note.accidental)}${note.octave}`;
}

export function formatScore(note: SpelledNote): string {
  const accidental =
    note.accidental === 0
      ? ""
      : note.accidental > 0
        ? "#".repeat(note.accidental)
        : "b".repeat(-note.accidental);
  return `${note.letter}${accidental}${note.octave}`;
}

export function spellInterval(root: SpelledNote, interval: SpellInterval): SpelledNote {
  let index = LETTERS.indexOf(root.letter);
  let octave = root.octave;
  for (let step = 0; step < LETTER_SPAN[interval]; step += 1) {
    index += 1;
    if (index === LETTERS.length) {
      index = 0;
      octave += 1;
    }
  }
  const letter = LETTERS[index]!;
  const midi = root.midi + semitonesOf(interval);
  const accidental = midi - midiOf(letter, 0, octave);
  if (Math.abs(accidental) > 2) {
    throw new Error(`Cannot spell ${formatDisplay(root)} ${interval}`);
  }
  return { letter, accidental, octave, midi };
}

export function candidateRoots(low: number, high: number): SpelledNote[] {
  const roots: SpelledNote[] = [];
  for (let octave = 0; octave <= 8; octave += 1) {
    for (const letter of LETTERS) {
      for (const accidental of [-1, 0, 1]) {
        const midi = midiOf(letter, accidental, octave);
        if (midi >= low && midi <= high && midi >= 21 && midi <= 108) {
          roots.push({ letter, accidental, octave, midi });
        }
      }
    }
  }
  return roots;
}

export function parseSpelled(name: string): SpelledNote {
  const match = /^([A-G])([#b♯♭𝄪𝄫]*)(-?\d+)$/.exec(name);
  if (!match) {
    throw new Error(`Cannot parse ${name}`);
  }
  const letter = match[1] as Letter;
  const accidental = accidentalValue(match[2] ?? "");
  const octave = Number(match[3]);
  return { letter, accidental, octave, midi: midiOf(letter, accidental, octave) };
}

function accidentalGlyph(accidental: number): string {
  if (accidental === 0) return "";
  if (accidental === 1) return "♯";
  if (accidental === -1) return "♭";
  if (accidental === 2) return "𝄪";
  if (accidental === -2) return "𝄫";
  return accidental > 0 ? "♯".repeat(accidental) : "♭".repeat(-accidental);
}

function accidentalValue(token: string): number {
  return [...token].reduce((total, glyph) => {
    if (glyph === "#" || glyph === "♯") return total + 1;
    if (glyph === "b" || glyph === "♭") return total - 1;
    if (glyph === "𝄪") return total + 2;
    if (glyph === "𝄫") return total - 2;
    return total;
  }, 0);
}
