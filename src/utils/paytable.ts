/**
 * FAST KENO High-Win-Rate Paytable Matrix
 * Configured for high hit frequency (>50%) & target RTP 93% - 96%
 * Key: Number of chosen spots (1 to 10)
 * Value: Map of (hits -> multiplier)
 */
export const KENO_PAYTABLE: Record<number, Record<number, number>> = {
  1: { 1: 3.8 },
  2: { 1: 1.0, 2: 9.0 },
  3: { 2: 2.0, 3: 26.0 },
  4: { 2: 1.0, 3: 5.0, 4: 80.0 },
  5: { 2: 1.0, 3: 3.0, 4: 15.0, 5: 300.0 },
  6: { 3: 1.5, 4: 6.0, 5: 60.0, 6: 1200.0 },
  7: { 3: 1.0, 4: 3.0, 5: 20.0, 6: 150.0, 7: 3000.0 },
  8: { 4: 2.0, 5: 10.0, 6: 60.0, 7: 500.0, 8: 10000.0 },
  9: { 4: 1.5, 5: 5.0, 6: 25.0, 7: 150.0, 8: 1500.0, 9: 25000.0 },
  10: {
    0: 2.0, // Consolation prize for 0 hits
    3: 1.0,
    4: 2.0,
    5: 4.0,
    6: 10.0,
    7: 40.0,
    8: 200.0,
    9: 1000.0,
    10: 5000.0,
  },
};

/**
 * Calculates multiplier for given pick count and matched hits
 */
export function calculateMultiplier(picksCount: number, hitsCount: number): number {
  if (picksCount < 1 || picksCount > 10) return 0;
  const picksMap = KENO_PAYTABLE[picksCount];
  if (!picksMap) return 0;
  return picksMap[hitsCount] ?? 0;
}

/**
 * Get paytable breakdown array for display in rules modal or dynamic HUD
 */
export function getPaytableBreakdown(picksCount: number): Array<{ hits: number; multiplier: number }> {
  if (picksCount < 1 || picksCount > 10) return [];
  const map = KENO_PAYTABLE[picksCount] || {};
  const result: Array<{ hits: number; multiplier: number }> = [];

  // For Pick 10, include Hit 0 (consolation)
  if (picksCount === 10 && map[0] !== undefined) {
    result.push({ hits: 0, multiplier: map[0] });
  }

  for (let hits = 1; hits <= picksCount; hits++) {
    if (map[hits] !== undefined) {
      result.push({ hits, multiplier: map[hits] });
    }
  }
  return result;
}
