#!/usr/bin/env node
// Best-effort local feedback. Full validation belongs to the shipping gate and CI.
import { existsSync, readdirSync, readFileSync, realpathSync } from "node:fs";
import { delimiter, dirname, extname, isAbsolute, relative, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { pathToFileURL } from "node:url";

export function postEdit(payload, { root = process.cwd(), run, warn = console.error } = {}) {
  root = realpathSync(root);
  const input = payload.tool_input?.file_path ?? payload.tool_input?.path;
  if (typeof input !== "string") return;
  const file = resolve(root, input);
  if (!existsSync(file)) return;
  const local = relative(root, realpathSync(file));
  if (local === ".." || local.startsWith(`..\\`) || local.startsWith("../") || isAbsolute(local))
    return;
  if (!/\.(?:[cm]?[jt]sx?|json|md|css)$/.test(file)) return;
  const execute =
    run ??
    ((args, cwd) => {
      // pnpm's JS entrypoint avoids cmd.exe quoting for file names on Windows.
      const candidates = [
        process.env.npm_execpath,
        ...[dirname(process.execPath), ...(process.env.PATH ?? "").split(delimiter)].flatMap(
          (dir) => [
            resolve(dir, "node_modules/corepack/dist/pnpm.js"),
            resolve(dir, "node_modules/pnpm/bin/pnpm.cjs"),
          ],
        ),
      ];
      const cli = candidates.find(
        (candidate) => candidate && /pnpm\.(?:c?js)$/.test(candidate) && existsSync(candidate),
      );
      if (cli) return spawnSync(process.execPath, [cli, ...args], { cwd, encoding: "utf8" });
      if (process.platform === "win32")
        return { error: new Error("pnpm JS entrypoint unavailable") };
      return spawnSync("pnpm", args, { cwd, encoding: "utf8" });
    });
  const check = (args, cwd) => {
    const result = execute(args, cwd);
    if (result.error || result.status !== 0)
      warn(
        `post-edit: ${args[1]} failed or unavailable; run the corresponding check before shipping.`,
      );
  };
  check(["exec", "prettier", "--write", file], root);
  if (!/\.[jt]sx?$/.test(extname(file))) return;
  let workspace = dirname(file);
  while (workspace !== root && !existsSync(resolve(workspace, "package.json")))
    workspace = dirname(workspace);
  if (readdirSync(workspace).some((name) => /^eslint\.config\.[cm]?js$/.test(name))) {
    check(["exec", "eslint", "--fix", file], workspace);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    postEdit(JSON.parse(readFileSync(0, "utf8")));
  } catch (error) {
    console.error(`post-edit: ${error.message}`);
  }
}
