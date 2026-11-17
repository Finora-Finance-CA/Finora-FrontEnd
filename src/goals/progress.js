// How far a savings goal has got, from its integer cents, with whole-number maths only.
// (saved / target) * 100 in floating point gets it wrong: $14.50 of $50.00 gives
// 28.999999999999996, which floors to 28. Multiplying first, as BigInt so even the
// largest totals stay exact, gives 29.

/**
 * The percent of the target saved, rounded down (so an unfinished goal never shows 100)
 * and capped at 100.
 *
 * @param {number} savedCents A whole number, 0 or more.
 * @param {number} targetCents A whole number above 0.
 * @returns {number} 0 to 100.
 */
export function goalPercent(savedCents, targetCents) {
  if (!(targetCents > 0) || !(savedCents > 0)) return 0
  const percent = Number((BigInt(savedCents) * 100n) / BigInt(targetCents))
  return Math.min(percent, 100)
}

/** True once the saved total has reached the target. */
export function isGoalReached(savedCents, targetCents) {
  return savedCents >= targetCents
}
