const BASE_SCORE = 100;
const MAX_TIME_BONUS = 50;
const TIMER_DURATION = 15;

export function calculateScore(isCorrect: boolean, timeRemainingSeconds: number): number {
  if (!isCorrect) return 0;
  const timeBonus = Math.round((timeRemainingSeconds / TIMER_DURATION) * MAX_TIME_BONUS);
  return BASE_SCORE + timeBonus;
}
