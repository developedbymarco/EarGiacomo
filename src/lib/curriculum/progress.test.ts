import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { CURRICULUM_NODES } from "@/lib/curriculum/seed";
import {
  buildReviewSettings,
  continueNode,
  decorateNodes,
  lockReason,
  masteryLabel,
  nextMastery,
  nodeStatus,
  passedLesson,
  reviewWeight,
  type MasteryRow,
} from "@/lib/curriculum/progress";

const now = Date.parse("2026-09-27T12:00:00Z");

function row(partial: Partial<MasteryRow> & Pick<MasteryRow, "conceptKey">): MasteryRow {
  return {
    mastery: 20,
    attempts: 4,
    correct: 2,
    lastPracticedAt: "2026-09-27T11:00:00Z",
    lastCorrect: true,
    confusionMap: {},
    ...partial,
  };
}

describe("guided path progress", () => {
  it("passes a lesson at 80 percent", () => {
    expect(passedLesson(8, 10)).toBe(true);
    expect(passedLesson(7, 10)).toBe(false);
  });

  it("moves mastery by the beginner rule and keeps it between 0 and 100", () => {
    expect(nextMastery(10, true, 0)).toBe(13);
    expect(nextMastery(10, true, 2)).toBe(12);
    expect(nextMastery(1, false, 0)).toBe(0);
    expect(nextMastery(99, true, 0)).toBe(100);
  });

  it("names mastery without a permanent failure label", () => {
    expect(masteryLabel(0, 0)).toBe("New");
    expect(masteryLabel(10, 2)).toBe("Familiar");
    expect(masteryLabel(40, 4)).toBe("Practiced");
    expect(masteryLabel(70, 6)).toBe("Strong");
    expect(masteryLabel(80, 8)).toBe("Mastered");
  });

  it("locks a lesson until its prerequisites are passed", () => {
    expect(
      nodeStatus({
        concepts: ["interval:m3", "interval:M3"],
        prerequisiteSlugs: ["seconds"],
        passingSlugs: new Set(),
        sessionCount: 0,
        passed: false,
        masteryByConcept: new Map(),
        unlockCost: 0,
        hasUnlock: false,
      }),
    ).toBe("locked");
  });

  it("keeps a priced lesson purchasable after the prerequisite is passed", () => {
    expect(
      nodeStatus({
        concepts: ["interval:m3"],
        prerequisiteSlugs: ["seconds"],
        passingSlugs: new Set(["seconds"]),
        sessionCount: 0,
        passed: false,
        masteryByConcept: new Map(),
        unlockCost: 40,
        hasUnlock: false,
      }),
    ).toBe("purchasable");
  });

  it("marks a free lesson ready, then in progress, then mastered only after a pass", () => {
    const base = {
      concepts: ["interval:m2", "interval:M2"],
      prerequisiteSlugs: [] as string[],
      passingSlugs: new Set<string>(),
      masteryByConcept: new Map([
        ["interval:m2", 90],
        ["interval:M2", 90],
      ]),
      unlockCost: 0,
      hasUnlock: false,
    };
    expect(nodeStatus({ ...base, sessionCount: 0, passed: false })).toBe("unlocked");
    expect(nodeStatus({ ...base, sessionCount: 1, passed: false })).toBe("in_progress");
    expect(nodeStatus({ ...base, sessionCount: 2, passed: true })).toBe("mastered");
  });

  it("asks for the listening lesson before the matching visual lesson", () => {
    const visual = CURRICULUM_NODES.find((node) => node.slug === "visual-seconds");
    expect(visual?.prerequisites).toContain("seconds");
    const nodes = decorateNodes(CURRICULUM_NODES, {
      passingSlugs: new Set(),
      sessionCounts: new Map(),
      masteryByConcept: new Map(),
      unlockedSlugs: new Set(),
    });
    expect(nodes.find((node) => node.slug === "seconds")?.status).toBe("unlocked");
    expect(nodes.find((node) => node.slug === "visual-seconds")?.status).toBe("locked");
    expect(lockReason(visual!, CURRICULUM_NODES, new Set())).toMatch(/Seconds, ascending/);
  });

  it("continues an in-progress lesson before a later ready one", () => {
    const nodes = decorateNodes(CURRICULUM_NODES, {
      passingSlugs: new Set(["seconds", "seconds-descending", "seconds-melodic", "seconds-harmonic", "seconds-mixed"]),
      sessionCounts: new Map([
        ["seconds", 1],
        ["thirds", 1],
      ]),
      masteryByConcept: new Map(),
      unlockedSlugs: new Set(["thirds"]),
    });
    expect(continueNode(nodes)?.slug).toBe("thirds");
  });

  it("weights a weak recent miss above a mastered concept, and still keeps one mastered item", () => {
    const weak = row({ conceptKey: "interval:m2", mastery: 15, attempts: 10, correct: 3, lastCorrect: false });
    const strong = row({ conceptKey: "interval:M2", mastery: 90, attempts: 10, correct: 9, lastCorrect: true });
    const other = row({ conceptKey: "interval:m3", mastery: 30, attempts: 6, correct: 3, lastCorrect: true });
    const fourth = row({ conceptKey: "interval:M3", mastery: 30, attempts: 6, correct: 3, lastCorrect: true });
    const fifth = row({ conceptKey: "interval:P4", mastery: 25, attempts: 6, correct: 2, lastCorrect: false });
    expect(reviewWeight(weak, now)).toBeGreaterThan(reviewWeight(strong, now));
    const settings = buildReviewSettings([weak, strong, other, fourth, fifth], now, { low: 48, high: 72 });
    expect(settings?.intervals).toContain("m2");
    expect(settings?.intervals).toContain("M2");
    expect(settings?.modes).toEqual(["audio"]);
  });

  it("refuses review until two intervals or two triads have been practiced", () => {
    expect(buildReviewSettings([row({ conceptKey: "interval:m2" })], now, null)).toBeNull();
  });

  it("has no cycles and matches the migration", () => {
    const slugs = new Set(CURRICULUM_NODES.map((node) => node.slug));
    for (const node of CURRICULUM_NODES) {
      for (const prerequisite of node.prerequisites) expect(slugs.has(prerequisite)).toBe(true);
      expect(reaches(node.slug, node.slug)).toBe(false);
    }
    expect(CURRICULUM_NODES.some((node) => node.path === "cadences")).toBe(true);
    expect(CURRICULUM_NODES.find((node) => node.slug === "seconds")?.config.presentation).toEqual(["ascending"]);
    expect(CURRICULUM_NODES.find((node) => node.slug === "seconds-mixed")?.config.presentation).toEqual([
      "ascending",
      "descending",
      "harmonic",
    ]);
    expect(CURRICULUM_NODES.find((node) => node.slug === "thirds")?.prerequisites).toEqual(["seconds-mixed"]);
    expect(CURRICULUM_NODES.find((node) => node.slug === "major-minor-triads")?.config.presentation).toEqual(["melodicAscending"]);
    expect(CURRICULUM_NODES.find((node) => node.slug === "triads-mixed")?.config.presentation).toEqual([
      "harmonic",
      "melodicAscending",
      "melodicDescending",
    ]);
    expect(CURRICULUM_NODES.find((node) => node.slug === "add-augmented")?.prerequisites).toEqual(["triads-mixed"]);
    const sql = [
      "supabase/migrations/20260927193000_curriculum.sql",
      "supabase/migrations/20260927210000_depth.sql",
      "supabase/migrations/20260928010000_presentation_lessons.sql",
    ]
      .map((file) => readFileSync(path.join(process.cwd(), file), "utf8"))
      .join("\n");
    for (const node of CURRICULUM_NODES) {
      expect(sql).toContain(`'${node.slug}'`);
      for (const prerequisite of node.prerequisites) {
        expect(sql).toContain(`parent.slug = '${prerequisite}'`);
        expect(sql).toContain(`child.slug = '${node.slug}'`);
      }
    }
  });
});

function reaches(from: string, target: string, seen = new Set<string>()): boolean {
  if (seen.has(from)) return false;
  seen.add(from);
  const node = CURRICULUM_NODES.find((item) => item.slug === from);
  if (!node) return false;
  return node.prerequisites.some((slug) => slug === target || reaches(slug, target, seen));
}
