import { describe, expect, it } from "vitest";
import { battlePoints, battleXp } from "@/lib/battles/score";

describe("battle scoring", () => {
  it("pays 100 plus a speed bonus that fades out over 10 seconds", () => {
    expect(battlePoints(true, 0, 1)).toBe(150);
    expect(battlePoints(true, 10_000, 1)).toBe(100);
    expect(battlePoints(false, 0, 4)).toBe(0);
  });

  it("adds a capped streak bonus on top of a correct answer", () => {
    expect(battlePoints(true, 10_000, 2)).toBe(100);
    expect(battlePoints(true, 10_000, 3)).toBe(110);
    expect(battlePoints(true, 10_000, 5)).toBe(120);
  });

  it("gives participation XP to both players and a win bonus only to the winner", () => {
    expect(battleXp({ played: true, won: false })).toBe(10);
    expect(battleXp({ played: true, won: true })).toBe(35);
    expect(battleXp({ played: false, won: false })).toBe(0);
  });
});
