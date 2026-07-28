import {
  ValidationError,
  type CorpusFile,
  type CorpusId,
  type CorpusInheritedBy,
} from "@resonance/core";
import type { CompiledCorpusFile } from "./corpus-types";

/**
 * Inheritance, in both directions.
 *
 * The corpus stores the edge child-side only: a file names what it inherits, and nothing
 * names its children (ADR-0020 § 5). Parent-side storage would mean every new root or
 * active file required editing the philosophy — the one file whose own policy sets
 * `changeThreshold: exceptional` — for a purely mechanical reason.
 *
 * Both directions are still useful, so the parent-side view is computed here rather than
 * stored. Computing it keeps the designer's mental model available without creating a
 * second source of truth that could disagree with the edges.
 */

/**
 * The files that compose into one conversation, parents before children.
 *
 * Order is the point: the philosophy frames the principles, the principles frame the
 * flow. A depth-first walk with the parents emitted first gives exactly that, and a file
 * reached twice through different paths appears once, at its earliest position.
 */
export function resolutionOrder(
  start: CorpusId,
  byId: ReadonlyMap<CorpusId, CorpusFile>,
): readonly CorpusFile[] {
  const ordered: CorpusFile[] = [];
  const visited = new Set<CorpusId>();

  const visit = (id: CorpusId, path: readonly CorpusId[]): void => {
    if (path.includes(id)) {
      throw new ValidationError(`Corpus inheritance forms a cycle: ${[...path, id].join(" -> ")}.`);
    }
    if (visited.has(id)) return;
    const file = byId.get(id);
    if (file === undefined) {
      throw new ValidationError(`Corpus file "${id}" is inherited but not defined.`);
    }
    visited.add(id);
    for (const parentId of file.inherits) visit(parentId, [...path, id]);
    ordered.push(file);
  };

  visit(start, []);
  return ordered;
}

/** The parent-side view: for each file, the files that name it in their `inherits`. */
export function computeInheritedBy(files: readonly CompiledCorpusFile[]): CorpusInheritedBy {
  const view = new Map<CorpusId, CorpusId[]>();
  for (const entry of files) {
    for (const parentId of entry.file.inherits) {
      const children = view.get(parentId);
      if (children === undefined) view.set(parentId, [entry.file.id]);
      else children.push(entry.file.id);
    }
  }
  return view;
}
