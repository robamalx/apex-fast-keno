/**
 * FAST KENO High-Win-Rate Paytable Matrix
 * Configured for high hit frequency (>50%) & target RTP 93% - 96%
 * Key: Number of chosen spots (1 to 10)
 * Value: Map of (hits -> multiplier)
 */
export const KENO_PAYTABLE: Record<number, Record<number, number>> = {
  1: { 1: 3.5 },
  2: { 1: 1.0, 2: 10.0 },
  3: { 2: 2.0, 3: 50.0 },
  4: { 2: 1.5, 3: 10.0, 4: 80.0 },
  5: { 2: 1.0, 3: 3.0, 4: 30.0, 5: 150.0 },
  6: { 3: 2.0, 4: 15.0, 5: 60.0, 6: 500.0 },
  7: { 3: 2.0, 4: 4.0, 5: 20.0, 6: 80.0, 7: 1000.0 },
  8: { 4: 1.0, 5: 5.0, 6: 15.0, 7: 50.0, 8: 2000.0 },
  9: { 4: 2.0, 5: 2.0, 6: 10.0, 7: 25.0, 8: 125.0, 9: 5000.0 },
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

/**
 * Exact BigInt Combinations C(n, k)
 */
export function combinations(n: number, k: number): bigint {
  if (k < 0 || k > n) return 0n;
  if (k === 0 || k === n) return 1n;
  if (k > n / 2) k = n - k;
  let res = 1n;
  for (let i = 1n; i <= BigInt(k); i++) {
    res = (res * (BigInt(n) - i + 1n)) / i;
  }
  return res;
}

/**
 * Total 20-ball draw combinations out of 80 numbers: C(80, 20) = 3,535,316,142,212,174,320
 */
export const TOTAL_KENO_COMBINATIONS = combinations(80, 20);

/**
 * Calculates exact hypergeometric probability P(H = h | S = s)
 * P(h) = [C(s, h) * C(80 - s, 20 - h)] / C(80, 20)
 */
export function calculateHitProbability(spots: number, hits: number): number {
  if (spots < 1 || spots > 10 || hits < 0 || hits > spots) return 0;
  const ways = combinations(spots, hits) * combinations(80 - spots, 20 - hits);
  return Number(ways) / Number(TOTAL_KENO_COMBINATIONS);
}

export interface SpotHitDetail {
  hits: number;
  probability: number;
  multiplier: number;
  expectedValue: number;
}

export interface SpotRTPAnalysis {
  spots: number;
  baseRTP: number;
  houseEdge: number;
  hits: SpotHitDetail[];
}

/**
 * Computes exact theoretical RTP and breakdown for a given spot selection count
 */
export function calculateSpotRTP(spots: number): SpotRTPAnalysis {
  const payMap = KENO_PAYTABLE[spots] || {};
  let totalRTP = 0;
  const hits: SpotHitDetail[] = [];

  for (let h = 0; h <= spots; h++) {
    const prob = calculateHitProbability(spots, h);
    const multiplier = payMap[h] ?? 0;
    const expectedValue = prob * multiplier;
    totalRTP += expectedValue;
    hits.push({
      hits: h,
      probability: prob,
      multiplier,
      expectedValue,
    });
  }

  return {
    spots,
    baseRTP: totalRTP,
    houseEdge: 1 - totalRTP,
    hits,
  };
}

/**
 * Computes exact theoretical RTP for all spot counts 1 to 10
 */
export function getAllSpotsRTP(): Record<number, SpotRTPAnalysis> {
  const result: Record<number, SpotRTPAnalysis> = {};
  for (let s = 1; s <= 10; s++) {
    result[s] = calculateSpotRTP(s);
  }
  return result;
}

/**
 * Standard realistic player selection distribution in FastKeno markets
 */
export const STANDARD_MARKET_DISTRIBUTION: Record<number, number> = {
  1: 0.05,
  2: 0.08,
  3: 0.15,
  4: 0.15,
  5: 0.18,
  6: 0.14,
  7: 0.10,
  8: 0.04,
  9: 0.04,
  10: 0.07,
};

/**
 * Calculates overall game RTP given a player-selection weighting distribution
 */
export function calculateOverallRTP(
  distribution: Record<number, number> = STANDARD_MARKET_DISTRIBUTION
): number {
  let overall = 0;
  let totalWeight = 0;
  for (let s = 1; s <= 10; s++) {
    const weight = distribution[s] ?? 0;
    const rtp = calculateSpotRTP(s).baseRTP;
    overall += weight * rtp;
    totalWeight += weight;
  }
  return totalWeight > 0 ? overall / totalWeight : 0;
}

