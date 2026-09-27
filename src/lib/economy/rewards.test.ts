import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { CURRICULUM_NODES } from "@/lib/curriculum/seed";
import {
  giacominosForCompletion,
  levelForXp,
  unlockCostFor,
  xpForSession,
  xpToReachLevel,
} from "@/lib/economy/rewards";

describe("economy", () => {
  it("starts at level 1 and reaches level 2 at 100 XP", () => {
    expect(levelForXp(0)).toBe(1);
    expect(levelForXp(99)).toBe(1);
    expect(xpToReachLevel(2)).toBe(100);
    expect(levelForXp(100)).toBe(2);
    expect(levelForXp(xpToReachLevel(3))).toBe(3);
  });

  it("pays attempt XP, a lesson bonus, and a perfect first-try bonus", () => {
    expect(xpForSession({ questions: 10, correct: 8, repeats: 1, guidedPass: true, lessonXp: 10 })).toBe(10 + 32 + 10);
    expect(xpForSession({ questions: 10, correct: 10, repeats: 0, guidedPass: true, lessonXp: 10 })).toBe(10 + 40 + 10 + 20);
    expect(xpForSession({ questions: 10, correct: 10, repeats: 0, guidedPass: false, lessonXp: 10 })).toBe(50);
  });

  it("pays the spec example for a first chord lesson and less for a repeat", () => {
    expect(
      giacominosForCompletion({
        difficulty: 1,
        firstCompletion: true,
        alreadyMastered: false,
        dailyBonus: false,
        masteryBonus: false,
      }),
    ).toBe(15);
    expect(
      giacominosForCompletion({
        difficulty: 1,
        firstCompletion: false,
        alreadyMastered: false,
        dailyBonus: false,
        masteryBonus: false,
      }),
    ).toBe(5);
  });

  it("halves a mastered repeat, adds the daily bonus, and adds a mastery bonus", () => {
    expect(
      giacominosForCompletion({
        difficulty: 2,
        firstCompletion: false,
        alreadyMastered: true,
        dailyBonus: true,
        masteryBonus: false,
      }),
    ).toBe(Math.floor(8 / 2) + 10);
    expect(
      giacominosForCompletion({
        difficulty: 2,
        firstCompletion: true,
        alreadyMastered: false,
        dailyBonus: false,
        masteryBonus: true,
      }),
    ).toBe(35);
  });

  it("prices the next lesson from difficulty and leaves the first lesson free", () => {
    expect(unlockCostFor({ difficulty: 1, prerequisites: [] })).toBe(0);
    expect(unlockCostFor({ difficulty: 2, prerequisites: ["major-minor-triads"] })).toBe(40);
    const sql = readFileSync(path.join(process.cwd(), "supabase/migrations/20260927200000_economy.sql"), "utf8");
    for (const node of CURRICULUM_NODES) {
      expect(node.unlockCost).toBe(unlockCostFor(node));
      if (node.unlockCost > 0 && sql.includes(`where slug = '${node.slug}'`)) {
        expect(sql).toContain(`set unlock_cost = ${node.unlockCost} where slug = '${node.slug}'`);
      }
    }
  });
});
