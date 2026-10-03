import { afterEach, beforeEach, expect, test } from "bun:test";
import * as zod from "@oh-my-pi/omptype/zod";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import projectPlaybook from "../omp-extension.ts";

let repo, runtime, ctx, sequence;
const vision = "docs/product-vision.md";
const architecture = "docs/architecture.md";
const feature = "docs/features/example";
function bind() {
  const hooks = {}, tools = {}, commands = {};
  projectPlaybook({ zod, registerTool(tool) { tools[tool.name] = tool; },
    on(event, handler) { hooks[event] = handler; }, registerCommand(name, command) { commands[name] = command; } });
  return { hooks, tools, commands };
}
function document(path, approved = false, state = "draft", body = "# Document\n") {
  const type = path === vision ? "vision" : path === architecture ? "arch" : path.endsWith("system-design.md") ? "sd"
    : path.endsWith("implementation-plan.md") ? "plan" : path.endsWith("tdd.md") ? "tdd" : "prd";
  mkdirSync(dirname(join(repo, path)), { recursive: true });
  writeFileSync(join(repo, path), `---\nstate: ${state}\nrevision: ${type}-r1\n---\n${body}`);
  if (approved) {
    const manifest = JSON.parse(readFileSync(join(repo, "docs/approvals.json"), "utf8"));
    const agent = type === "tdd" || type === "plan";
    manifest.approvals[path] = { revision: `${type}-r1`, bodySha256: createHash("sha256").update(body).digest("hex"),
      by: agent ? "agent" : "developer", date: "2026-10-02", ...(agent ? { evidence: "Reviews and checks passed." }
        : {}) };
    writeFileSync(join(repo, "docs/approvals.json"), JSON.stringify(manifest));
  }
}
function ready(plan = false) {
  document(vision, true); document(architecture, true); document(`${feature}/prd.md`, true);
  document(`${feature}/tdd.md`, true);
  if (plan) document(`${feature}/implementation-plan.md`, true);
}
async function call(toolName, input, context = ctx, run = runtime) {
  return run.hooks.tool_call({ toolName, toolCallId: `call-${sequence++}`, input }, context);
}
async function spawn(agent = "draft-product-vision-agent", context = ctx, run = runtime) {
  return run.hooks.before_subagent_spawn({ agent, invocationKind: "task", patterns: [], spawnKey: `spawn-${sequence++}` }, context);
}
async function execute(name, params, context = ctx) {
  return runtime.tools[name].execute("tool", runtime.tools[name].parameters.parse(params), undefined, undefined, context);
}
beforeEach(() => {
  repo = mkdtempSync(join(tmpdir(), "playbook-hooks-"));
  mkdirSync(join(repo, "docs"));
  writeFileSync(join(repo, "docs/approvals.json"), JSON.stringify({ version: 1, approvals: {} }));
  runtime = bind(); sequence = 0;
  ctx = { cwd: repo, agent: { kind: "main", id: "Main", name: "main", depth: 0 }, hasUI: true,
    ui: { confirm: async () => true, notify() {} } };
});
afterEach(() => rmSync(repo, { recursive: true, force: true }));

test("approval guard blocks write, edit sections, derived paths, AST globs/directories and aliases", async () => {
  symlinkSync(join(repo, "docs"), join(repo, "alias"));
  for (const [tool, input] of [
    ["write", { path: "docs/approvals.json" }], ["write", { path: join(repo, "docs/../docs/approvals.json") }],
    ["write", { path: "alias/approvals.json" }], ["edit", { input: "[docs/approvals.json#A123]\nPUT 1.=1:\n+{}" }],
    ["edit", { paths: ["docs/approvals.json"] }], ["edit", { input: "[other.json#A123]\nMV docs/approvals.json" }],
    ["ast_edit", { paths: ["docs/*.json"] }], ["ast_edit", { paths: ["**/*"] }], ["ast_edit", { paths: ["docs"] }],
  ]) expect((await call(tool, input))?.block).toBe(true);
  expect(await call("write", { path: "elsewhere/approvals.json" })).toBeUndefined();
});

test("approval guard blocks shell/eval write patterns and developer mode but allows reads", async () => {
  for (const text of ["printf x > docs/approvals.json", "tee docs/approvals.json", "sed -i '' 's/x/y/' docs/approvals.json",
    "mv tmp docs/approvals.json", "cp tmp docs/approvals.json", "rm docs/approvals.json", "truncate -s 0 docs/approvals.json",
    "open('docs/approvals.json', 'w').write('{}')", "writeFileSync('docs/approvals.json', '{}')", "Bun.write('docs/approvals.json', '{}')",
    "python3 scripts/doc-approval.py --developer-approve --path docs/product-vision.md"])
    for (const tool of ["bash", "eval"]) expect((await call(tool, tool === "bash" ? { command: text } : { code: text }))?.block).toBe(true);
  for (const command of ["cat docs/approvals.json", "jq . docs/approvals.json", "git diff -- docs/approvals.json",
    "git log -- docs/approvals.json", "git show HEAD:docs/approvals.json"])
    expect(await call("bash", { command })).toBeUndefined();
});

test("doc_approval wraps modes and shares the hook's exact refusal text", async () => {
  document(vision);
  const before = readFileSync(join(repo, "docs/approvals.json"), "utf8");
  const refused = await execute("doc_approval", { mode: "accept", path: vision, evidence: "Reviewed and checked." });
  const blocked = await call("write", { path: "docs/approvals.json" });
  expect(refused.isError).toBeUndefined(); expect(refused.details.status).toBe("refused");
  expect(refused.content[0].text).toBe(blocked.reason);
  expect(readFileSync(join(repo, "docs/approvals.json"), "utf8")).toBe(before);
  expect((await execute("doc_approval", { mode: "init" })).details.status).toBe("unchanged");
  document(`${feature}/tdd.md`);
  expect((await execute("doc_approval", { mode: "accept", path: `${feature}/tdd.md`, evidence: "Reviews and checks passed." })).details.status).toBe("accepted");
  const status = await execute("doc_approval", { mode: "status", path: `${feature}/tdd.md` });
  expect(status.details.data[0].approved).toBe(true);
  expect((await execute("doc_approval", { mode: "revoke", path: `${feature}/tdd.md`, reason: "Changed design." })).details.status).toBe("revoked");
  for (const params of [{ mode: "accept", path: `${feature}/tdd.md` }, { mode: "status", evidence: "wrong mode" }, { mode: "init", path: vision }])
    expect((await execute("doc_approval", params)).isError).toBe(true);
});

test("factory_status and approval tools fail closed on malformed approvals", async () => {
  expect((await execute("factory_status", {})).details.nextStep).toContain(vision);
  writeFileSync(join(repo, "docs/approvals.json"), "{");
  expect((await execute("factory_status", {})).isError).toBe(true);
  expect((await execute("doc_approval", { mode: "status" })).isError).toBe(true);
  await runtime.hooks.turn_start({}, ctx);
  await expect(call("write", { path: `${feature}/tdd.md` })).rejects.toThrow();
  await expect(spawn("orchestrate-implementation-plan-agent")).rejects.toThrow();
});

test("creation order blocks only new downstream product documents and preserves existing edits", async () => {
  document(vision);
  for (const [tool, input] of [["write", { path: "docs/architecture.md" }],
    ["edit", { input: `[${feature}/prd.md#A123]\nPUT 1.=1:\n+x` }]]) {
    const result = await call(tool, input);
    expect(result?.block).toBe(true); expect(result.reason).toContain(`${vision} is waiting for developer approval`);
    expect(result.reason).toContain("Next expected step:"); expect(result.reason).toContain("edits to existing documents");
    expect(result.reason).not.toContain("..");
  }
  document(`${feature}/implementation-plan.md`);
  for (const tool of ["write", "edit"]) expect(await call(tool, { path: `${feature}/implementation-plan.md` })).toBeUndefined();
  for (const path of ["docs/roadmap.md", "guides/tdd.md", "notes/prd.md", "docs/features/example/readme.md", "../outside/docs/architecture.md"])
    expect(await call("write", { path })).toBeUndefined();
  expect(await call("write", { path: vision })).toBeUndefined();
});

test("creation order uses session repo paths and current slice gates", async () => {
  ready();
  document(`${feature}/system-design.md`, true, "draft", "# System design\n## Slice order\n- slices/01-first\n- slices/02-second\n");
  document(`${feature}/tdd.md`, true, "done"); document(`${feature}/implementation-plan.md`, true, "done");
  document(`${feature}/slices/01-first/tdd.md`);
  const nested = { ...ctx, cwd: join(repo, "docs") };
  const result = await call("write", { path: `${feature}/slices/02-second/tdd.md` }, nested);
  expect(result?.block).toBe(true); expect(result.reason).toContain("slices/01-first/tdd.md");
  expect((await call("write", { path: join(repo, `${feature}/slices/01-first/implementation-plan.md`) }))?.block).toBe(true);
});

test("implementation gate requires valid TDD, plan and upstream developer gates; nested workers/reviewers pass", async () => {
  ready();
  expect((await spawn("orchestrate-implementation-plan-agent"))?.block).toBe(true);
  document(`${feature}/implementation-plan.md`, true);
  await runtime.hooks.turn_start({}, ctx);
  expect(await spawn("orchestrate-implementation-plan-agent")).toBeUndefined();
  document(architecture, false, "draft", "# Changed architecture\n"); await runtime.hooks.turn_start({}, ctx);
  expect((await spawn("orchestrate-implementation-plan-agent"))?.reason).toContain(architecture);
  const sub = { ...ctx, agent: { kind: "sub", id: "Worker", parentId: "Main", name: "task", depth: 1 } };
  for (const agent of ["task", "review-code-tests-agent", "orchestrate-fix-agent"])
    expect(await spawn(agent, sub, bind())).toBeUndefined();
});

test("ambiguous unfinished features do not block order or implementation", async () => {
  document(vision); document(`${feature}/prd.md`); document("docs/features/other/prd.md");
  expect(await call("write", { path: `${feature}/tdd.md` })).toBeUndefined();
  expect(await spawn("orchestrate-implementation-plan-agent")).toBeUndefined();
  const result = await runtime.hooks.before_agent_start({ systemPrompt: "BASE" }, ctx);
  expect(result.systemPrompt).toContain("Multiple features have unfinished work");
});

test("sixth revision blocks; main explicit ask answers reset but timeouts, cancellation and redirects do not", async () => {
  document(vision);
  for (let n = 0; n < 5; n++) expect(await spawn()).toBeUndefined();
  expect((await spawn())?.reason).toContain("summarize for the developer");
  for (const event of [{ details: { selectedOptions: ["yes"], timedOut: true } }, { details: { chatRedirect: true } },
    { isError: true, details: { selectedOptions: ["yes"] } }, { details: { results: [{ selectedOptions: ["yes"], timedOut: true }] } }, { details: {} }]) {
    await runtime.hooks.tool_result({ toolName: "ask", toolCallId: "ask", ...event }, ctx);
    expect((await spawn())?.block).toBe(true);
  }
  await runtime.hooks.tool_result({ toolName: "ask", toolCallId: "ask", details: { results: [{ selectedOptions: ["yes"] }] } }, ctx);
  expect(await spawn()).toBeUndefined();
});

test("revision counts share a main tree, reset only on main input, and ignore agent acceptance and subagent answers", async () => {
  document(vision);
  const child = { ...ctx, agent: { kind: "sub", id: "Child", parentId: "Main", name: "task", depth: 1 } };
  const childRun = bind();
  expect(await spawn()).toBeUndefined();
  for (let n = 0; n < 4; n++) expect(await spawn("draft-product-vision-agent", child, childRun)).toBeUndefined();
  await childRun.hooks.input({}, child);
  await childRun.hooks.tool_result({ toolName: "ask", toolCallId: "ask", details: { selectedOptions: ["yes"] } }, child);
  expect((await spawn())?.block).toBe(true);
  await runtime.hooks.input({}, ctx); expect(await spawn()).toBeUndefined();
  for (let n = 0; n < 4; n++) await spawn();
  document(`${feature}/tdd.md`);
  const result = await execute("doc_approval", { mode: "accept", path: `${feature}/tdd.md`, evidence: "Review and checks passed." });
  expect(result.details.status).toBe("accepted");
  expect((await spawn())?.block).toBe(true);
  for (const [run, context] of [[runtime, ctx], [childRun, child]]) {
    await run.hooks.tool_result({ toolName: "doc_approval", toolCallId: "accept", details: result.details }, context);
    expect((await spawn())?.block).toBe(true);
  }
  await runtime.hooks.input({}, ctx);
  expect(await spawn()).toBeUndefined();
});

test("TDD and plan revisions share five revisions across agent acceptance until the developer responds", async () => {
  ready(true);
  for (let n = 0; n < 3; n++) expect(await spawn("draft-technical-design-agent")).toBeUndefined();
  const result = await execute("doc_approval", { mode: "accept", path: `${feature}/tdd.md`, evidence: "Review and checks passed." });
  expect(result.details.status).toBe("accepted");
  await runtime.hooks.tool_result({ toolName: "doc_approval", toolCallId: "accept", details: result.details }, ctx);
  for (let n = 0; n < 2; n++) expect(await spawn("draft-implementation-plan-agent")).toBeUndefined();
  expect((await spawn("draft-implementation-plan-agent"))?.block).toBe(true);
  await runtime.hooks.input({}, ctx);
  expect(await spawn("draft-implementation-plan-agent")).toBeUndefined();
});

test("first drafts do not consume revisions, and successful new-document creation refunds inferred revisions", async () => {
  document(vision);
  for (let n = 0; n < 5; n++) await spawn();
  expect(await spawn("draft-system-architecture-agent")).toBeUndefined();
  await runtime.hooks.input({}, ctx);
  ready(true);
  await runtime.hooks.turn_start({}, ctx);
  await spawn("draft-technical-design-agent");
  const child = { ...ctx, agent: { kind: "sub", id: "Drafter", parentId: "Main", name: "draft-technical-design-agent", depth: 1 } };
  const childRun = bind();
  await childRun.hooks.before_agent_start({ systemPrompt: "CHILD" }, child);
  const path = `${feature}/slices/fix/tdd.md`;
  expect(await childRun.hooks.tool_call({ toolName: "write", toolCallId: "new-doc", input: { path } }, child)).toBeUndefined();
  document(path);
  await childRun.hooks.tool_result({ toolName: "write", toolCallId: "new-doc", details: {} }, child);
  const result = await runtime.hooks.before_agent_start({ systemPrompt: "BASE" }, ctx);
  expect(result.systemPrompt).toContain("revisions=0/5");
});

test("status line preserves string/array base prompts, includes documents and skill, and is main-only", async () => {
  document(vision);
  const result = await runtime.hooks.before_agent_start({ systemPrompt: "BASE POLICY" }, ctx);
  expect(result.systemPrompt.startsWith("BASE POLICY\n")).toBe(true);
  expect(result.systemPrompt).toContain(`${vision}: draft, not approved`);
  expect(result.systemPrompt).toContain("skill://orchestrate-factory");
  expect(result.systemPrompt).not.toContain("..");
  const array = await runtime.hooks.before_agent_start({ systemPrompt: ["BASE POLICY"] }, ctx);
  expect(array.systemPrompt[0]).toBe("BASE POLICY");
  expect(await runtime.hooks.before_agent_start({ systemPrompt: "CHILD" }, { ...ctx, agent: { ...ctx.agent, kind: "sub", id: "Sub", parentId: "Main" } })).toBeUndefined();
});

test("developer command refuses without UI or after decline, confirms approval meaning, records approval and resets", async () => {
  document(vision); document(architecture);
  const before = readFileSync(join(repo, "docs/approvals.json"), "utf8");
  const command = runtime.commands["playbook-approve"];
  await command.handler(vision, { ...ctx, hasUI: false });
  await command.handler(vision, { ...ctx, ui: { ...ctx.ui, confirm: async () => false } });
  expect(readFileSync(join(repo, "docs/approvals.json"), "utf8")).toBe(before);
  for (let n = 0; n < 5; n++) await spawn();
  let confirmation;
  await command.handler(vision, { ...ctx, ui: { ...ctx.ui, confirm: async (_title, text) => { confirmation = text; return true; } } });
  expect(confirmation).toContain("read docs/product-vision.md in full");
  expect((await execute("doc_approval", { mode: "status", path: vision })).details.data[0].approved).toBe(true);
  expect(await spawn()).toBeUndefined();
  await command.handler(architecture, { ...ctx, ui: { ...ctx.ui, confirm: async (_title, text) => { confirmation = text; return true; } } });
  expect(confirmation).toContain("defend its technical decisions");
  expect((await execute("doc_approval", { mode: "status", path: architecture })).details.data[0].approved).toBe(true);
  const approvals = JSON.parse(readFileSync(join(repo, "docs/approvals.json"), "utf8")).approvals;
  for (const path of [vision, architecture])
    expect(Object.keys(approvals[path]).sort()).toEqual(["bodySha256", "by", "date", "revision"]);
});

test("every hook is inert without approvals and factory_status reports optedOut", async () => {
  rmSync(join(repo, "docs/approvals.json"));
  for (const [event, input] of [["tool_call", { toolName: "bash", input: { command: "--developer-approve > docs/approvals.json" } }],
    ["before_subagent_spawn", { agent: "orchestrate-implementation-plan-agent" }], ["before_agent_start", { systemPrompt: "BASE" }],
    ["input", {}], ["turn_start", {}], ["tool_result", { toolName: "ask", details: { selectedOptions: ["yes"] } }]])
    expect(await runtime.hooks[event](input, ctx)).toBeUndefined();
  expect((await execute("factory_status", {})).details.optedIn).toBe(false);
  expect((await execute("doc_approval", { mode: "init" })).details.status).toBe("initialized");
  expect(existsSync(join(repo, "docs/approvals.json"))).toBe(true);
});

test("cached status is invalidated by child acceptance in the same main turn", async () => {
  ready();
  document(`${feature}/tdd.md`, false, "draft", "# Changed design\n");
  expect((await call("write", { path: `${feature}/implementation-plan.md` }))?.block).toBe(true);
  const child = { ...ctx, agent: { kind: "sub", id: "Accepter", parentId: "Main", name: "task", depth: 1 } };
  const tool = bind().tools.doc_approval;
  const result = await tool.execute("accept", { mode: "accept", path: `${feature}/tdd.md`, evidence: "Review and checks passed." },
    undefined, undefined, child);
  expect(result.details.status).toBe("accepted");
  expect(await call("write", { path: `${feature}/implementation-plan.md` })).toBeUndefined();
});

test("a predicted first draft cannot evade the revision limit by editing an existing document", async () => {
  document(vision);
  for (let n = 0; n < 5; n++) await spawn();
  expect(await spawn("draft-system-architecture-agent")).toBeUndefined();
  const child = { ...ctx, agent: { kind: "sub", id: "ArchitectureDrafter", parentId: "Main", name: "draft-system-architecture-agent", depth: 1 } };
  const result = await call("write", { path: vision }, child, bind());
  expect(result?.block).toBe(true);
  expect(result.reason).toContain("Five drafting-agent revisions");
});

test("revision state is isolated by main session and restarts with a new session identity", async () => {
  document(vision);
  const first = { ...ctx, sessionManager: { getSessionId: () => "first" } };
  for (let n = 0; n < 5; n++) await spawn("draft-product-vision-agent", first);
  expect((await spawn("draft-product-vision-agent", first))?.block).toBe(true);
  const restarted = { ...ctx, sessionManager: { getSessionId: () => "second" } };
  expect(await spawn("draft-product-vision-agent", restarted, bind())).toBeUndefined();
});

test("feature ambiguity does not disable the drafting revision limit", async () => {
  document(vision); document(`${feature}/prd.md`); document("docs/features/other/prd.md");
  for (let n = 0; n < 5; n++) expect(await spawn("draft-prd-agent")).toBeUndefined();
  expect((await spawn("draft-prd-agent"))?.block).toBe(true);
});

test("missing upstream document refusals and status use accurate wording and single periods", async () => {
  const result = await call("write", { path: architecture });
  expect(result?.block).toBe(true);
  expect(result.reason).toBe(`${vision} does not exist yet. Next expected step: Create ${vision}. Discussion, research, and edits to existing documents are still open.`);
  expect(result.reason).not.toContain("..");
  const status = await runtime.hooks.before_agent_start({ systemPrompt: "BASE POLICY" }, ctx);
  expect(status.systemPrompt).toContain(`next=Create ${vision}. Use skill://orchestrate-factory`);
  expect(status.systemPrompt).not.toContain("..");
});
