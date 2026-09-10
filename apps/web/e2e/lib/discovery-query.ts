/**
 * The search text the `/discover` E2E fixtures are embedded from, derived from a run id.
 *
 * Its own module, with no database import, so the ranking property it exists to guarantee can be
 * asserted in a unit test — see `discovery-query.test.ts`. `discovery-fixtures.ts` is the only
 * other caller.
 *
 * ## The property
 *
 * The dev database is shared and cleanup can fail, so fixtures from earlier runs may still be
 * sitting in it. Those rows must be **inert**: unable to outrank the current run's own fixtures.
 * Ranking reads the embedded text rather than the display name, so distinct names do not provide
 * that — the query text has to.
 *
 * The E2E embedder hashes each character by code **and position**, so two texts sharing most of
 * their characters at the same offsets score close to 1.0. A run id is `Date.now().toString(36)`
 * plus four random characters, and two runs minutes apart share every character of that
 * timestamp — so a query built as a run id inside a fixed English phrase is near-identical across
 * runs however the id itself is spelled. That was the original bug: a leaked row from another run
 * scored ~0.89 against the current query while the current run's own `second` fixture scored
 * ~0.82, so leaked rows outranked it and pushed it off the first page.
 *
 * Expanding the id through a hash fixes it by avalanche — ids one millisecond apart produce
 * tokens sharing no character positions, dropping a leaked row to ~0.34.
 */

/** Token width. Long enough to dominate the query text it sits in; short enough to stay legible. */
const TOKEN_LENGTH = 40;

/**
 * Expand a run id into a high-entropy token: FNV-1a over the id, then xorshift per output
 * character. Avalanche is the property that matters — changing one character of the input must
 * change the whole token, because ids from nearby runs differ by exactly that little.
 *
 * Not a security hash; it needs to be deterministic, dependency-free, and to spread.
 */
export function runQueryToken(runId: string): string {
  let h = 2166136261;
  for (let i = 0; i < runId.length; i++) {
    h ^= runId.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  let token = "";
  for (let i = 0; i < TOKEN_LENGTH; i++) {
    h ^= h << 13;
    h ^= h >>> 17;
    h ^= h << 5;
    h |= 0;
    token += (Math.abs(h) % 36).toString(36);
  }
  return token;
}

/**
 * The exact text a run searches for, and the text its top-ranked fixture is embedded from.
 *
 * Distinctive enough that it cannot collide with a real profile's text, and well under the
 * 200-character cap `DiscoveryQuerySchema` enforces.
 */
export function discoveryQueryFor(runId: string): string {
  return `zzdiscovery ${runQueryToken(runId)}`;
}

/** The suffix that makes the `second` fixture a near — but strictly lower — match. */
export const SECOND_FIXTURE_SUFFIX = " plus adjacent glaze notes";
