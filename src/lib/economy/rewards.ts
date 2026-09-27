const COST_BY_DIFFICULTY: Record<number, number> = { 1: 30, 2: 40, 3: 60, 4: 80 };

const GIACOMINOS_BY_DIFFICULTY: Record<number, { first: number; repeat: number }> = {
  1: { first: 15, repeat: 5 },
  2: { first: 25, repeat: 8 },
  3: { first: 35, repeat: 10 },
  4: { first: 50, repeat: 15 },
};

export function unlockCostFor(input: { difficulty: number; prerequisites: readonly string[] }): number {
  if (input.prerequisites.length === 0) return 0;
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

export function giacominosForCompletion(input: {
  difficulty: number;
  firstCompletion: boolean;
  alreadyMastered: boolean;
  dailyBonus: boolean;
  masteryBonus: boolean;
}): number {
  const row = GIACOMINOS_BY_DIFFICULTY[input.difficulty] ?? GIACOMINOS_BY_DIFFICULTY[1]!;
  let amount = input.firstCompletion ? row.first : row.repeat;
  if (input.alreadyMastered) amount = Math.max(2, Math.floor(amount / 2));
  if (input.dailyBonus) amount += 10;
  if (input.masteryBonus) amount += 10;
  return amount;
}
