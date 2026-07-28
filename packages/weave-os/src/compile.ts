import { JSON_SCHEMA, load as parseYaml } from "js-yaml";
import { ValidationError, CorpusFileSchema } from "@resonance/core";
import { PatternRegistryRulebookSchema, type PatternRegistryRulebook } from "./registry-rulebook";
import type { CompiledCorpus, CompiledCorpusFile, CorpusSourceFile } from "./corpus-types";

/**
 * The build-time half of the package: authored YAML in, validated typed objects out.
 *
 * ## Why this is build-time and not runtime
 *
 * The corpus ships as code, not as files (ADR-0020 § 1). A malformed corpus therefore
 * fails the build rather than a creator's conversation, nothing depends on the file
 * layout surviving a bundler, and no request pays a parse cost. `scripts/compile-corpus.ts`
 * reads the YAML off disk and writes `src/corpus.generated.ts`; this module does the part
 * that is worth testing, and does it without touching the filesystem so a test can hand it
 * whatever text it likes.
 *
 * This module is intentionally NOT exported from the package entrypoint. Callers get the
 * already-compiled corpus; only the code generator and this package's own tests compile.
 */

/**
 * Parse and schema-validate every authored file.
 *
 * Throws `ValidationError` naming the path and the failing field on the first file that
 * does not satisfy its schema — this is the "malformed corpus fails the build" guarantee,
 * so it must be loud rather than lenient. Cross-file problems (an id that does not
 * resolve, a sequence that disagrees with its stages) are NOT checked here; they are
 * diagnostics, not parse failures, and they live in `diagnostics.ts`.
 */
export function compileCorpus(sources: readonly CorpusSourceFile[]): CompiledCorpus {
  const files: CompiledCorpusFile[] = [];
  let registry: PatternRegistryRulebook | null = null;

  for (const source of sources) {
    const document = readYaml(source);
    const type =
      typeof document === "object" && document !== null
        ? (document as { type?: unknown }).type
        : undefined;

    if (type === "pattern_registry") {
      if (registry !== null) {
        throw new ValidationError(
          `Corpus holds more than one pattern registry rulebook; the second is ${source.path}.`,
        );
      }
      registry = parseWith(PatternRegistryRulebookSchema, document, source.path);
      continue;
    }

    files.push({ path: source.path, file: parseWith(CorpusFileSchema, document, source.path) });
  }

  return { files, registry };
}

/**
 * Parse with YAML's JSON schema rather than its default one.
 *
 * The default schema resolves `2026-07-14` to a Date and `no` to `false`, which would
 * quietly change an authored value on its way into the corpus. Restricting resolution to
 * the JSON types means what the author wrote is what the schemas see, and every compiled
 * value is representable in the generated module.
 */
function readYaml(source: CorpusSourceFile): unknown {
  try {
    return parseYaml(source.text, { schema: JSON_SCHEMA });
  } catch (cause) {
    throw new ValidationError(`Corpus file ${source.path} is not valid YAML.`, { cause });
  }
}

function parseWith<T>(
  schema: { safeParse: (v: unknown) => SafeParse<T> },
  document: unknown,
  path: string,
): T {
  const result = schema.safeParse(document);
  if (result.success) return result.data;
  throw new ValidationError(
    `Corpus file ${path} does not satisfy its schema:\n${formatIssues(result.error.issues)}`,
    { cause: result.error },
  );
}

type SafeParse<T> =
  | { success: true; data: T }
  | {
      success: false;
      error: { issues: readonly { path: readonly PropertyKey[]; message: string }[] };
    };

function formatIssues(
  issues: readonly { path: readonly PropertyKey[]; message: string }[],
): string {
  return issues
    .map(
      (issue) => `  - ${issue.path.length > 0 ? issue.path.join(".") : "<root>"}: ${issue.message}`,
    )
    .join("\n");
}
