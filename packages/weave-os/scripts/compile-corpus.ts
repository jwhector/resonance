#!/usr/bin/env tsx
/**
 * Compile the authored corpus YAML into `src/corpus.generated.ts`.
 *
 * This is the only place the corpus is read from disk. The generated module is committed,
 * so nothing at runtime touches the filesystem and a malformed corpus fails the build
 * rather than a creator's conversation (ADR-0020 § 1).
 *
 *   pnpm --filter @resonance/weave-os corpus:compile    rewrite the generated module
 *   pnpm --filter @resonance/weave-os corpus:check      fail if it is out of date
 *
 * `--check` runs as the first half of `build`, so a YAML edit that was never compiled
 * cannot reach main. Cross-file diagnostics are printed either way; they do NOT fail the
 * run, because the shipped corpus carries unresolved references the designer owns (see
 * DEFECTS.md and `src/diagnostics.ts`). The test suite is what pins them.
 */
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { compileCorpus } from "../src/compile";
import type { CompiledCorpus, CorpusSourceFile } from "../src/corpus-types";
import { formatDiagnostics, validateCorpus } from "../src/diagnostics";

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const corpusRoot = join(packageRoot, "corpus");
const generatedPath = join(packageRoot, "src", "corpus.generated.ts");

const sources = readCorpusFiles(corpusRoot);
if (sources.length === 0) {
  console.error(`No corpus files found under ${relative(process.cwd(), corpusRoot)}.`);
  process.exit(1);
}

const corpus = compileCorpus(sources);
const generated = renderModule(corpus, sources);

const diagnostics = validateCorpus(corpus);
if (diagnostics.length > 0) {
  const errors = diagnostics.filter((d) => d.severity === "error").length;
  console.error(
    `\nWeave OS corpus: ${errors} error(s), ${diagnostics.length - errors} warning(s).\n` +
      "These are reported, not fatal — see packages/weave-os/DEFECTS.md.\n",
  );
  console.error(formatDiagnostics(diagnostics));
  console.error("");
}

if (process.argv.includes("--check")) {
  const onDisk = readFileSync(generatedPath, "utf8");
  if (onDisk !== generated) {
    console.error(
      "src/corpus.generated.ts is out of date with corpus/*.yaml.\n" +
        "Run: pnpm --filter @resonance/weave-os corpus:compile",
    );
    process.exit(1);
  }
  console.log(`Weave OS corpus is up to date (${sources.length} files).`);
} else {
  writeFileSync(generatedPath, generated, "utf8");
  console.log(`Wrote src/corpus.generated.ts from ${sources.length} corpus files.`);
}

/** Every `.yaml` under `corpus/`, sorted by path so the generated module is stable. */
function readCorpusFiles(root: string): readonly CorpusSourceFile[] {
  const found: CorpusSourceFile[] = [];
  const walk = (directory: string): void => {
    for (const entry of readdirSync(directory, { withFileTypes: true }).sort((a, b) =>
      a.name < b.name ? -1 : 1,
    )) {
      const absolute = join(directory, entry.name);
      if (entry.isDirectory()) walk(absolute);
      else if (entry.name.endsWith(".yaml") || entry.name.endsWith(".yml")) {
        found.push({
          path: relative(root, absolute).split("\\").join("/"),
          text: readFileSync(absolute, "utf8"),
        });
      }
    }
  };
  walk(root);
  return found;
}

function renderModule(corpus: CompiledCorpus, sources: readonly CorpusSourceFile[]): string {
  const header = [
    "// GENERATED FILE — DO NOT EDIT.",
    "//",
    "// Produced from packages/weave-os/corpus/*.yaml by scripts/compile-corpus.ts. Edit the",
    "// YAML and run `pnpm --filter @resonance/weave-os corpus:compile`; `corpus:check` runs in",
    "// `build` and fails if the two have drifted apart.",
    "//",
    "// Compiled from:",
    ...sources.map((source) => `//   - corpus/${source.path}`),
    "",
    'import type { CompiledCorpus } from "./corpus-types";',
    'import { deepFreeze } from "./freeze";',
    "",
    // The type argument is load-bearing: it makes the literal below *checked against*
    // `CompiledCorpus` rather than inferred and then assigned. Inference over a
    // heterogeneous array synthesises optional `undefined` members that then fail to
    // satisfy the open record types the corpus uses for authored keys.
    "export const COMPILED_CORPUS: CompiledCorpus = deepFreeze<CompiledCorpus>(",
  ].join("\n");

  const body = JSON.stringify(corpus, null, 2)
    .split("\n")
    .map((line) => `  ${line}`)
    .join("\n");

  return `${header}\n${body},\n);\n`;
}
