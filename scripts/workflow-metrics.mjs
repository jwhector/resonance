#!/usr/bin/env node
// Portable, allowlisted measurements. Raw transcripts are never read or persisted here.
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

const phases = [
  "plan",
  "explore",
  "build",
  "review",
  "fix",
  "test",
  "document",
  "lint",
  "integrate",
  "ci",
  "wait",
  "audit",
];
const reasons = [
  "initial",
  "fix",
  "conflict",
  "new-code",
  "cross-check",
  "restart",
  "feedback",
  "human",
  "queue",
  "merge",
  "setup",
];
const tokenKeys = ["input_uncached", "input_cached", "cache_write", "output"];
const idPattern = /^[a-zA-Z0-9][a-zA-Z0-9_.-]{0,95}$/;
function fail(message) {
  throw new Error(message);
}
function keys(value, allowed, label) {
  if (!value || typeof value !== "object" || Array.isArray(value))
    fail(`${label}: expected object`);
  for (const key of Object.keys(value))
    if (!allowed.includes(key)) fail(`${label}: unknown field ${key}`);
}
function id(value, label) {
  if (typeof value !== "string" || !idPattern.test(value) || value.includes(".."))
    fail(`${label}: invalid identifier`);
  return value;
}
function choice(value, values, label) {
  if (!values.includes(value)) fail(`${label}: expected ${values.join("/")}`);
  return value;
}
function count(value, label) {
  if (!Number.isSafeInteger(value) || value < 0) fail(`${label}: expected nonnegative integer`);
  return value;
}
function timestamp(value) {
  if (
    typeof value !== "string" ||
    !/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{3})?Z$/.test(value) ||
    !Number.isFinite(Date.parse(value))
  )
    fail("expected UTC ISO timestamp");
  const canonical = value.includes(".") ? value : value.replace("Z", ".000Z");
  if (new Date(value).toISOString() !== canonical) fail("invalid calendar timestamp");
  return Date.parse(value);
}
function sha(value) {
  if (!/^(?:[a-f0-9]{40}|[a-f0-9]{64})$/.test(value ?? "")) fail("expected full commit SHA");
  return value;
}
function optionalId(value, label) {
  if (value === null) return null;
  const allowed = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_./:[]-";
  if (
    typeof value !== "string" ||
    value.length < 1 ||
    value.length > 128 ||
    [...value].some((c) => !allowed.includes(c))
  )
    fail(label + ": invalid model identifier");
  return value;
}

export function validateEvent(event) {
  keys(
    event,
    [
      "id",
      "invocation",
      "worktree_dirty",
      "phase",
      "reason",
      "run",
      "head",
      "harness",
      "requested_model",
      "resolved_model",
      "effort",
      "started_at",
      "ended_at",
      "source",
      "tokens",
      "outcome",
    ],
    "event",
  );
  if (typeof event.worktree_dirty !== "boolean") fail("worktree_dirty: expected boolean");
  id(event.id, "event.id");
  id(event.invocation, "invocation");
  id(event.run, "run");
  choice(event.phase, phases, "phase");
  choice(event.reason, reasons, "reason");
  sha(event.head);
  id(event.harness, "harness");
  optionalId(event.requested_model, "requested_model");
  optionalId(event.resolved_model, "resolved_model");
  if (event.effort !== null)
    choice(
      event.effort,
      ["none", "minimal", "low", "medium", "high", "xhigh", "max", "ultra"],
      "effort",
    );
  if (timestamp(event.ended_at) < timestamp(event.started_at)) fail("event ends before it starts");
  choice(event.source, ["harness", "gate", "manual"], "source");
  choice(
    event.outcome,
    ["passed", "findings", "failed", "cancelled", "completed", "skipped"],
    "outcome",
  );
  if (event.tokens !== null) {
    keys(event.tokens, tokenKeys, "tokens");
    for (const key of tokenKeys) count(event.tokens[key], key);
    if (["wait", "ci"].includes(event.phase))
      fail("wait/ci events contain no model usage; record CI repair under fix");
  }
  return event;
}

export function validateFeature(feature) {
  keys(
    feature,
    [
      "version",
      "id",
      "size",
      "risk",
      "started_at",
      "ended_at",
      "base",
      "head",
      "outcome",
      "coverage",
      "diff",
    ],
    "feature",
  );
  if (feature.version !== 1) fail("unsupported feature version");
  id(feature.id, "feature.id");
  choice(feature.size, ["S", "M", "L"], "size");
  choice(feature.risk, ["normal", "high"], "risk");
  timestamp(feature.started_at);
  sha(feature.base);
  if (feature.head !== null) sha(feature.head);
  if (feature.ended_at !== null && timestamp(feature.ended_at) < timestamp(feature.started_at))
    fail("feature ends before it starts");
  choice(
    feature.outcome,
    ["in_progress", "validated", "shipped", "blocked", "cancelled"],
    "outcome",
  );
  choice(feature.coverage, ["partial", "complete"], "coverage");
  if (feature.diff !== null) {
    keys(feature.diff, ["files", "packages", "added", "deleted", "binary_files"], "diff");
    for (const key of ["files", "packages", "added", "deleted", "binary_files"])
      count(feature.diff[key], key);
  }
  return feature;
}

export function unionMs(intervals) {
  const sorted = intervals.map(([a, b]) => [a, b]).sort((a, b) => a[0] - b[0]);
  let total = 0,
    start,
    end;
  for (const [a, b] of sorted) {
    if (start === undefined) {
      start = a;
      end = b;
    } else if (a <= end) end = Math.max(end, b);
    else {
      total += end - start;
      start = a;
      end = b;
    }
  }
  return total + (start === undefined ? 0 : end - start);
}

export function summarize(feature, events) {
  validateFeature(feature);
  const identities = new Set(),
    invocations = new Set();
  for (const event of events) {
    validateEvent(event);
    const identity = `${event.harness}/${event.invocation}`;
    if (identities.has(event.id) || invocations.has(identity))
      fail("duplicate event or invocation: would double-count usage");
    identities.add(event.id);
    invocations.add(identity);
    if (
      timestamp(event.started_at) < timestamp(feature.started_at) ||
      (feature.ended_at && timestamp(event.ended_at) > timestamp(feature.ended_at))
    )
      fail("event outside feature interval");
  }
  const interval = (event) => [timestamp(event.started_at), timestamp(event.ended_at)];
  const active = events.filter((e) => !["wait", "ci"].includes(e.phase));

  const ai = active.filter((e) => e.harness !== "none");
  const known = ai.filter((e) => e.tokens !== null);
  const tokens = Object.fromEntries(
    tokenKeys.map((key) => [key, known.reduce((sum, event) => sum + event.tokens[key], 0)]),
  );
  const observedTokens = Object.values(tokens).reduce((sum, value) => sum + value, 0);
  const activeMs = unionMs(active.map(interval));
  const accountedMs = unionMs(events.map(interval));
  const waitOnlyMs = accountedMs - activeMs;
  const end = feature.ended_at
    ? timestamp(feature.ended_at)
    : Math.max(timestamp(feature.started_at), ...events.map((e) => timestamp(e.ended_at)));
  const elapsedMs = end - timestamp(feature.started_at);
  const reviews = events.filter((e) => e.phase === "review");
  const family = (model) => {
    const name = model?.split("/").at(-1);
    if (name === "opus" || name?.startsWith("opus[") || name?.startsWith("claude-opus-"))
      return "opus";
    return name === "gpt-5.6-terra" ? "terra" : null;
  };
  const currentFamilies = new Set(
    reviews
      .filter(
        (e) =>
          e.head === feature.head &&
          !e.worktree_dirty &&
          e.outcome === "passed" &&
          e.effort === "high",
      )
      .map((e) => family(e.resolved_model)),
  );
  const byReason = Object.fromEntries(
    [...new Set(reviews.map((e) => e.reason))].map((reason) => [
      reason,
      reviews.filter((e) => e.reason === reason).length,
    ]),
  );
  const churn = feature.diff ? feature.diff.added + feature.diff.deleted : null;
  const complete = feature.coverage === "complete" && ai.length > 0 && known.length === ai.length;
  return {
    feature: feature.id,
    size: feature.size,
    risk: feature.risk,
    outcome: feature.outcome,
    coverage: feature.coverage,
    diff: feature.diff,
    observed_through: new Date(end).toISOString(),
    elapsed_minutes: elapsedMs / 60000,
    active_wall_minutes: activeMs / 60000,
    agent_minutes:
      ai.reduce((sum, e) => sum + timestamp(e.ended_at) - timestamp(e.started_at), 0) / 60000,
    wait_only_minutes: waitOnlyMs / 60000,
    unobserved_minutes: Math.max(0, elapsedMs - accountedMs) / 60000,
    ai_invocations: ai.length,
    token_observed_invocations: known.length,
    token_coverage: ai.length ? known.length / ai.length : null,
    tokens_observed: tokens,
    total_tokens: complete ? observedTokens : null,
    observed_tokens_lower_bound: observedTokens,
    review_passes: reviews.length,
    review_reasons: byReason,
    fix_invocations: events.filter((e) => e.phase === "fix").length,
    review_model_unknown: reviews.filter((e) => e.resolved_model === null || e.effort === null)
      .length,
    review_model_mismatches: reviews
      .filter(
        (e) =>
          e.resolved_model !== null &&
          (!family(e.resolved_model) || (e.effort !== null && e.effort !== "high")),
      )
      .map((e) => e.id),
    final_candidate_review:
      currentFamilies.has("opus") || currentFamilies.has("terra") ? "observed" : "missing",
    final_candidate_cross_check:
      feature.risk !== "high"
        ? "not-required"
        : feature.head === null
          ? "unknown"
          : currentFamilies.has("opus") && currentFamilies.has("terra")
            ? "observed"
            : "missing",
    tokens_per_100_changed_lines: complete && churn > 0 ? (observedTokens / churn) * 100 : null,
    active_minutes_per_changed_file: feature.diff?.files
      ? activeMs / 60000 / feature.diff.files
      : null,
    phases: Object.fromEntries(
      [...new Set(events.map((e) => e.phase))].map((phase) => {
        const matching = events.filter((e) => e.phase === phase);
        return [
          phase,
          {
            invocations: matching.length,
            minutes:
              matching.reduce(
                (sum, e) => sum + timestamp(e.ended_at) - timestamp(e.started_at),
                0,
              ) / 60000,
          },
        ];
      }),
    ),
  };
}

export function audit(records) {
  const summaries = records.map(({ feature, events }) => summarize(feature, events));
  const median = (numbers) => {
    if (!numbers.length) return null;
    const sorted = [...numbers].sort((a, b) => a - b),
      mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
  };
  const cohorts = [];
  for (const size of ["S", "M", "L"])
    for (const risk of ["normal", "high"]) {
      const all = summaries.filter((s) => s.size === size && s.risk === risk);
      if (!all.length) continue;
      const eligible = all.filter(
        (s) =>
          ["validated", "shipped"].includes(s.outcome) &&
          s.coverage === "complete" &&
          s.final_candidate_review === "observed" &&
          s.final_candidate_cross_check !== "missing" &&
          s.review_model_mismatches.length === 0 &&
          s.review_model_unknown === 0,
      );
      const measured = eligible.filter((s) => s.total_tokens !== null);
      cohorts.push({
        size,
        risk,
        features: all.length,
        timing_samples: eligible.length,
        token_samples: measured.length,
        baseline_ready: eligible.length >= 5 && measured.length >= 5,
        median_active_minutes: median(eligible.map((s) => s.active_wall_minutes)),
        median_tokens: median(measured.map((s) => s.total_tokens)),
        median_review_passes: median(eligible.map((s) => s.review_passes)),
      });
    }
  return { summaries, cohorts };
}

function git(args, cwd) {
  return execFileSync("git", args, {
    cwd,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();
}
function commit(ref, cwd) {
  return sha(git(["rev-parse", "--verify", "--end-of-options", `${ref}^{commit}`], cwd));
}
export function diffStats(base, head, cwd) {
  const fields = git(
    [
      "diff",
      "--numstat",
      "-z",
      "--no-renames",
      base,
      head,
      "--",
      ".",
      ":(exclude)workflow/metrics/**",
    ],
    cwd,
  )
    .split("\0")
    .filter(Boolean);
  const stats = { files: fields.length, packages: 0, added: 0, deleted: 0, binary_files: 0 },
    packages = new Set();
  for (const field of fields) {
    const match = /^(\d+|-)\t(\d+|-)\t([\s\S]+)$/.exec(field);
    if (!match) fail("unrecognized git numstat record");
    const [, added, deleted, path] = match;
    if (added === "-") stats.binary_files++;
    else {
      stats.added += Number(added);
      stats.deleted += Number(deleted);
    }
    const pkg = /^(packages|apps)\/([^/]+)\//.exec(path);
    if (pkg) packages.add(`${pkg[1]}/${pkg[2]}`);
  }
  stats.packages = packages.size;
  return stats;
}

function read(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}
function writeNew(path, value) {
  writeFileSync(path, JSON.stringify(value, null, 2) + "\n", { flag: "wx" });
}
function records(root) {
  if (!existsSync(root)) return [];
  return readdirSync(root, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((entry) => {
      id(entry.name, "feature directory");
      const dir = resolve(root, entry.name),
        feature = read(resolve(dir, "feature.json"));
      if (feature.id !== entry.name) fail("feature directory/id mismatch");
      const eventsDir = resolve(dir, "events");
      const events = existsSync(eventsDir)
        ? readdirSync(eventsDir)
            .filter((name) => name.endsWith(".json"))
            .map((name) => read(resolve(eventsDir, name)))
        : [];
      return { feature, events };
    });
}

export function main(args = process.argv.slice(2), cwd = process.cwd()) {
  const [command, ...rest] = args;
  const root = resolve(cwd, "workflow/metrics");
  if (command === "audit" || command === "validate") {
    if (rest.length) fail("audit/validate accept no arguments");
    const result = audit(records(root));
    return command === "audit" ? result : { valid: true, features: result.summaries.length };
  }
  if (command === "start") {
    const [featureId, size, risk, baseRef] = rest;
    if (rest.length !== 4) fail("start <id> <S|M|L> <normal|high> <base-ref>");
    const feature = validateFeature({
      version: 1,
      id: featureId,
      size,
      risk,
      started_at: new Date().toISOString(),
      ended_at: null,
      base: commit(baseRef, cwd),
      head: null,
      outcome: "in_progress",
      coverage: "partial",
      diff: null,
    });
    const dir = resolve(root, feature.id);
    mkdirSync(resolve(dir, "events"), { recursive: true });
    writeNew(resolve(dir, "feature.json"), feature);
    return feature;
  }
  if (command === "record") {
    const [featureId, eventFile] = rest;
    if (rest.length !== 2) fail("record <feature-id> <sanitized-event.json>");
    id(featureId, "feature id");
    const record = records(root).find((r) => r.feature.id === featureId);
    if (!record) fail("unknown feature");
    const event = validateEvent(read(resolve(cwd, eventFile)));
    summarize(record.feature, [...record.events, event]);
    writeNew(resolve(root, featureId, "events", `${event.id}.json`), event);
    return { recorded: event.id };
  }
  if (command === "finish") {
    const [featureId, headRef, outcome, coverage] = rest;
    if (rest.length !== 4)
      fail("finish <id> <head-ref> <validated|shipped|blocked|cancelled> <partial|complete>");
    id(featureId, "feature id");
    choice(outcome, ["validated", "shipped", "blocked", "cancelled"], "outcome");
    const record = records(root).find((r) => r.feature.id === featureId);
    if (!record) fail("unknown feature");
    const head = commit(headRef, cwd);
    const feature = {
      ...record.feature,
      head,
      ended_at: new Date().toISOString(),
      outcome,
      coverage,
      diff: diffStats(record.feature.base, head, cwd),
    };
    const summary = summarize(feature, record.events);
    writeFileSync(
      resolve(root, featureId, "feature.json"),
      JSON.stringify(feature, null, 2) + "\n",
    );
    return summary;
  }
  if (command === "snapshot") {
    if (rest.length !== 2) fail("snapshot <base-ref> <head-ref>");
    return diffStats(commit(rest[0], cwd), commit(rest[1], cwd), cwd);
  }
  fail(
    "Usage: workflow-metrics.mjs start|record|finish|snapshot|audit|validate (see docs/workflow-metrics.md)",
  );
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    console.log(JSON.stringify(main(), null, 2));
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
