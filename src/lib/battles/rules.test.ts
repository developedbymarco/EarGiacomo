import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { BATTLE_PRESETS, BATTLE_STAKES, battleQuestions } from "@/lib/battles/rules";

const sql = readFileSync(path.join(process.cwd(), "supabase/migrations/20260927240000_battles.sql"), "utf8");

describe("battle presets", () => {
  it("builds a full question set for every preset without revealing the answer key in the stimulus", () => {
    for (const preset of BATTLE_PRESETS) {
      const questions = battleQuestions({ preset: preset.id, count: 10, seed: `battle-${preset.id}` });
      expect(questions).toHaveLength(10);
      for (const question of questions) {
        expect(question.stimulus.answerChoices).toContain(question.correctAnswer);
        expect(question.stimulus).not.toHaveProperty("interval");
        expect(question.stimulus).not.toHaveProperty("quality");
        expect(question.stimulus).not.toHaveProperty("cadenceId");
        expect(question.stimulus.notes.length).toBeGreaterThan(0);
      }
    }
  });
});

describe("battles migration", () => {
  it("keeps a free stake beside the paid stakes and settles the fee on the server", () => {
    expect(BATTLE_STAKES.map((stake) => stake.amount)).toEqual([0, 10, 25, 50]);
    expect(sql).toContain("stake in (0, 10, 25, 50)");
    expect(sql).toContain("function public.settle_battle");
    expect(sql).toContain("function public.submit_battle_answer");
    expect(sql).toContain("eargiacomo.allow_rewards");
  });
});
