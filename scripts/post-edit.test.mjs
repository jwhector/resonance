import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, realpathSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { postEdit } from "./post-edit.mjs";

test("formats a path literally and lints from its owning workspace", () => {
  const root = realpathSync(mkdtempSync(join(tmpdir(), "post-edit-")));
  try {
    const ws = join(root, "packages", "demo");
    mkdirSync(ws, { recursive: true });
    writeFileSync(join(ws, "package.json"), "{}");
    writeFileSync(join(ws, "eslint.config.mjs"), "export default [];");
    const file = join(ws, "file with $ and spaces.ts");
    writeFileSync(file, "const x=1");
    const calls = [];
    postEdit(
      { tool_input: { file_path: file } },
      {
        root,
        run: (args, cwd) => {
          calls.push({ args, cwd });
          return { status: 0 };
        },
      },
    );
    assert.deepEqual(calls, [
      { args: ["exec", "prettier", "--write", file], cwd: root },
      { args: ["exec", "eslint", "--fix", file], cwd: ws },
    ]);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("docs get only formatting, and missing tools produce visible nonblocking feedback", () => {
  const root = mkdtempSync(join(tmpdir(), "post-edit-"));
  try {
    const file = join(root, "guide.md");
    writeFileSync(file, "# Guide");
    const warnings = [],
      calls = [];
    postEdit(
      { tool_input: { path: file } },
      {
        root,
        run: (args) => {
          calls.push(args);
          return { status: 1 };
        },
        warn: (message) => warnings.push(message),
      },
    );
    assert.equal(calls.length, 1);
    assert.equal(warnings.length, 1);
    postEdit({}, { root, run: () => assert.fail("unexpected execution") });
    postEdit(
      { tool_input: { path: "missing.ts" } },
      { root, run: () => assert.fail("unexpected execution") },
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test("outside-root paths are not formatted", () => {
  const parent = mkdtempSync(join(tmpdir(), "post-edit-"));
  try {
    const root = join(parent, "repo");
    mkdirSync(root);
    writeFileSync(join(parent, "outside.ts"), "outside");
    postEdit(
      { tool_input: { path: "../outside.ts" } },
      { root, run: () => assert.fail("outside root") },
    );
  } finally {
    rmSync(parent, { recursive: true, force: true });
  }
});
