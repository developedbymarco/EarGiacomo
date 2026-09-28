import { describe, expect, it } from "vitest";
import { nameNotes } from "@/lib/music-theory/naming";

describe("note names", () => {
  it("keeps letter names", () => {
    expect(nameNotes("C4  ·  E♭4  ·  G4", "letters")).toBe("C4  ·  E♭4  ·  G4");
  });

  it("uses fixed do, and keeps the accidental on the syllable", () => {
    expect(nameNotes("C4  ·  E♭4  ·  G4", "solfege")).toBe("Do4  ·  Mi♭4  ·  Sol4");
    expect(nameNotes("C#4", "solfege")).toBe("Do#4");
    expect(nameNotes("B𝄫3", "solfege")).toBe("Si𝄫3");
    expect(nameNotes("A#3", "solfege")).toBe("La#3");
  });
});
