import type { CorpusFile } from "@resonance/core";
import type { PatternRegistryRulebook } from "./registry-rulebook";

/**
 * What a compiled corpus is, stated apart from what compiles it.
 *
 * The generated corpus module and the resolver need this shape; only the code generator
 * needs the YAML parser. Keeping the two in separate modules means the shipped module
 * graph never reaches a build-time dependency, even by a type import.
 */

/** One authored file: its corpus-relative path and its raw YAML text. */
export type CorpusSourceFile = {
  /** Path relative to `corpus/`, e.g. `root/weave_interaction_philosophy.yaml`. */
  readonly path: string;
  readonly text: string;
};

/** A validated file, with the path it was authored at kept for diagnostics. */
export type CompiledCorpusFile = {
  readonly path: string;
  readonly file: CorpusFile;
};

/**
 * Every authored file, parsed and schema-valid.
 *
 * The registry rulebook is separate from `files` because it is not a member of
 * `CorpusFileSchema`'s union and — more importantly — is never inherited by a
 * conversation. Keeping it out of `files` means no composition path can reach it by
 * accident.
 */
export type CompiledCorpus = {
  readonly files: readonly CompiledCorpusFile[];
  readonly registry: PatternRegistryRulebook | null;
};
