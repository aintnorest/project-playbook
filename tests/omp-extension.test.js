import { afterEach, beforeEach, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import projectPlaybook from "../omp-extension.ts";

let workspace;
let repo;
let tool;

function git(...args) {
  const result = spawnSync("git", args, { cwd: repo, encoding: "utf8" });
  if (result.error || result.status !== 0) {
    throw result.error ?? new Error(result.stderr);
  }
  return result.stdout.trim();
}

beforeEach(() => {
  workspace = mkdtempSync(join(tmpdir(), "playbook-tool-test-"));
  repo = join(workspace, "repo");
  mkdirSync(repo);
  const optional = { optional() { return this; }, nullable() { return this; }, describe() { return this; } };
  projectPlaybook({
    zod: { object: fields => fields, enum: values => values, string: () => optional },
    registerTool(definition) { tool = definition; },
  });
  writeFileSync(join(repo, "implementation-plan.md"),
    "### T01 — Acceptance test\n" +
    "- Depends on: none\n" +
    "- Targets: `tests/test_accept.py` (create)\n" +
    "- Protects: tests/test_accept.py\n" +
    "- Change: Verify approved TDD scenario.\n" +
    "- Done when: Missing behavior fails as specified.\n" +
    "- Verify: Run acceptance test; expect specified failure.\n\n" +
    "### T02 — Implementation\n" +
    "- Depends on: T01\n" +
    "  - T01 — supplies acceptance test.\n" +
    "- Targets: `src/main.py` (create)\n" +
    "- Change: Implement approved design.\n" +
    "- Done when: Protected scenario passes.\n" +
    "- Verify: Run acceptance test; expect pass.\n");
  git("init", "-q");
  git("-c", "user.name=Test", "-c", "user.email=test@example.invalid",
      "commit", "-q", "--allow-empty", "-m", "base");
});

afterEach(() => {
  rmSync(workspace, { recursive: true, force: true });
});

test("static checks accept absent, null, and empty protected-diff fields", async () => {
  const plan = "implementation-plan.md";
  for (const mode of ["check", "json"]) {
    for (const fields of [
      {},
      { repo: null, base: null, head: null, task: null },
      { repo: "", base: "", head: "", task: "" },
    ]) {
      const result = await tool.execute("test", { mode, plan, ...fields },
        undefined, undefined, { cwd: repo });
      expect(result.isError).toBeUndefined();
      expect(result.details.status).toBe("ok");
      if (mode === "json") expect(result.details.tasks.map(task => task.id)).toEqual(["T01", "T02"]);
    }
  }

  const rejected = await tool.execute("test",
    { mode: "check", plan, repo: ".", base: "", head: "", task: "" },
    undefined, undefined, { cwd: repo });
  expect(rejected.isError).toBe(true);
  expect(rejected.details.message).toBe("Check and JSON modes do not accept repo, base, head, task, or worktreeRoot.");
});

test("assigned candidate is checked in its recorded worktree through tool", async () => {
  const worktreeRoot = join(repo, ".worktrees");
  const worktree = join(worktreeRoot, "T02");
  writeFileSync(join(repo, ".gitignore"), ".worktrees/\n");
  git("add", ".gitignore");
  git("-c", "user.name=Test", "-c", "user.email=test@example.invalid",
    "commit", "-q", "-m", "ignore worktrees");
  mkdirSync(worktreeRoot);
  const base = git("rev-parse", "HEAD");
  git("worktree", "add", "-q", "-b", "impl/T02", worktree, base);
  const run = (...args) => {
    const result = spawnSync("git", ["-C", worktree, ...args], { encoding: "utf8" });
    if (result.status !== 0) throw new Error(result.stderr);
    return result.stdout.trim();
  };
  writeFileSync(join(worktree, "src.py"), "value = 1\n");
  run("add", "src.py");
  run("-c", "user.name=Test", "-c", "user.email=test@example.invalid",
    "commit", "-q", "-m", "implementation");
  const head = run("rev-parse", "HEAD");
  const plan = join(repo, "implementation-plan.md");
  writeFileSync(plan, readFileSync(plan, "utf8").trimEnd() +
    `\n- Assigned worktree: ${worktree}\n- Assigned branch: impl/T02\n`);
  const params = { mode: "protected-diff", plan, repo, base, head, task: "T02", worktreeRoot };
  const valid = await tool.execute("test", params, undefined, undefined, { cwd: repo });
  expect(valid.details.status).toBe("ok");
  const rejected = await tool.execute("test", { ...params, worktreeRoot: join(workspace, "other") },
    undefined, undefined, { cwd: repo });
  expect(rejected.isError).toBe(true);
  expect(rejected.details.stderr).toContain("must be <repo-root>/.worktrees");
});

test("protected diff fails closed when repo is null", async () => {
  const result = await tool.execute("test",
    { mode: "protected-diff", plan: "implementation-plan.md", repo: null,
      base: "HEAD", head: "HEAD", task: null },
    undefined, undefined, { cwd: repo });
  expect(result.isError).toBe(true);
  expect(result.details.message).toBe("Protected-diff mode requires repo, base, and head.");
});

test("registered tool admits ordinary changes but rejects protected edits", async () => {
  expect(tool.name).toBe("check_implementation_plan");
  mkdirSync(join(repo, "tests"));
  writeFileSync(join(repo, "tests/test_accept.py"), "assert False\n");
  git("add", "tests/test_accept.py");
  git("-c", "user.name=Test", "-c", "user.email=test@example.invalid",
      "commit", "-q", "-m", "acceptance");
  const base = git("rev-parse", "HEAD");

  mkdirSync(join(repo, "src"));
  writeFileSync(join(repo, "src/main.py"), "value = 1\n");
  git("add", "src/main.py");
  git("-c", "user.name=Test", "-c", "user.email=test@example.invalid",
      "commit", "-q", "-m", "implementation");
  const allowedHead = git("rev-parse", "HEAD");
  const parameters = { mode: "protected-diff", plan: "implementation-plan.md", repo,
    base, head: allowedHead, task: "T02" };
  const allowed = await tool.execute("test", parameters, undefined, undefined, { cwd: repo });
  expect(allowed.isError).toBeUndefined();
  expect(allowed.details.status).toBe("ok");
  const withoutTask = await tool.execute("test", { ...parameters, task: null },
    undefined, undefined, { cwd: repo });
  expect(withoutTask.isError).toBeUndefined();
  expect(withoutTask.details.status).toBe("ok");

  writeFileSync(join(repo, "tests/test_accept.py"), "assert True\n");
  git("add", "tests/test_accept.py");
  git("-c", "user.name=Test", "-c", "user.email=test@example.invalid",
      "commit", "-q", "-m", "alter protected test");
  const forbiddenHead = git("rev-parse", "HEAD");
  const violation = await tool.execute("test", { ...parameters, base: allowedHead,
    head: forbiddenHead }, undefined, undefined, { cwd: repo });
  expect(violation.isError).toBe(true);
  expect(violation.details.status).toBe("error");
  expect(violation.details.stderr).toContain("tests/test_accept.py");
  expect(violation.details.stderr).toContain("T01");

  const documentation = await tool.execute("test", { ...parameters, base: allowedHead,
    head: forbiddenHead, task: undefined }, undefined, undefined, { cwd: repo });
  expect(documentation.isError).toBe(true);
  expect(documentation.details.stderr).toContain("tests/test_accept.py");
});
