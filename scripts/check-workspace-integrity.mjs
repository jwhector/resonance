#!/usr/bin/env node
// check-workspace-integrity.mjs — verify every workspace context (packages/* +
// apps/web) is wired into the agentic framework: it has a CLAUDE.md and a
// registered mulch domain, and the treehouse pool can give each one a worktree
// (ADR-0016). This is what makes a new package integrate seamlessly instead of
// silently drifting out of the framework.
//
//   node scripts/check-workspace-integrity.mjs            full scan; exits 1 on issues
//                                                          (CI / `pnpm check:workspace`)
//   node scripts/check-workspace-integrity.mjs --changed  only contexts whose
//                                                          package.json changed this
//                                                          session; soft, never fails
//                                                          (used as a Stop hook)
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { execFileSync } from "node:child_process";

const changedOnly = process.argv.includes("--changed");

// Run from repo root regardless of the caller's cwd.
try {
  process.chdir(execFileSync("git", ["rev-parse", "--show-toplevel"], { encoding: "utf8" }).trim());
} catch {
  /* not a git repo — fall back to cwd */
}

// Contexts an agent works in and records to: packages/* (with a package.json) + apps/web.
// tooling/* are shared configs, not domains — deliberately excluded.
const contexts = [];
if (existsSync("packages")) {
  for (const d of readdirSync("packages", { withFileTypes: true })) {
    if (d.isDirectory() && existsSync(`packages/${d.name}/package.json`)) {
      contexts.push({ dir: `packages/${d.name}`, name: d.name });
    }
  }
}
if (existsSync("apps/web/package.json")) contexts.push({ dir: "apps/web", name: "web" });

// In --changed mode, only inspect contexts whose package.json is new/modified this session.
let scan = contexts;
if (changedOnly) {
  let changed = "";
  try {
    changed = execFileSync("git", ["status", "--porcelain", "--", "packages", "apps"], {
      encoding: "utf8",
    });
  } catch {
    /* ignore */
  }
  const dirty = changed
    .split("\n")
    .map((l) => l.slice(3).trim())
    .filter((f) => f.endsWith("package.json"));
  scan = contexts.filter((c) => dirty.includes(`${c.dir}/package.json`));
  if (scan.length === 0) process.exit(0);
}

const issues = [];
for (const c of scan) {
  if (!existsSync(`${c.dir}/CLAUDE.md`)) {
    issues.push(`${c.dir}: missing CLAUDE.md`);
  }
  if (!existsSync(`.mulch/expertise/${c.name}.jsonl`)) {
    issues.push(`${c.dir}: no mulch domain '${c.name}' — run: ml add ${c.name}`);
  }
}

// The treehouse pool should be able to give every context its own worktree (+headroom).
if (existsSync("treehouse.toml")) {
  const m = readFileSync("treehouse.toml", "utf8").match(/^\s*max_trees\s*=\s*(\d+)/m);
  if (m) {
    const max = Number(m[1]);
    const need = contexts.length + 2;
    if (max < need) {
      issues.push(
        `treehouse max_trees=${max} < contexts+2=${need} — bump max_trees in treehouse.toml`,
      );
    }
  }
}

if (issues.length === 0) {
  if (!changedOnly) {
    console.log(
      `✓ workspace integrity: all ${contexts.length} contexts wired (CLAUDE.md + mulch domain)`,
    );
  }
  process.exit(0);
}

console.error(`Workspace integrity — ${issues.length} issue(s) (ADR-0016):`);
for (const i of issues) console.error(`  • ${i}`);
// CI / manual → fail the gate. Stop hook (--changed) → soft nudge, non-blocking.
process.exit(changedOnly ? 0 : 1);
