export type Level = 'excellent' | 'good' | 'fair' | 'poor';

export function levelFromScore(score: number): Level {
  if (score >= 75) return 'excellent';
  if (score >= 50) return 'good';
  if (score >= 25) return 'fair';
  return 'poor';
}
