import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { CURRICULUM_NODES } from "@/lib/curriculum/seed";
import { conceptDifficulty, earRating } from "@/lib/leaderboard/rating";

const sql = readFileSync(path.join(process.cwd(), "supabase/migrations/20260928020000_leaderboard.sql"), "utf8");

describe("ear rating", () => {
  it("uses the easiest lesson that teaches a concept", () => {
    const difficulty = conceptDifficulty(CURRICULUM_NODES);
    expect(difficulty.get("interval:m2")).toBe(1);
    expect(difficulty.get("interval:m6")).toBeGreaterThan(1);
  });

  it("needs ten answers and lets a hard concept outweigh an easy one", () => {
    const difficulty = new Map([
      ["interval:m2", 1],
      ["interval:m6", 4],
    ]);
    expect(earRating([{ concept: "interval:m2", correct: true }], difficulty)).toBeNull();
    const easy = Array.from({ length: 10 }, () => ({ concept: "interval:m2", correct: true }));
    expect(earRating(easy, difficulty)?.rating).toBe(1000);
    const hardMisses = [
      ...Array.from({ length: 5 }, () => ({ concept: "interval:m2", correct: true })),
      ...Array.from({ length: 5 }, () => ({ concept: "interval:m6", correct: false })),
    ];
    const easyMisses = [
      ...Array.from({ length: 5 }, () => ({ concept: "interval:m6", correct: true })),
      ...Array.from({ length: 5 }, () => ({ concept: "interval:m2", correct: false })),
    ];
    expect(earRating(hardMisses, difficulty)?.rating).toBe(200);
    expect(earRating(easyMisses, difficulty)?.rating).toBe(800);
    const many = Array.from({ length: 101 }, (_, index) => ({ concept: "interval:m2", correct: index > 0 }));
    expect(earRating(many, difficulty)).toEqual({ rating: 990, answers: 100 });
  });

  it("ranks public accuracy and leaves Giacominos out of the board", () => {
    expect(sql).toContain("1000.0 * sum((case when w.is_correct then 1 else 0 end) * coalesce(d.difficulty, 1))");
    expect(sql).toContain("n <= 100");
    expect(sql).toContain("having count(*) >= 10");
    expect(sql).toContain("p.profile_visibility = 'public'");
    expect(sql).toContain("p.show_accuracy");
    expect(sql).toContain("p.show_on_leaderboard");
    expect(sql).not.toContain("giacominos");
    expect(sql).toContain("grant execute on function public.leaderboard() to anon, authenticated");
  });
});
