/**
 * Freeze a compiled corpus, all the way down.
 *
 * The corpus ships as data embedded in code, and every caller holds the same instance.
 * One caller mutating a nested array — sorting the stages, splicing an `avoid` list —
 * would change what every later conversation is governed by, silently and only in that
 * process. Freezing makes that a `TypeError` at the point of the mistake instead of a
 * behaviour change nobody can reproduce.
 */
export function deepFreeze<T>(value: T): T {
  if (typeof value !== "object" || value === null || Object.isFrozen(value)) return value;
  Object.freeze(value);
  for (const nested of Object.values(value)) deepFreeze(nested);
  return value;
}
