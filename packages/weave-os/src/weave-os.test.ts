import { readdirSync, readFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { PRINCIPLE_DIMENSIONS, ValidationError } from "@resonance/core";
import { corpusErrors, resolveWeaveOs, weaveOsDiagnostics, weaveOsRegistry } from "./index";
import { compileCorpus } from "./compile";
import type { CorpusSourceFile } from "./corpus-types";
import { COMPILED_CORPUS } from "./corpus.generated";
import { computeReleaseId } from "./release";

/**
 * The package is tested through its seam: almost everything below goes through
 * `resolveWeaveOs` or `weaveOsDiagnostics`, because those are what a caller sees. The
 * exceptions are the two invariants a caller cannot observe but a build depends on — that
 * the generated corpus still matches the YAML, and that the release id is a function of
 * content.
 */

const FLOW = "emerging_creator_onboarding";
const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

describe("the shipped corpus", () => {
  it("compiles from the authored YAML to exactly the committed module", () => {
    // Without this the generated module could drift from the files CODEOWNERS governs,
    // and a reviewed YAML change would have no effect on what Weave says.
    expect(compileCorpus(readCorpusYaml())).toEqual(COMPILED_CORPUS);
  });

  it("holds one file per authored source, plus the registry rulebook", () => {
    expect(COMPILED_CORPUS.files.map((entry) => entry.file.id).sort()).toEqual([
      "emerging_creator_onboarding",
      "weave_behavior_rules",
      "weave_conversation_heuristics",
      "weave_interaction_philosophy",
      "weave_interaction_principles",
    ]);
    expect(weaveOsRegistry?.id).toBe("weave_pattern_registry");
  });

  it("marks every transcribed record with where it came from and how far it is trusted", () => {
    const philosophy = COMPILED_CORPUS.files.find(
      (entry) => entry.file.type === "interaction_philosophy",
    )?.file;
    if (philosophy?.type !== "interaction_philosophy") throw new Error("no philosophy file");

    // A transcribed record must never read as an authored one.
    for (const limitation of philosophy.limitations) {
      expect(limitation.source).toMatch(/^derived_from:/);
      expect(limitation.confidence).toBe("design_hypothesis");
    }
    expect(philosophy.limitations).toHaveLength(12);
  });
});

describe("the cross-file validator", () => {
  const diagnostics = weaveOsDiagnostics();

  it("fails on all seven unresolved applied principles, naming each one", () => {
    // DECIDED, NOT A BUG. The flow's `applied_principles` and the principles file are two
    // vocabularies that do not meet. Mapping them to the nearest real principle would
    // author the designer's semantics on their behalf — the exact drift the corpus's
    // provenance rules exist to prevent. The failure ships; the designer resolves it.
    const unresolved = diagnostics.filter((d) => d.code === "unresolved_principle_reference");

    expect(unresolved.map((d) => d.at.replace("appliedPrinciples.", "")).sort()).toEqual([
      "creator_sovereignty",
      "discovery_over_directive",
      "expression_before_positioning",
      "low_cognitive_load",
      "provisional_identity",
      "reflection_not_interpretation",
      "relational_not_marketing_language",
    ]);
    for (const diagnostic of unresolved) {
      expect(diagnostic.severity).toBe("error");
      expect(diagnostic.fileId).toBe(FLOW);
    }
  });

  it("reports no error other than those seven", () => {
    // Anything new that lands here is a real regression, not the known open question.
    expect(
      corpusErrors(diagnostics)
        .filter((d) => d.code !== "unresolved_principle_reference")
        .map((d) => `${d.code} ${d.fileId}.${d.at}`),
    ).toEqual([]);
  });

  it("warns that the two promotion-target files reach no conversation", () => {
    // Both are empty by design and nothing inherits them, so a promotion into either
    // would change nothing until a flow names it. The designer needs to know that.
    expect(
      diagnostics
        .filter((d) => d.code === "uninherited_root_file")
        .map((d) => d.fileId)
        .sort(),
    ).toEqual(["weave_behavior_rules", "weave_conversation_heuristics"]);
  });

  it("catches the philosophy's parent-side inheritance list disagreeing with the edges", () => {
    // The philosophy claims `conversation_heuristics.yaml` inherits it; the file that
    // actually does is `weave_conversation_heuristics`. The child edge wins and the
    // divergence is reported (ADR-0020 § 5).
    const divergences = diagnostics.filter((d) => d.code === "inheritance_view_divergence");
    expect(divergences.length).toBeGreaterThan(0);
    expect(divergences.every((d) => d.fileId === "weave_interaction_philosophy")).toBe(true);
  });

  it("keeps the authored principles and the evaluation rubric in agreement", () => {
    expect(diagnostics.filter((d) => d.code === "principle_rubric_mismatch")).toEqual([]);
    const principles = COMPILED_CORPUS.files.find(
      (entry) => entry.file.type === "interaction_principles",
    )?.file;
    if (principles?.type !== "interaction_principles") throw new Error("no principles file");
    expect(principles.principles.map((p) => p.id).sort()).toEqual([...PRINCIPLE_DIMENSIONS].sort());
  });
});

describe("resolveWeaveOs", () => {
  it("returns a prompt, the flow machinery, the output constraints, and a release id", () => {
    const resolved = resolveWeaveOs({ flow: FLOW });

    expect(resolved.system.length).toBeGreaterThan(0);
    expect(resolved.flow.id).toBe(FLOW);
    expect(resolved.releaseId).toMatch(/^sha256:[0-9a-f]{64}$/);
    expect([...resolved.outputs.keys()].sort()).toEqual([
      "about",
      "creator_name",
      "discovery_tags",
      "expression_style",
      "foundability_feedback",
      "profile_headline",
      "resonant_people_summary",
    ]);
  });

  it("composes the philosophy, its limitations, and every principle into the prompt", () => {
    const { system } = resolveWeaveOs({ flow: FLOW });

    expect(system).toContain(
      "Weave exists to translate human imagination and expression into reality.",
    );
    expect(system).toContain("Weave will never:");
    expect(system).toContain("fabricate experiences");
    for (const principle of ["Support Heart", "Support Becoming", "Support Intuition"]) {
      expect(system).toContain(principle);
    }
  });

  it("composes each stage's purpose and the copy Weave speaks, in flow order", () => {
    const { system } = resolveWeaveOs({ flow: FLOW });

    expect(system).toContain("What are you drawn to creating, offering, or sharing with others?");
    expect(system).toContain("Never say: What transformation do you deliver?");
    expect(system.indexOf("Opening")).toBeLessThan(system.indexOf("Completion"));
  });

  it("leaves inactive records out of the prompt entirely", () => {
    // The registry's pattern observations live in the corpus as inactive records so they
    // are addressable and promotable. Reaching a prompt is exactly what they must not do.
    const { system } = resolveWeaveOs({ flow: FLOW });

    expect(system).not.toContain("Behaviour Rules");
    expect(system).not.toContain("Conversation Heuristics");
    expect(system).not.toContain("Short answers do not necessarily indicate disengagement");
  });

  it("returns the flow machinery typed but does not act on it", () => {
    const { flow } = resolveWeaveOs({ flow: FLOW });

    expect(flow.flowMap.sequence).toHaveLength(11);
    expect(flow.stages).toHaveLength(11);
    expect(flow.sessionState.currentStage).toBe("opening");
    expect(Object.keys(flow.sessionState.slots).sort()).toEqual([
      "collected",
      "completion",
      "generated",
      "preference_context",
      "selected",
    ]);
    // Captures and actions are typed and reachable, and nothing here executes them.
    const opening = flow.stages.find((stage) => stage.id === "opening");
    expect(opening?.captures[0]?.id).toBe("depth_mode");
    expect(opening?.actions.map((action) => action.id)).toEqual(["begin", "skip"]);
  });

  it("carries the requested depth into the flow's declared starting state", () => {
    expect(resolveWeaveOs({ flow: FLOW }).flow.sessionState.depthMode).toBe("guided");
    expect(
      resolveWeaveOs({ flow: FLOW, context: { depthMode: "reflective" } }).flow.sessionState
        .depthMode,
    ).toBe("reflective");
  });

  it("returns generation constraints normalised out of the authored vocabularies", () => {
    const { outputs } = resolveWeaveOs({ flow: FLOW });

    expect(outputs.get("profile_headline")?.constraints.characterCount).toEqual({
      minimum: 50,
      maximum: 100,
    });
    expect(outputs.get("discovery_tags")?.constraints.itemCount).toEqual({
      minimum: 5,
      maximum: 10,
    });
    expect(outputs.get("about")?.candidateCount).toBe(3);
    expect(outputs.get("resonant_people_summary")?.public).toBe(false);
  });

  it("refuses a flow the corpus does not define, and a file that is not a flow", () => {
    expect(() => resolveWeaveOs({ flow: "no_such_flow" })).toThrow(ValidationError);
    expect(() => resolveWeaveOs({ flow: "weave_interaction_principles" })).toThrow(ValidationError);
  });

  it("refuses a root module the corpus does not define", () => {
    // No specialised module is authored, so every id is unknown — which is the point:
    // a typo fails on the first call rather than silently routing nothing.
    expect(() => resolveWeaveOs({ flow: FLOW, context: { modules: ["no_such_module"] } })).toThrow(
      ValidationError,
    );
  });

  it("rejects a malformed request at the boundary", () => {
    // @ts-expect-error — a caller passing the wrong shape must be stopped by Zod, not by
    // TypeScript alone; the input crosses a trust boundary.
    expect(() => resolveWeaveOs({ flow: 42 })).toThrow();
    expect(() => resolveWeaveOs({ flow: "Not A Corpus Id" })).toThrow();
  });

  it("hands out a frozen corpus, so one caller cannot change what the next one sees", () => {
    const { flow } = resolveWeaveOs({ flow: FLOW });
    expect(Object.isFrozen(flow.stages)).toBe(true);
  });
});

describe("the release id", () => {
  it("is stable across calls and identical for an identical corpus", () => {
    expect(resolveWeaveOs({ flow: FLOW }).releaseId).toBe(resolveWeaveOs({ flow: FLOW }).releaseId);
    expect(computeReleaseId(COMPILED_CORPUS)).toBe(resolveWeaveOs({ flow: FLOW }).releaseId);
  });

  it("changes when any authored word changes", () => {
    // Evidence is attributed by this id, so an edit that leaves it unchanged would make
    // two different corpora indistinguishable in the evidence record.
    const edited = structuredClone(COMPILED_CORPUS) as typeof COMPILED_CORPUS;
    const philosophy = edited.files.find((entry) => entry.file.type === "interaction_philosophy");
    if (philosophy?.file.type !== "interaction_philosophy") throw new Error("no philosophy file");
    philosophy.file.blocks["purpose"] = "Something the designer did not write.";

    expect(computeReleaseId(edited)).not.toBe(computeReleaseId(COMPILED_CORPUS));
  });

  it("ignores the order authored keys happen to sit in", () => {
    const reordered = {
      registry: COMPILED_CORPUS.registry,
      files: COMPILED_CORPUS.files,
    };
    expect(computeReleaseId(reordered)).toBe(computeReleaseId(COMPILED_CORPUS));
  });
});

describe("compileCorpus", () => {
  it("rejects a file that is not valid YAML", () => {
    expect(() =>
      compileCorpus([{ path: "root/broken.yaml", text: "id: a\n  bad: indent" }]),
    ).toThrow(ValidationError);
  });

  it("rejects a file that does not satisfy its schema, naming the file and the field", () => {
    const text = [
      "id: rogue",
      'version: "1.0"',
      "status: active",
      "type: interaction_principles",
    ].join("\n");
    expect(() => compileCorpus([{ path: "root/rogue.yaml", text }])).toThrow(/root\/rogue\.yaml/);
  });

  it("rejects a record that claims no provenance", () => {
    // The rule the whole scheme rests on: a record without `source` and `confidence`
    // cannot be told apart from an authored one, so it does not load at all.
    const text = [
      "id: rogue",
      'version: "1.0"',
      "status: active",
      "type: conversation_heuristics",
      "heuristics:",
      "  - id: a_guess",
      "    interpretation: Something might be happening.",
      "    signals: [a signal]",
      "    responseDirections: [a direction]",
    ].join("\n");
    expect(() => compileCorpus([{ path: "root/rogue.yaml", text }])).toThrow(/source/);
  });
});

/** Read the authored corpus the way the code generator does. */
function readCorpusYaml(): readonly CorpusSourceFile[] {
  const root = join(packageRoot, "corpus");
  const found: CorpusSourceFile[] = [];
  const walk = (directory: string): void => {
    for (const entry of readdirSync(directory, { withFileTypes: true }).sort((a, b) =>
      a.name < b.name ? -1 : 1,
    )) {
      const absolute = join(directory, entry.name);
      if (entry.isDirectory()) walk(absolute);
      else if (entry.name.endsWith(".yaml")) {
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
