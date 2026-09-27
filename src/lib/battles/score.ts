export const BATTLE_WIN_XP = 25;
export const BATTLE_PLAY_XP = 10;
export const BATTLE_MIN_ANSWERS = 3;

export function battlePoints(correct: boolean, responseMs: number, streak: number): number {
  if (!correct) return 0;
  const elapsed = Math.max(0, responseMs);
  const speed = elapsed >= 10_000 ? 0 : Math.round(50 * (1 - elapsed / 10_000));
  const streakBonus = streak >= 5 ? 20 : streak >= 3 ? 10 : 0;
  return 100 + speed + streakBonus;
}

export function battleXp(input: { played: boolean; won: boolean }): number {
  if (!input.played) return 0;
  return BATTLE_PLAY_XP + (input.won ? BATTLE_WIN_XP : 0);
}
