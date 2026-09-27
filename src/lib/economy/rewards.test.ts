import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { CURRICULUM_NODES } from "@/lib/curriculum/seed";
import {
  giacominosForSession,
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

  it("pays for every question, more for each correct answer, and still pays when none are correct", () => {
    const sql = readFileSync(path.join(process.cwd(), "supabase/migrations/20260928000000_round_payout.sql"), "utf8");
    expect(sql).toContain("v_coins := total * 2 + correct_count * 8");
    expect(sql).toContain("case when prior_passes = 0 then 40 else 16 end");
    expect(giacominosForSession({ questions: 10, correct: 0 })).toBe(20);
    expect(giacominosForSession({ questions: 10, correct: 10 })).toBe(100);
    expect(giacominosForSession({ questions: 10, correct: 8 })).toBe(84);
  });

  it("adds a larger lesson bonus for a guided pass, including a repeat and a mastered pass", () => {
    expect(
      giacominosForSession({
        questions: 10,
        correct: 8,
        difficulty: 1,
        guidedPass: true,
        firstPass: true,
      }),
    ).toBe(84 + 40);
    expect(
      giacominosForSession({
        questions: 10,
        correct: 8,
        difficulty: 2,
        guidedPass: true,
        firstPass: false,
        alreadyMastered: true,
        dailyBonus: true,
        masteryBonus: true,
      }),
    ).toBe(84 + Math.floor(24 / 2) + 20 + 20);
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
