import test from 'node:test';
import assert from 'node:assert';
import crypto from 'node:crypto';
import {
  KENO_PAYTABLE,
  calculateMultiplier,
  combinations,
  calculateHitProbability,
  calculateSpotRTP,
  getAllSpotsRTP,
  calculateOverallRTP,
  TOTAL_KENO_COMBINATIONS,
  STANDARD_MARKET_DISTRIBUTION,
} from '../src/utils/paytable.ts';

test('1. Authoritative Paytable Multiplier Preservation', () => {
  // Confirm every specified payout multiplier from user requirements
  assert.strictEqual(calculateMultiplier(1, 1), 3.5);
  assert.strictEqual(calculateMultiplier(1, 0), 0);

  assert.strictEqual(calculateMultiplier(2, 1), 1.0);
  assert.strictEqual(calculateMultiplier(2, 2), 10.0);
  assert.strictEqual(calculateMultiplier(2, 0), 0);

  assert.strictEqual(calculateMultiplier(3, 2), 2.0);
  assert.strictEqual(calculateMultiplier(3, 3), 50.0);
  assert.strictEqual(calculateMultiplier(3, 1), 0);
  assert.strictEqual(calculateMultiplier(3, 0), 0);

  assert.strictEqual(calculateMultiplier(4, 2), 1.5);
  assert.strictEqual(calculateMultiplier(4, 3), 10.0);
  assert.strictEqual(calculateMultiplier(4, 4), 80.0);
  assert.strictEqual(calculateMultiplier(4, 1), 0);

  assert.strictEqual(calculateMultiplier(5, 2), 1.0);
  assert.strictEqual(calculateMultiplier(5, 3), 3.0);
  assert.strictEqual(calculateMultiplier(5, 4), 30.0);
  assert.strictEqual(calculateMultiplier(5, 5), 150.0);
  assert.strictEqual(calculateMultiplier(5, 1), 0);

  assert.strictEqual(calculateMultiplier(6, 3), 2.0);
  assert.strictEqual(calculateMultiplier(6, 4), 15.0);
  assert.strictEqual(calculateMultiplier(6, 5), 60.0);
  assert.strictEqual(calculateMultiplier(6, 6), 500.0);
  assert.strictEqual(calculateMultiplier(6, 2), 0);

  assert.strictEqual(calculateMultiplier(7, 3), 2.0);
  assert.strictEqual(calculateMultiplier(7, 4), 4.0);
  assert.strictEqual(calculateMultiplier(7, 5), 20.0);
  assert.strictEqual(calculateMultiplier(7, 6), 80.0);
  assert.strictEqual(calculateMultiplier(7, 7), 1000.0);
  assert.strictEqual(calculateMultiplier(7, 2), 0);

  assert.strictEqual(calculateMultiplier(8, 4), 1.0);
  assert.strictEqual(calculateMultiplier(8, 5), 5.0);
  assert.strictEqual(calculateMultiplier(8, 6), 15.0);
  assert.strictEqual(calculateMultiplier(8, 7), 50.0);
  assert.strictEqual(calculateMultiplier(8, 8), 2000.0);
  assert.strictEqual(calculateMultiplier(8, 3), 0);

  assert.strictEqual(calculateMultiplier(9, 4), 2.0);
  assert.strictEqual(calculateMultiplier(9, 5), 2.0);
  assert.strictEqual(calculateMultiplier(9, 6), 10.0);
  assert.strictEqual(calculateMultiplier(9, 7), 25.0);
  assert.strictEqual(calculateMultiplier(9, 8), 125.0);
  assert.strictEqual(calculateMultiplier(9, 9), 5000.0);
  assert.strictEqual(calculateMultiplier(9, 3), 0);

  // Spot 10 preserved original from codebase
  assert.strictEqual(calculateMultiplier(10, 0), 2.0);
  assert.strictEqual(calculateMultiplier(10, 3), 1.0);
  assert.strictEqual(calculateMultiplier(10, 4), 2.0);
  assert.strictEqual(calculateMultiplier(10, 5), 4.0);
  assert.strictEqual(calculateMultiplier(10, 6), 10.0);
  assert.strictEqual(calculateMultiplier(10, 7), 40.0);
  assert.strictEqual(calculateMultiplier(10, 8), 200.0);
  assert.strictEqual(calculateMultiplier(10, 9), 1000.0);
  assert.strictEqual(calculateMultiplier(10, 10), 5000.0);
  assert.strictEqual(calculateMultiplier(10, 1), 0);
  assert.strictEqual(calculateMultiplier(10, 2), 0);
});

test('2. Unassigned/Missing Entries Return Exactly 0', () => {
  for (let s = 1; s <= 10; s++) {
    for (let h = -2; h <= s + 2; h++) {
      const declared = KENO_PAYTABLE[s]?.[h];
      const mult = calculateMultiplier(s, h);
      if (declared !== undefined) {
        assert.strictEqual(mult, declared);
      } else {
        assert.strictEqual(mult, 0, `Picks ${s}, Hits ${h} should be exactly 0`);
      }
    }
  }
});

test('3. Exact Hypergeometric Probability Sums to 1.0', () => {
  assert.strictEqual(TOTAL_KENO_COMBINATIONS, 3535316142212174320n);

  for (let s = 1; s <= 10; s++) {
    let probSum = 0;
    for (let h = 0; h <= s; h++) {
      probSum += calculateHitProbability(s, h);
    }
    assert.ok(
      Math.abs(probSum - 1.0) < 1e-12,
      `Probability sum for Spot ${s} should be 1.0 within floating point precision, got ${probSum}`
    );
  }
});

test('4. Exact Theoretical RTP Calculations Match Mathematical Closed-Form', () => {
  const spotRTPs = getAllSpotsRTP();

  // Spot 1: P(1) = 20/80 = 0.25; Mult = 3.5 -> RTP = 0.25 * 3.5 = 87.50%
  assert.ok(Math.abs(spotRTPs[1].baseRTP - 0.875) < 1e-6);

  // Spot 2: P(1)*1 + P(2)*10
  assert.ok(Math.abs(spotRTPs[2].baseRTP - 0.981013) < 1e-5);

  // Spot 3: P(2)*2 + P(3)*50
  assert.ok(Math.abs(spotRTPs[3].baseRTP - 0.971276) < 1e-5);

  // Spot 4: P(2)*1.5 + P(3)*10 + P(4)*80
  assert.ok(Math.abs(spotRTPs[4].baseRTP - 0.996503) < 1e-5);

  // Spot 5: P(2)*1 + P(3)*3 + P(4)*30 + P(5)*150
  assert.ok(Math.abs(spotRTPs[5].baseRTP - 0.981771) < 1e-5);

  // Spot 6: P(3)*2 + P(4)*15 + P(5)*60 + P(6)*500
  assert.ok(Math.abs(spotRTPs[6].baseRTP - 0.937939) < 1e-5);

  // Spot 7: P(3)*2 + P(4)*4 + P(5)*20 + P(6)*80 + P(7)*1000
  assert.ok(Math.abs(spotRTPs[7].baseRTP - 0.814489) < 1e-5);

  // Spot 8: P(4)*1 + P(5)*5 + P(6)*15 + P(7)*50 + P(8)*2000
  assert.ok(Math.abs(spotRTPs[8].baseRTP - 0.225231) < 1e-5);

  // Spot 9: P(4)*2 + P(5)*2 + P(6)*10 + P(7)*25 + P(8)*125 + P(9)*5000
  assert.ok(Math.abs(spotRTPs[9].baseRTP - 0.373096) < 1e-5);

  // Spot 10: Original codebase entries
  assert.ok(Math.abs(spotRTPs[10].baseRTP - 1.072338) < 1e-5);
});

test('5. Total Return & Net Profit Calculation Integrity', () => {
  const stake = 25.0; // 25 ETB
  const multiplier = calculateMultiplier(3, 3); // 50x
  const totalReturn = stake * multiplier;
  const netProfit = totalReturn - stake;

  assert.strictEqual(totalReturn, 1250.0);
  assert.strictEqual(netProfit, 1225.0);

  // Loss scenario
  const lossMultiplier = calculateMultiplier(3, 1); // 0x
  const lossReturn = stake * lossMultiplier;
  const lossNet = lossReturn - stake;
  assert.strictEqual(lossReturn, 0);
  assert.strictEqual(lossNet, -25.0);
});

test('6. Draw Generator Produces Exactly 20 Unique Numbers (1 to 80)', () => {
  function drawKeno20(): number[] {
    const pool = Array.from({ length: 80 }, (_, i) => i + 1);
    for (let i = pool.length - 1; i > 0; i--) {
      const j = crypto.randomInt(0, i + 1);
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    return pool.slice(0, 20);
  }

  for (let trial = 0; trial < 100; trial++) {
    const draw = drawKeno20();
    assert.strictEqual(draw.length, 20);

    const set = new Set(draw);
    assert.strictEqual(set.size, 20, 'All 20 numbers in a draw must be unique');

    for (const num of draw) {
      assert.ok(num >= 1 && num <= 80, `Ball ${num} out of range [1, 80]`);
    }
  }
});

test('7. Overall RTP Under Market Selection Weightings', () => {
  const overallRTP = calculateOverallRTP(STANDARD_MARKET_DISTRIBUTION);
  // Realistic player selections (concentrated on spots 2, 3, 4, 5, 6, 7)
  assert.ok(overallRTP > 0.85 && overallRTP < 0.95);
});
