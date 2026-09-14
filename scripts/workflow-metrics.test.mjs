import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execFileSync } from "node:child_process";
import { summarize, audit, validateEvent, main } from "./workflow-metrics.mjs";

const head = "a".repeat(40);
const time = (minute) => new Date(Date.UTC(2026, 8, 13, 12, minute)).toISOString();
const feature = (overrides = {}) => ({
  version: 1,
  id: "demo",
  size: "M",
  risk: "normal",
  started_at: time(0),
  ended_at: time(20),
  base: head,
  head,
  outcome: "validated",
  coverage: "complete",
  diff: { files: 2, packages: 1, added: 30, deleted: 10, binary_files: 0 },
  ...overrides,
});
const event = (id, start, end, overrides = {}) => ({
  id,
  invocation: id,
  worktree_dirty: false,
  phase: "build",
  reason: "initial",
  run: "run-1",
  head,
  harness: "codex",
  requested_model: "gpt-5.6-terra",
  resolved_model: "gpt-5.6-terra",
  effort: "high",
  started_at: time(start),
  ended_at: time(end),
  source: "harness",
  tokens: { input_uncached: 100, input_cached: 50, cache_write: 0, output: 20 },
  outcome: "completed",
  ...overrides,
});

test("parallel work is summed for agent effort but unioned for elapsed activity", () => {
  const events = [
    event("a", 0, 10),
    event("b", 5, 15),
    event("wait", 10, 20, {
      phase: "wait",
      reason: "human",
      harness: "none",
      requested_model: null,
      resolved_model: null,
      effort: null,
      tokens: null,
    }),
  ];
  const result = summarize(feature(), events);
  assert.equal(result.active_wall_minutes, 15);
  assert.equal(result.agent_minutes, 20);
  assert.equal(result.wait_only_minutes, 5);
  assert.equal(result.elapsed_minutes, 20);
  assert.equal(result.unobserved_minutes, 0);
  assert.equal(result.total_tokens, 340);
  assert.equal(result.tokens_per_100_changed_lines, 850);
});

test("unknown tokens and incomplete feature coverage are never totalled as zero", () => {
  const events = [event("a", 0, 10), event("b", 10, 15, { tokens: null })];
  const summary = summarize(feature(), events);
  assert.equal(summary.total_tokens, null);
  assert.equal(summary.token_coverage, 0.5);
  assert.equal(summary.observed_tokens_lower_bound, 170);
  assert.equal(summary.unobserved_minutes, 5);
  assert.equal(summarize(feature({ coverage: "partial" }), [event("a", 0, 10)]).total_tokens, null);
});

test("unknown model still counts as a model invocation", () => {
  const result = summarize(feature(), [
    event("a", 0, 10, { requested_model: null, resolved_model: null, tokens: null }),
  ]);
  assert.equal(result.ai_invocations, 1);
  assert.equal(result.token_coverage, 0);
});

test("duplicate invocations and raw/private fields are rejected", () => {
  const a = event("a", 0, 10);
  assert.throws(() => summarize(feature(), [a, { ...a, id: "b" }]), /duplicate/);
  assert.throws(() => validateEvent({ ...a, prompt: "private" }), /unknown field/);
  assert.throws(() => validateEvent({ ...a, id: "../escape" }), /identifier/);
  assert.throws(() => validateEvent({ ...a, tokens: { ...a.tokens, output: -1 } }), /nonnegative/);
  assert.throws(() => validateEvent({ ...a, tokens: { input_uncached: 4 } }), /nonnegative/);
  assert.throws(() => validateEvent({ ...a, ended_at: time(-1) }), /before/);
  assert.throws(() => summarize(feature(), [event("b", 19, 21)]), /outside/);
});

test("reviews distinguish initial, retries, cross-checks and fixes", () => {
  const events = [
    event("r1", 0, 2, { phase: "review", outcome: "findings" }),
    event("fix", 2, 3, { phase: "fix", reason: "fix" }),
    event("r2", 3, 4, { phase: "review", reason: "fix" }),
    event("r3", 4, 5, {
      phase: "review",
      reason: "cross-check",
      harness: "claude",
      requested_model: "opus",
      resolved_model: null,
    }),
  ];
  const summary = summarize(feature(), events);
  assert.equal(summary.review_passes, 3);
  assert.equal(summary.fix_invocations, 1);
  assert.equal(summary.review_model_unknown, 1);
  assert.deepEqual(summary.review_reasons, { initial: 1, fix: 1, "cross-check": 1 });
});

test("cohorts exclude incomplete and failed outcomes, retain their observed summaries", () => {
  const records = [
    ...Array.from({ length: 5 }, (_, i) => ({
      feature: feature({ id: "ok-" + i }),
      events: [event("a", 0, 10, { phase: "review", outcome: "passed" })],
    })),
    { feature: feature({ id: "partial", coverage: "partial" }), events: [event("a", 0, 20)] },
    { feature: feature({ id: "failed", outcome: "blocked" }), events: [event("a", 0, 20)] },
    { feature: feature({ id: "high", risk: "high" }), events: [event("a", 0, 20)] },
  ];
  const result = audit(records);
  assert.equal(result.summaries.length, 8);
  assert.equal(result.cohorts[0].baseline_ready, true);
  assert.equal(result.cohorts[0].timing_samples, 5);
  assert.equal(result.cohorts[0].median_active_minutes, 10);
  assert.equal(result.cohorts[1].baseline_ready, false);
});

test("CLI persists sanitized events, rejects overwrite and snapshots committed diff", () => {
  const dir = mkdtempSync(join(tmpdir(), "workflow-metrics-"));
  const git = (...args) => execFileSync("git", args, { cwd: dir, stdio: "pipe" }).toString().trim();
  try {
    git("init");
    git("config", "user.name", "Test");
    git("config", "user.email", "test@example.invalid");
    writeFileSync(join(dir, "one.txt"), "one\n");
    git("add", ".");
    git("commit", "-m", "base");
    const base = git("rev-parse", "HEAD");
    main(["start", "demo", "S", "normal", base], dir);
    assert.throws(() => main(["start", "demo", "S", "normal", base], dir), /EEXIST/);
    const started = JSON.parse(
      readFileSync(join(dir, "workflow/metrics/demo/feature.json"), "utf8"),
    ).started_at;
    const e = event("a", 0, 1, { started_at: started, ended_at: started });
    writeFileSync(join(dir, "event.json"), JSON.stringify(e));
    main(["record", "demo", "event.json"], dir);
    assert.throws(() => main(["record", "demo", "event.json"], dir), /duplicate/);
    mkdirSync(join(dir, "packages/foo"), { recursive: true });
    writeFileSync(join(dir, "packages/foo/file with spaces.ts"), "hello\n");
    git("add", "packages", "workflow");
    git("commit", "-m", "feature");
    const result = main(["finish", "demo", "HEAD", "validated", "partial"], dir);
    assert.deepEqual(result.diff, { files: 1, packages: 1, added: 1, deleted: 0, binary_files: 0 });
    assert.equal(main(["validate"], dir).valid, true);
    assert.equal(main(["audit"], dir).summaries.length, 1);
    assert.throws(() => main(["start", "../bad", "S", "normal", base], dir), /identifier/);
    assert.throws(() => main(["record", "unknown", "event.json"], dir), /unknown feature/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("high-risk cross-check requires both qualifying models on the final candidate", () => {
  const primary = event("terra", 0, 2, { phase: "review", outcome: "passed" });
  const second = event("opus", 2, 4, {
    phase: "review",
    reason: "cross-check",
    outcome: "passed",
    harness: "claude",
    requested_model: "opus",
    resolved_model: "claude-opus-5",
  });
  assert.equal(
    summarize(feature({ risk: "high" }), [primary, second]).final_candidate_cross_check,
    "observed",
  );
  assert.equal(
    summarize(feature({ risk: "high" }), [primary, { ...second, head: "b".repeat(40) }])
      .final_candidate_cross_check,
    "missing",
  );
  const wrong = { ...second, resolved_model: "claude-sonnet-5" };
  assert.deepEqual(summarize(feature(), [primary, wrong]).review_model_mismatches, ["opus"]);
});

test("invalid calendar dates and shortened/full-length impostor hashes are rejected", () => {
  assert.throws(() => validateEvent(event("bad", 0, 1, { head: "a".repeat(41) })), /commit SHA/);
  assert.throws(
    () => validateEvent(event("bad", 0, 1, { started_at: "2026-02-30T12:00:00Z" })),
    /calendar/,
  );
});
