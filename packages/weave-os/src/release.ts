import { createHash } from "node:crypto";
import { OsReleaseIdSchema, type OsReleaseId } from "@resonance/core";
import type { CompiledCorpus } from "./corpus-types";

/**
 * The identity of one compiled corpus, derived from its content.
 *
 * ## Why a content hash and not a version number
 *
 * The corpus is many files with independent versions; there is no single number that
 * moves when any of them changes. A content hash is that number, and it cannot be
 * forgotten: editing a file changes the id whether or not anyone remembers to bump
 * anything. Evidence stamped with it stays attributable to the exact corpus that produced
 * the conversation, which is what makes an evaluation run months later mean anything.
 *
 * The id is opaque to every caller. It is pinned once at the start of a conversation and
 * passed through unchanged; nothing parses it.
 */
export function computeReleaseId(corpus: CompiledCorpus): OsReleaseId {
  const digest = createHash("sha256").update(canonicalize(corpus)).digest("hex");
  return OsReleaseIdSchema.parse(`sha256:${digest}`);
}

/**
 * Serialise deterministically: object keys sorted, arrays in order.
 *
 * Authored key order is meaningful to a reader but must not be meaningful to the hash,
 * or reordering two blocks in a YAML file would look like a behaviour change.
 */
function canonicalize(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value) ?? "null";
  if (Array.isArray(value)) return `[${value.map(canonicalize).join(",")}]`;
  const entries = Object.entries(value as Record<string, unknown>)
    .filter(([, v]) => v !== undefined)
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([k, v]) => `${JSON.stringify(k)}:${canonicalize(v)}`);
  return `{${entries.join(",")}}`;
}
