const COST_BY_DIFFICULTY: Record<number, number> = { 1: 30, 2: 40, 3: 60, 4: 80 };

const PASS_BONUS_BY_DIFFICULTY: Record<number, { first: number; repeat: number }> = {
  1: { first: 40, repeat: 16 },
  2: { first: 60, repeat: 24 },
  3: { first: 80, repeat: 32 },
  4: { first: 100, repeat: 40 },
};

const FREE_LADDER = new Set([
  "seconds-descending",
  "seconds-melodic",
  "seconds-harmonic",
  "seconds-mixed",
  "triads-descending",
  "triads-melodic",
  "triads-harmonic",
  "triads-mixed",
]);

export function unlockCostFor(input: { slug?: string; difficulty: number; prerequisites: readonly string[] }): number {
  if (input.prerequisites.length === 0 || (input.slug != null && FREE_LADDER.has(input.slug))) return 0;
  return COST_BY_DIFFICULTY[input.difficulty] ?? 40;
}

export function xpToReachLevel(level: number): number {
  if (level <= 1) return 0;
  return Math.floor(100 * (level - 1) ** 1.5);
}

export function levelForXp(xp: number): number {
  let level = 1;
  while (level < 100 && xpToReachLevel(level + 1) <= xp) level += 1;
  return level;
}

export function xpForSession(input: {
  questions: number;
  correct: number;
  repeats: number;
  guidedPass: boolean;
  lessonXp: number;
}): number {
  let xp = input.questions + input.correct * 4;
  if (input.guidedPass) {
    xp += input.lessonXp;
    if (input.correct === input.questions && input.repeats === 0) xp += 20;
  }
  return xp;
}

export function giacominosForSession(input: {
  questions: number;
  correct: number;
  difficulty?: number;
  guidedPass?: boolean;
  firstPass?: boolean;
  alreadyMastered?: boolean;
  dailyBonus?: boolean;
  masteryBonus?: boolean;
}): number {
  let amount = input.questions * 2 + input.correct * 8;
  if (input.guidedPass) {
    const row = PASS_BONUS_BY_DIFFICULTY[input.difficulty ?? 1] ?? PASS_BONUS_BY_DIFFICULTY[1]!;
    let bonus = input.firstPass ? row.first : row.repeat;
    if (input.alreadyMastered) bonus = Math.max(8, Math.floor(bonus / 2));
    amount += bonus;
    if (input.dailyBonus) amount += 20;
    if (input.masteryBonus) amount += 20;
  }
  return amount;
}
