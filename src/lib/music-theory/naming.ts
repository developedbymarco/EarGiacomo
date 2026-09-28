export type NoteNaming = "letters" | "solfege";

const SOLFEGE: Record<string, string> = {
  C: "Do",
  D: "Re",
  E: "Mi",
  F: "Fa",
  G: "Sol",
  A: "La",
  B: "Si",
};

export function noteNaming(value: unknown): NoteNaming {
  return value === "solfege" ? "solfege" : "letters";
}

export function nameNotes(label: string, naming: NoteNaming): string {
  if (naming === "letters") return label;
  return label.replace(/[A-G]/g, (letter) => SOLFEGE[letter] ?? letter);
}
