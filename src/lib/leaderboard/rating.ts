export const EAR_RATING_SCALE = 1000;
export const EAR_RATING_MINIMUM = 10;
export const EAR_RATING_WINDOW = 100;

export function conceptDifficulty(nodes: readonly { difficulty: number; concepts: readonly string[] }[]): Map<string, number> {
  const difficulty = new Map<string, number>();
  for (const node of nodes) {
    for (const concept of node.concepts) {
      const current = difficulty.get(concept);
      if (current == null || node.difficulty < current) difficulty.set(concept, node.difficulty);
    }
  }
  return difficulty;
}

export function earRating(
  attempts: readonly { concept: string; correct: boolean }[],
  difficulty: ReadonlyMap<string, number>,
): { rating: number; answers: number } | null {
  const recent = attempts.slice(0, EAR_RATING_WINDOW);
  if (recent.length < EAR_RATING_MINIMUM) return null;
  let weighted = 0;
  let weight = 0;
  for (const attempt of recent) {
    const value = difficulty.get(attempt.concept) ?? 1;
    const safe = value > 0 ? value : 1;
    weight += safe;
    if (attempt.correct) weighted += safe;
  }
  if (weight <= 0) return null;
  return { rating: Math.round((EAR_RATING_SCALE * weighted) / weight), answers: recent.length };
}
