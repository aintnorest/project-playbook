// Enabling this extension package exposes its sibling agents/ and skills/
// directories and registers document checks, developer-request rendering,
// agent-run collection, and bounded project verification.
// Scripts resolve from this extension's directory, independent of the workspace.

import { spawn } from "node:child_process";
import { existsSync, realpathSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, relative, resolve, sep } from "node:path";
import type { ExtensionAPI, ExtensionContext } from "@oh-my-pi/pi-coding-agent";

const validator = fileURLToPath(new URL("./scripts/check-implementation-plans.py", import.meta.url));
const statusValidator = fileURLToPath(new URL("./scripts/check-doc-status.py", import.meta.url));
const requestRenderer = fileURLToPath(new URL("./scripts/request-developer.py", import.meta.url));
const runCollector = fileURLToPath(new URL("./scripts/collect-agent-runs.py", import.meta.url));
const checkRunner = fileURLToPath(new URL("./scripts/run-check.py", import.meta.url));
const approvalProgram = fileURLToPath(new URL("./scripts/doc-approval.py", import.meta.url));
const factoryProgram = fileURLToPath(new URL("./scripts/factory-status.py", import.meta.url));
const APPROVAL_REFUSAL = "This file records approvals, and agents don't change it directly by any route. To mark a document not approved, or to accept a technical design or implementation plan after its review loop and checks pass, use `doc_approval`. Product vision, architecture, PRD, and system design approvals belong to the developer: stop, render a developer request, and ask. Stopping here is the correct way to finish this turn, not a failure.";
const REVISION_REFUSAL = "Five drafting-agent revisions have been used. Stop and summarize for the developer what remains unresolved, why it is not converging, the options, and a recommendation. Stopping here is the correct way to finish this turn, not a failure.";
// Bound each output stream independently; checkers have 120 seconds, runner timeout adds transport grace.
const MAX_STREAM_BYTES = 16 * 1024 * 1024;
const VALIDATOR_TIMEOUT_MS = 120_000;

type Mode = "check" | "json" | "protected-diff" | "frozen-diff" | "init" | "status" | "revoke" | "accept" | "developer-approve";

interface ValidatorResult {
  stdout: string;
  stderr: string;
  exitCode: number | null;
  boundedFailure?: string;
}

function failure(mode: Mode, message: string, exitCode: number | null = null, stderr = "", stdout = "") {
  return {
    content: [{ type: "text" as const, text: message }],
    details: { status: "error", mode, exitCode, stderr, stdout, message },
    isError: true,
  };
}

async function runValidator(args: string[], cwd: string, signal: AbortSignal | undefined, label: string, stdinPayload?: string, timeoutMs = VALIDATOR_TIMEOUT_MS): Promise<ValidatorResult> {
  if (signal?.aborted) return { stdout: "", stderr: "", exitCode: null, boundedFailure: `${label} aborted.` };
  return new Promise<ValidatorResult>((resolve, reject) => {
    const child = spawn("python3", args, {
      stdio: [stdinPayload === undefined ? "ignore" : "pipe", "pipe", "pipe"],
      cwd,
    });
    const output: Buffer[] = [];
    const errors: Buffer[] = [];
    let outputBytes = 0;
    let errorBytes = 0;
    let settled = false;
    let boundedFailure: string | undefined;
    let forceKill: NodeJS.Timeout | undefined;
    let transportError: Error | undefined;
    const stop = (message: string) => {
      if (settled || boundedFailure) return;
      boundedFailure = message;
      clearTimeout(deadline);
      // The runner handles SIGTERM by killing its separate Bash process group.
      child.kill("SIGTERM");
      forceKill = setTimeout(() => child.kill("SIGKILL"), 1000);
    };
    const abort = () => stop(`${label} aborted.`);
    const deadline = setTimeout(() => stop(`${label} exceeded ${timeoutMs / 1000}-second deadline.`), timeoutMs);
    signal?.addEventListener("abort", abort, { once: true });
    const collect = (stream: "stdout" | "stderr", chunk: Buffer) => {
      if (settled) return;
      const length = stream === "stdout" ? outputBytes : errorBytes;
      if (length + chunk.length > MAX_STREAM_BYTES) {
        stop(`${label} ${stream} exceeded ${MAX_STREAM_BYTES / (1024 * 1024)} MiB limit.`);
        return;
      }
      if (stream === "stdout") {
        output.push(chunk);
        outputBytes += chunk.length;
      } else {
        errors.push(chunk);
        errorBytes += chunk.length;
      }
    };
    child.stdout.on("data", (chunk: Buffer) => collect("stdout", chunk));
    child.stderr.on("data", (chunk: Buffer) => collect("stderr", chunk));
    const cleanup = () => {
      clearTimeout(deadline);
      clearTimeout(forceKill);
      signal?.removeEventListener("abort", abort);
    };
    const fail = (error: Error) => {
      if (settled) return;
      transportError = error;
      stop(`${label} transport failed.`);
    };
    child.on("error", fail);
    child.stdin?.on("error", fail);
    child.on("close", code => {
      if (settled) return;
      settled = true;
      cleanup();
      if (transportError) {
        reject(transportError);
        return;
      }
      resolve({
        stdout: Buffer.concat(output, outputBytes).toString("utf8"),
        stderr: Buffer.concat(errors, errorBytes).toString("utf8"),
        exitCode: code,
        boundedFailure,
      });
    });
    child.stdin?.end(stdinPayload);
    if (signal?.aborted) abort();
  });
}

interface FactoryDocument {
  path: string;
  type: string;
  state: string;
  approved: boolean;
  gate: "developer" | "agent" | "none";
}
interface FactoryStatus {
  optedIn: boolean;
  feature?: string | null;
  currentSlice?: string | null;
  documents?: FactoryDocument[];
  openGates?: string[];
  nextStep?: string;
  ambiguity?: string | null;
}
interface DraftSpawn { agent: string; counted: boolean; created?: boolean; epoch: number }
interface RevisionState { count: number; epoch: number; pending: DraftSpawn[] }
// Factories rebound for children share only in-memory main-tree state.
const revisionTrees = new Map<string, RevisionState>();
const agentTrees = new Map<string, string>();
const statusVersions = new Map<string, number>();
const DOCUMENT_RANK: Record<string, number> = { "prd.md": 2, "system-design.md": 3, "tdd.md": 4, "implementation-plan.md": 5 };
const DRAFT_DOCUMENT: Record<string, string> = {
  "draft-product-vision-agent": "docs/product-vision.md",
  "draft-system-architecture-agent": "docs/architecture.md",
  "draft-prd-agent": "prd.md",
  "draft-system-design-agent": "system-design.md",
  "draft-technical-design-agent": "tdd.md",
  "draft-implementation-plan-agent": "implementation-plan.md",
};

function sessionRepo(cwd: string): string {
  let path = resolve(cwd);
  while (true) {
    if (existsSync(resolve(path, ".git")) || existsSync(resolve(path, "docs/approvals.json"))) return path;
    const parent = dirname(path);
    if (parent === path) return resolve(cwd);
    path = parent;
  }
}

function canonicalPath(path: string): string {
  if (existsSync(path)) return realpathSync(path);
  const parent = dirname(path);
  return parent === path ? path : resolve(canonicalPath(parent), relative(parent, path));
}

function documentRank(path: string): number | undefined {
  if (path === "docs/product-vision.md") return 0;
  if (path === "docs/architecture.md") return 1;
  if (!/^docs\/features\/[^/]+\/(?:[^/]+\/)*(?:prd|system-design|tdd|implementation-plan)\.md$/.test(path)) return;
  return DOCUMENT_RANK[path.split("/").at(-1)!];
}

function targetPaths(input: Record<string, unknown>): string[] {
  const paths: string[] = [];
  if (typeof input.path === "string") paths.push(input.path);
  if (Array.isArray(input.paths)) paths.push(...input.paths.filter((path): path is string => typeof path === "string"));
  if (typeof input.input === "string") {
    for (const match of input.input.matchAll(/^\[([^#\r\n]+)#[0-9a-f]{4}\]\s*$/gim)) paths.push(match[1]);
    for (const match of input.input.matchAll(/^\*\*\* (?:Add File:|Update File:|Delete File:|Move to:|Edit File:) (.+)$/gm)) paths.push(match[1]);
    for (const match of input.input.matchAll(/^MV (.+)$/gm)) paths.push(match[1].replace(/^"(.*)"$/, "$1"));
  }
  return [...new Set(paths)];
}

function targetsApprovals(repo: string, path: string, glob = false): boolean {
  const target = canonicalPath(resolve(repo, "docs/approvals.json"));
  const absolute = resolve(repo, path);
  if (canonicalPath(absolute) === target) return true;
  if (!glob) return false;
  if (existsSync(absolute) && statSync(absolute).isDirectory()) {
    const below = relative(canonicalPath(absolute), target);
    if (!below.startsWith("..") && !below.startsWith(sep)) return true;
  }
  return new Bun.Glob(absolute).match(target) || new Bun.Glob(absolute).match(resolve(repo, "docs/approvals.json"));
}

function orderRefusal(status: FactoryStatus, gate: string): string {
  const document = status.documents?.find(row => row.path === gate);
  const condition = document
    ? `${gate} is waiting for ${document.gate} approval.`
    : `${gate} does not exist yet.`;
  return `${condition} Next expected step: ${status.nextStep?.replace(/\.$/, "")}. Discussion, research, and edits to existing documents are still open.`;
}

function isFactoryStatus(value: unknown): value is FactoryStatus {
  if (!value || typeof value !== "object") return false;
  const status = value as FactoryStatus;
  if (status.optedIn === false) return Object.keys(status).length === 1;
  return status.optedIn === true && (status.feature === null || typeof status.feature === "string")
    && (status.currentSlice === null || typeof status.currentSlice === "string")
    && (status.ambiguity === null || typeof status.ambiguity === "string") && typeof status.nextStep === "string"
    && Array.isArray(status.openGates) && status.openGates.every(path => typeof path === "string")
    && Array.isArray(status.documents) && status.documents.every(row => typeof row.path === "string"
      && typeof row.type === "string" && typeof row.state === "string" && typeof row.approved === "boolean"
      && ["developer", "agent", "none"].includes(row.gate));
}

async function runJsonProgram(program: string, args: string[], cwd: string, signal?: AbortSignal) {
  const result = await runValidator([program, ...args], cwd, signal, "Factory contract program");
  if (result.boundedFailure || result.stderr.trim() || ![0, 3].includes(result.exitCode!)) {
    throw new Error(result.boundedFailure || result.stderr.trim() || `Factory contract program exited with code ${result.exitCode}.`);
  }
  let data: unknown;
  try { data = JSON.parse(result.stdout); } catch { throw new Error("Factory contract program returned invalid JSON."); }
  return { data, result };
}

async function readFactoryStatus(repo: string, signal?: AbortSignal): Promise<FactoryStatus> {
  const { data, result } = await runJsonProgram(factoryProgram, ["--repo", repo], repo, signal);
  if (result.exitCode !== 0 || !isFactoryStatus(data)) throw new Error("Factory status returned an invalid result envelope.");
  return data;
}

async function approvalOperation(mode: Mode, repo: string, args: string[], signal?: AbortSignal) {
  const { data, result } = await runJsonProgram(approvalProgram, [`--${mode}`, "--repo", repo, ...args], repo, signal);
  const value = data as Record<string, unknown>;
  if (mode === "status") {
    if (result.exitCode !== 0 || !Array.isArray(data) || !data.every(row => row && typeof row.path === "string"
      && typeof row.type === "string" && ["developer", "agent", "none"].includes(row.gate)
      && typeof row.approved === "boolean" && (row.by === null || ["developer", "agent"].includes(row.by))
      && (row.reason === null || typeof row.reason === "string"))) throw new Error("Approval status returned an invalid result envelope.");
  } else {
    const expected: Record<string, string[]> = { init: ["initialized", "unchanged"], revoke: ["revoked"], accept: ["accepted"], "developer-approve": ["approved"] };
    const refused = mode === "accept" && result.exitCode === 3 && value?.status === "refused"
      && ["developer-gated", "ungated"].includes(String(value.reason));
    if (!refused && (result.exitCode !== 0 || !expected[mode]?.includes(String(value?.status))
      || (mode !== "init" && typeof value?.path !== "string"))) throw new Error("Approval operation returned an invalid result envelope.");
  }
  return { content: [{ type: "text" as const, text: value?.status === "refused" ? APPROVAL_REFUSAL : result.stdout }],
    details: { status: mode === "status" ? "ok" : value.status, mode, exitCode: result.exitCode, data } };
}

export default function projectPlaybook(pi: ExtensionAPI) {
  const z = pi.zod;
  let cachedStatus: Promise<FactoryStatus> | undefined;
  let cachedRepo: string | undefined;
  let cachedVersion = -1;
  let draftSpawn: DraftSpawn | undefined;
  const newDocuments = new Map<string, string[]>();
  const optedIn = (repo: string) => existsSync(resolve(repo, "docs/approvals.json"));
  const invalidateStatus = (repo = cachedRepo) => {
    cachedStatus = undefined;
    if (repo) statusVersions.set(repo, (statusVersions.get(repo) ?? 0) + 1);
  };
  const statusFor = (repo: string) => {
    const version = statusVersions.get(repo) ?? 0;
    if (!cachedStatus || cachedRepo !== repo || cachedVersion !== version) {
      cachedRepo = repo;
      cachedVersion = version;
      cachedStatus = readFactoryStatus(repo);
    }
    return cachedStatus;
  };
  const treeFor = (ctx: ExtensionContext): RevisionState => {
    const repo = sessionRepo(ctx.cwd);
    const identity = `${repo}:${ctx.agent.id}`;
    let key = agentTrees.get(identity);
    if (ctx.agent.kind === "main") {
      key = `${identity}:${ctx.sessionManager?.getSessionId?.() ?? ""}`;
    } else if (!key) {
      key = agentTrees.get(`${repo}:${ctx.agent.parentId}`) ?? `${repo}:${ctx.agent.parentId}`;
    }
    agentTrees.set(identity, key);
    let state = revisionTrees.get(key);
    if (!state) {
      state = { count: 0, epoch: 0, pending: [] };
      revisionTrees.set(key, state);
    }
    if (ctx.agent.kind === "sub" && !draftSpawn && ctx.agent.name.startsWith("draft-")) {
      const index = state.pending.findIndex(item => item.agent === ctx.agent.name);
      if (index >= 0) [draftSpawn] = state.pending.splice(index, 1);
    }
    return state;
  };
  const resetRevisions = (ctx: Parameters<typeof treeFor>[0]) => {
    const state = treeFor(ctx);
    state.count = 0;
    state.epoch++;
    state.pending.length = 0;
  };

  pi.registerTool({
    name: "doc_approval",
    label: "Document Approval",
    description: "Initialize or inspect product-document approvals, revoke any approval with a reason, or accept a technical design/implementation plan with review and check evidence. Developer-gated and ungated documents cannot be accepted by agents. Writes only the consumer repository's docs/approvals.json.",
    parameters: z.object({
      mode: z.enum(["init", "status", "revoke", "accept"]),
      repo: z.string().nullable().optional().describe("Consumer repository root; absent means the session repository."),
      path: z.string().nullable().optional().describe("Document path; optional for status, required for revoke/accept, not accepted by init."),
      reason: z.string().nullable().optional().describe("Required non-empty revocation reason; revoke only."),
      evidence: z.string().nullable().optional().describe("Required non-empty review-loop and check evidence; accept only."),
    }),
    async execute(_id, params, signal, _update, ctx) {
      const { mode } = params;
      const path = params.path || undefined;
      const reason = params.reason || undefined;
      const evidence = params.evidence || undefined;
      if ((mode === "init" && path) || (["revoke", "accept"].includes(mode) && !path)
        || (mode === "revoke" ? !reason?.trim() : reason !== undefined)
        || (mode === "accept" ? !evidence?.trim() : evidence !== undefined)) {
        return failure(mode, "Approval mode requires its document path and non-empty reason/evidence, and does not accept fields belonging to another mode.");
      }
      try {
        const result = await approvalOperation(mode, resolve(params.repo || sessionRepo(ctx.cwd)),
          [...(path ? ["--path", path] : []), ...(reason ? ["--reason", reason] : []), ...(evidence ? ["--evidence", evidence] : [])], signal);
        invalidateStatus(resolve(params.repo || sessionRepo(ctx.cwd)));
        return result;
      } catch (error) { return failure(mode, String(error)); }
    },
  });
  pi.registerTool({
    name: "factory_status",
    label: "Factory Status",
    description: "Read document-derived current feature, slice, approval gates, next expected step, and ambiguity. Execution phase and review round belong to the orchestrate-factory skill. Reads only.",
    parameters: z.object({
      repo: z.string().nullable().optional().describe("Consumer repository root; absent means the session repository."),
    }),
    async execute(_id, params, signal, _update, ctx) {
      try {
        const status = await readFactoryStatus(resolve(params.repo || sessionRepo(ctx.cwd)), signal);
        return { content: [{ type: "text" as const, text: JSON.stringify(status, null, 2) }], details: { status: "ok", ...status } };
      } catch (error) { return failure("status", String(error)); }
    },
  });

  pi.on("turn_start", (_event, ctx) => {
    if (optedIn(sessionRepo(ctx.cwd))) invalidateStatus();
  });
  pi.on("input", (_event, ctx) => {
    if (ctx.agent.kind === "main" && optedIn(sessionRepo(ctx.cwd))) {
      resetRevisions(ctx);
      invalidateStatus();
    }
  });
  pi.on("tool_call", async (event, ctx) => {
    const repo = sessionRepo(ctx.cwd);
    if (!optedIn(repo)) return;
    treeFor(ctx);
    const input = event.input;
    const paths = ["edit", "write", "ast_edit"].includes(event.toolName) ? targetPaths(input) : [];
    if (paths.some(path => targetsApprovals(repo, path, event.toolName === "ast_edit"))) {
      return { block: true, reason: APPROVAL_REFUSAL };
    }
    if (["bash", "eval"].includes(event.toolName)) {
      const text = String(event.toolName === "bash" ? input.command ?? "" : input.code ?? "");
      const writes = /(?:>>?|(?:^|[;&|\s])(?:tee|mv|cp|rm|truncate)\b|sed\s+[^\n;]*-[^\s]*i|jq\s+[^\n;]*--in-place|\bopen\s*\([^)]*,\s*["'][wax+][^"']*["']|\b(?:writeFile(?:Sync)?|write_text|write_bytes)\s*\(|\bBun\.write\s*\()/m;
      if (text.includes("--developer-approve") || (text.includes("approvals.json") && writes.test(text))) {
        return { block: true, reason: APPROVAL_REFUSAL };
      }
    }
    if (!["write", "edit"].includes(event.toolName)) return;
    const state = treeFor(ctx);
    if (draftSpawn && !draftSpawn.counted && !draftSpawn.created && draftSpawn.epoch === state.epoch
      && paths.some(path => documentRank(relative(repo, resolve(repo, path)).split(sep).join("/")) !== undefined && existsSync(resolve(repo, path)))) {
      if (state.count >= 5) return { block: true, reason: REVISION_REFUSAL };
      state.count++;
      draftSpawn.counted = true;
    }
    const created = paths.map(path => relative(repo, resolve(repo, path)).split(sep).join("/"))
      .filter(path => documentRank(path) !== undefined && !existsSync(resolve(repo, path)));
    if (!created.length) return;
    const status = await statusFor(repo);
    if (!status.ambiguity) {
      for (const path of created) {
        const rank = documentRank(path)!;
        const feature = path.split("/").slice(0, 3).join("/");
        const gate = status.openGates?.find(gate => {
          const gateRank = documentRank(gate);
          if (gateRank === undefined) return false;
          if (gateRank < 2) return gateRank < rank;
          if (!gate.startsWith(feature + "/")) return false;
          if (gateRank < 4) return gateRank < rank;
          const slice = dirname(gate).split(sep).join("/");
          // An open current slice also precedes later slices in the sequence.
          return (slice === dirname(path) && gateRank < rank)
            || (slice === status.currentSlice && dirname(path) !== slice && rank >= 4);
        });
        if (gate) return { block: true, reason: orderRefusal(status, gate) };
      }
    }
    // A successful first draft is excluded, even if its target could not be
    // inferred at spawn time. Failed or blocked writes never refund a revision.
    newDocuments.set(event.toolCallId, created);
  });
  pi.on("tool_result", (event, ctx) => {
    const repo = sessionRepo(ctx.cwd);
    if (!optedIn(repo)) return;
    const state = treeFor(ctx);
    if (["write", "edit", "ast_edit", "bash", "eval", "doc_approval"].includes(event.toolName)) invalidateStatus(repo);
    const created = newDocuments.get(event.toolCallId);
    newDocuments.delete(event.toolCallId);
    if (!event.isError && created?.some(path => existsSync(resolve(repo, path))) && draftSpawn && draftSpawn.epoch === state.epoch) {
      if (draftSpawn.counted) state.count = Math.max(0, state.count - 1);
      draftSpawn.counted = false;
      draftSpawn.created = true;
    }
    if (event.isError) return;
    if (event.toolName !== "ask" || ctx.agent.kind !== "main") return;
    const details = event.details;
    if (!details || details.timedOut || details.chatRedirect) return;
    const answers = Array.isArray(details.results) ? details.results : [details];
    if (answers.length && answers.every(answer => !answer.timedOut && !answer.chatRedirect
      && (Array.isArray(answer.selectedOptions) || typeof answer.customInput === "string"))) resetRevisions(ctx);
  });
  pi.on("before_subagent_spawn", async (event, ctx) => {
    const repo = sessionRepo(ctx.cwd);
    if (!optedIn(repo)) return;
    const state = treeFor(ctx);
    if (event.agent === "orchestrate-implementation-plan-agent") {
      const status = await statusFor(repo);
      if (status.ambiguity) return;
      const slice = status.currentSlice;
      if (!slice) return { block: true, reason: `No current slice is ready for implementation. Next expected step: ${status.nextStep}.` };
      const feature = slice.split("/").slice(0, 3).join("/");
      const required = ["docs/product-vision.md", "docs/architecture.md", `${feature}/prd.md`,
        ...(status.documents?.some(row => row.path === `${feature}/system-design.md` && row.state !== "superseded")
          || status.openGates?.includes(`${feature}/system-design.md`) ? [`${feature}/system-design.md`] : []),
        `${slice}/tdd.md`, `${slice}/implementation-plan.md`];
      const gate = required.find(path => !status.documents?.some(row => row.path === path && row.approved && row.state !== "superseded"));
      if (gate) return { block: true, reason: orderRefusal(status, gate) };
    }
    if (!event.agent.startsWith("draft-")) return;
    const status = await statusFor(repo);
    const document = DRAFT_DOCUMENT[event.agent];
    const target = document?.startsWith("docs/") ? document
      : document && status.feature
        ? `${document === "tdd.md" || document === "implementation-plan.md" ? status.currentSlice || `docs/features/${status.feature}` : `docs/features/${status.feature}`}/${document}`
        : undefined;
    const firstDraft = !!document && (target ? !existsSync(resolve(repo, target)) : !status.ambiguity && !status.feature);
    if (!firstDraft && state.count >= 5) return { block: true, reason: REVISION_REFUSAL };
    if (!firstDraft) state.count++;
    state.pending.push({ agent: event.agent, counted: !firstDraft, epoch: state.epoch });
  });
  pi.on("before_agent_start", async (event, ctx) => {
    const repo = sessionRepo(ctx.cwd);
    if (!optedIn(repo)) return;
    const state = treeFor(ctx);
    if (ctx.agent.kind !== "main") return;
    invalidateStatus();
    const status = await statusFor(repo);
    const line = `Software factory: feature=${status.feature ?? "none"}; slice=${status.currentSlice ?? "none"}; documents=${status.documents?.map(row => `${row.path}: ${row.state}, ${row.approved ? "approved" : row.gate === "none" ? "ungated" : "not approved"}`).join("; ") || "none"}; revisions=${state.count}/5; next=${status.nextStep?.replace(/\.$/, "")}${status.ambiguity ? `; ambiguity=${status.ambiguity.replace(/\.$/, "")}` : ""}. Use skill://orchestrate-factory for full status, execution phase, and review round.`;
    return { systemPrompt: typeof event.systemPrompt === "string" ? `${event.systemPrompt}\n${line}` : [...event.systemPrompt, line] };
  });
  pi.registerCommand("playbook-approve", {
    description: "Record developer approval after confirming the document type's approval meaning.",
    async handler(args, ctx) {
      const repo = sessionRepo(ctx.cwd);
      const notify = (text: string, error = true) => ctx.ui.notify(text, error ? "error" : "info");
      if (!optedIn(repo)) return notify("Software factory is not enabled: initialize docs/approvals.json through doc_approval first.");
      if (!ctx.hasUI || ctx.agent.kind !== "main") return notify("Developer approval requires the main session's confirmation UI.");
      const path = relative(repo, resolve(repo, args.trim())).split(sep).join("/");
      const rank = documentRank(path);
      if (rank === undefined || rank > 3) return notify("This command only approves product vision, architecture, PRD, and system design documents.");
      const text = rank === 0 || rank === 2
        ? `I have read ${path} in full and accept its content.`
        : `I understand ${path} well enough to explain it and defend its technical decisions, and I agree with them.`;
      if (!await ctx.ui.confirm(`Approve ${path}`, text)) return notify("Developer approval declined; no approval was recorded.");
      try {
        const result = await approvalOperation("developer-approve", repo, ["--path", path]);
        resetRevisions(ctx);
        invalidateStatus(repo);
        notify(result.content[0].text, false);
      } catch (error) { notify(String(error)); }
    },
  });

  pi.registerTool({
    name: "check_implementation_plan",
    label: "Check Implementation Plan",
    description: "Validate a plan with mode=check, read its task DAG with mode=json, or check a candidate's protected diff and assigned worktree with mode=protected-diff. For check/json pass only mode and plan; repo/base/head/task/worktreeRoot are protected-diff only. Reads only; never changes files.",
    parameters: z.object({
      mode: z.enum(["check", "json", "protected-diff"]),
      plan: z.string(),
      repo: z.string().nullable().optional().describe("Protected-diff only: required repository root; omit or null for check/json."),
      base: z.string().nullable().optional().describe("Protected-diff only: required base revision; omit or null for check/json."),
      head: z.string().nullable().optional().describe("Protected-diff only: required candidate revision; omit or null for check/json."),
      task: z.string().nullable().optional().describe("Protected-diff only: optional task ID; null means absent, but supplied empty string is rejected in protected-diff."),
      worktreeRoot: z.string().nullable().optional().describe("Protected-diff only: required <repo-root>/.worktrees for assigned candidates."),
    }),
    async execute(_toolCallId, params, signal, _onUpdate, ctx) {
      const { mode, plan, repo, base, head, task, worktreeRoot } = params;
      if (!existsSync(validator)) {
        return failure(mode, `Implementation-plan validator is missing: ${validator}`);
      }
      if (mode === "protected-diff" && (!repo || !base || !head)) {
        return failure(mode, "Protected-diff mode requires repo, base, and head.");
      }
      if (mode === "protected-diff" && task === "") {
        return failure(mode, "Protected-diff task must be non-empty when provided.");
      }
      if (mode !== "protected-diff" && [repo, base, head, task, worktreeRoot].some(value => value != null && value !== "")) {
        return failure(mode, "Check and JSON modes do not accept repo, base, head, task, or worktreeRoot.");
      }

      const args = mode === "protected-diff"
        ? [validator, "--protected-diff", plan, "--repo", repo!, "--base", base!, "--head", head!, ...(task == null ? [] : ["--task", task]), ...(!worktreeRoot ? [] : ["--worktree-root", worktreeRoot])]
        : [validator, mode === "json" ? "--json" : "--check", plan];
      let stdout = "";
      let stderr = "";
      let exitCode: number | null;
      let boundedFailure: string | undefined;
      try {
        ({ stdout, stderr, exitCode, boundedFailure } = await runValidator(args, ctx.cwd, signal, "Implementation-plan validator"));
      } catch (error) {
        const message = error instanceof Error && "code" in error && error.code === "ENOENT"
          ? "python3 is missing from PATH; cannot check implementation plan."
          : `Unable to run implementation-plan validator: ${String(error)}`;
        return failure(mode, message);
      }

      if (boundedFailure) {
        return failure(mode, boundedFailure, exitCode);
      }

      if (exitCode !== 0 || stderr.trim()) {
        const message = stderr.trim() || `Implementation-plan validator exited with code ${exitCode}.`;
        return failure(mode, message, exitCode, stderr, stdout);
      }
      if (mode === "json") {
        try {
          const tasks: unknown = JSON.parse(stdout);
          if (!Array.isArray(tasks)) {
            return failure(mode, "Implementation-plan validator returned a non-array task DAG.", exitCode, stderr, stdout);
          }
          return {
            content: [{ type: "text" as const, text: stdout }],
            details: { status: "ok", mode, exitCode, stderr, tasks },
          };
        } catch {
          return failure(mode, "Implementation-plan validator returned invalid JSON.", exitCode, stderr, stdout);
        }
      }
      if (stdout.trim()) {
        return failure(mode, "Implementation-plan validator produced unexpected stdout.", exitCode, stderr, stdout);
      }
      return {
        content: [{ type: "text" as const, text: mode === "check" ? "Implementation plan valid." : "Protected diff valid." }],
        details: { status: "ok", mode, exitCode, stderr, stdout },
      };
    },
  });

  pi.registerTool({
    name: "check_doc_status",
    label: "Check Document Status",
    description: "Validate YAML document status with mode=check, read metadata with mode=json, or reject edits to delivered documents and unversioned system-design changes with mode=frozen-diff. For check/json pass path and optionally repo; for frozen-diff pass repo, base, and head. Reads only.",
    parameters: z.object({
      mode: z.enum(["check", "json", "frozen-diff"]),
      path: z.string().nullable().optional().describe("Check/JSON only: document path."),
      repo: z.string().nullable().optional().describe("Repository root: optional for check/JSON, required for frozen-diff."),
      base: z.string().nullable().optional().describe("Frozen-diff only: accepted base commit."),
      head: z.string().nullable().optional().describe("Frozen-diff only: candidate commit."),
    }),
    async execute(_toolCallId, params, signal, _onUpdate, ctx) {
      const { mode, path, repo, base, head } = params;
      if (!existsSync(statusValidator)) {
        return failure(mode, `Document-status validator is missing: ${statusValidator}`);
      }
      if (mode === "frozen-diff" && (!repo || !base || !head || (path != null && path !== ""))) {
        return failure(mode, "Frozen-diff mode requires repo, base, and head, and does not accept path.");
      }
      if (mode !== "frozen-diff" && (!path || [base, head].some(value => value != null && value !== ""))) {
        return failure(mode, "Check and JSON modes require path and do not accept base or head.");
      }
      const args = mode === "frozen-diff"
        ? [statusValidator, "--frozen-diff", "--repo", repo!, "--base", base!, "--head", head!]
        : [statusValidator, mode === "json" ? "--json" : "--check", path!, ...(!repo ? [] : ["--repo", repo])];
      let result: ValidatorResult;
      try {
        result = await runValidator(args, ctx.cwd, signal, "Document-status validator");
      } catch (error) {
        const message = error instanceof Error && "code" in error && error.code === "ENOENT"
          ? "python3 is missing from PATH; cannot check document status."
          : `Unable to run document-status validator: ${String(error)}`;
        return failure(mode, message);
      }
      const { stdout, stderr, exitCode, boundedFailure } = result;
      if (boundedFailure) return failure(mode, boundedFailure, exitCode);
      if (exitCode !== 0 || stderr.trim()) {
        return failure(mode, stderr.trim() || `Document-status validator exited with code ${exitCode}.`,
          exitCode, stderr, stdout);
      }
      if (mode === "json") {
        try {
          const documents: unknown = JSON.parse(stdout);
          if (!Array.isArray(documents)) {
            return failure(mode, "Document-status validator returned a non-array result.", exitCode, stderr, stdout);
          }
          return {
            content: [{ type: "text" as const, text: stdout }],
            details: { status: "ok", mode, exitCode, stderr, documents },
          };
        } catch {
          return failure(mode, "Document-status validator returned invalid JSON.", exitCode, stderr, stdout);
        }
      }
      if (stdout.trim()) {
        return failure(mode, "Document-status validator produced unexpected stdout.", exitCode, stderr, stdout);
      }
      return {
        content: [{ type: "text" as const, text: mode === "frozen-diff" ? "Frozen documents unchanged." : "Document status valid." }],
        details: { status: "ok", mode, exitCode, stderr, stdout },
      };
    },
  });

  pi.registerTool({
    name: "collect_agent_runs",
    label: "Collect Agent Runs",
    description: "Locate one Playbook agent's runs in OMP session transcripts and return JSON pointers: transcript paths and 1-based lines for each run's task, skill read, and final report, the parent's dispatch, result delivery, and the developer's next message, plus Friction: lines from final reports. Pass agent and since; until, project, and sessions are optional. Reads only.",
    parameters: z.object({
      agent: z.string().describe("Playbook agent name, for example review-prompt-agent."),
      since: z.string().describe("Inclusive start: YYYY-MM-DD (UTC day) or ISO 8601."),
      until: z.string().nullable().optional().describe("Inclusive end: YYYY-MM-DD (UTC day) or ISO 8601; omit or null for no end."),
      project: z.string().nullable().optional().describe("Absolute project path; omit or null for every project."),
      sessions: z.string().nullable().optional().describe("OMP sessions directory; omit or null for ~/.omp/agent/sessions."),
    }).strict(),
    async execute(_toolCallId, params, signal, _onUpdate, ctx) {
      const { agent, since, until, project, sessions } = params;
      const fail = (message: string, result?: ValidatorResult) => ({
        content: [{ type: "text" as const, text: message }],
        details: {
          status: "error", message,
          exitCode: result?.exitCode ?? null,
          stderr: result?.stderr ?? "",
          stdout: result?.stdout ?? "",
        },
        isError: true,
      });
      if (!existsSync(runCollector)) {
        return fail(`Agent-run collector is missing: ${runCollector}`);
      }
      if (!agent || !since) {
        return fail("Agent-run collection requires non-empty agent and since.");
      }
      const args = [runCollector, "--agent", agent, "--since", since,
        ...(!until ? [] : ["--until", until]),
        ...(!project ? [] : ["--project", project]),
        ...(!sessions ? [] : ["--sessions", sessions])];
      let result: ValidatorResult;
      try {
        result = await runValidator(args, ctx.cwd, signal, "Agent-run collector");
      } catch (error) {
        const message = error instanceof Error && "code" in error && error.code === "ENOENT"
          ? "python3 is missing from PATH; cannot collect agent runs."
          : `Unable to run agent-run collector: ${String(error)}`;
        return fail(message);
      }
      const { stdout, stderr, exitCode, boundedFailure } = result;
      if (boundedFailure) return fail(boundedFailure, result);
      if (exitCode !== 0 || stderr.trim()) {
        return fail(stderr.trim() || `Agent-run collector exited with code ${exitCode}.`, result);
      }
      let report: unknown;
      try {
        report = JSON.parse(stdout);
      } catch {
        return fail("Agent-run collector returned invalid JSON.", result);
      }
      if (typeof report !== "object" || report === null || !("runs" in report) || !Array.isArray(report.runs)) {
        return fail("Agent-run collector returned no runs array.", result);
      }
      return {
        content: [{ type: "text" as const, text: stdout }],
        details: { status: "ok", exitCode, stderr, report },
      };
    },
  });

  pi.registerTool({
    name: "run_check",
    label: "Run Check",
    description: "Run one foreground project shell command with bash pipefail in cwd, with a timeout. Returns passed/failed/timed-out/unavailable, true exitCode, duration in seconds, last tailLines lines (maximum 64 KiB), and full combined stdout/stderr log outside the repo. Leftover background processes are killed and fail the gate. Unavailable means not verified, not a task-code failure; never merge on it. Project commands may write project files.",
    parameters: z.object({
      command: z.string(),
      cwd: z.string(),
      timeout: z.union([z.number(), z.literal("")]).nullable().optional().describe("Positive seconds, maximum 3600; absent defaults to 120."),
      tailLines: z.union([z.number(), z.literal("")]).nullable().optional().describe("Last 0–1000 lines; absent defaults to 40."),
    }).strict(),
    async execute(_toolCallId, params, signal, _onUpdate, ctx) {
      const timeout = params.timeout == null || params.timeout === "" ? 120 : params.timeout;
      const tailLines = params.tailLines == null || params.tailLines === "" ? 40 : params.tailLines;
      if (!params.command.trim() || !params.cwd || !Number.isFinite(timeout) || timeout <= 0 || timeout > 3600 ||
          !Number.isInteger(tailLines) || tailLines < 0 || tailLines > 1000) {
        return failure("check", "Run check requires command, cwd, timeout in (0, 3600], and integer tailLines in [0, 1000].");
      }
      try {
        const result = await runValidator([checkRunner, "--command", params.command, "--cwd", params.cwd,
          "--timeout", String(timeout), "--tail-lines", String(tailLines)], ctx.cwd, signal, "Check runner",
          undefined, (timeout + 5) * 1000);
        if (result.boundedFailure || result.exitCode !== 0 || result.stderr.trim()) {
          const error = failure("check", result.boundedFailure || result.stderr || "Check runner failed.", result.exitCode, result.stderr, result.stdout);
          const match = result.stdout.match(/"logPath"\s*:\s*("(?:\\.|[^"\\])*")/);
          if (match) {
            const logPath: string = JSON.parse(match[1]);
            return { ...error, content: [{ type: "text" as const, text: `${error.details.message} Full log: ${logPath}` }],
              details: { ...error.details, logPath } };
          }
          return error;
        }
        const report = JSON.parse(result.stdout);
        if (!["passed", "failed", "timed-out", "unavailable"].includes(report.status) ||
            !(report.exitCode === null || Number.isInteger(report.exitCode)) ||
            typeof report.duration !== "number" || typeof report.tail !== "string" ||
            typeof report.logPath !== "string" || typeof report.message !== "string") {
          return failure("check", "Check runner returned an invalid result.");
        }
        return { content: [{ type: "text" as const, text: result.stdout }], details: report };
      } catch (error) {
        return failure("check", `Unable to run check runner: ${String(error)}`);
      }
    },
  });

  // The renderer owns kind-specific validation and absent-value normalization.
  const empty = z.union([z.literal(""), z.array(z.string()).max(0), z.object({}).strict()]);
  const optionalText = z.union([z.string(), empty]).nullable().optional();
  pi.registerTool({
    name: "request_developer",
    label: "Request Developer",
    description: "Validate and render a developer decision, approval, input, or blocked request. Pass request fields directly, with version=1 and either productBasis or productBasisUnavailableReason. Decisions require 2–5 options, recommendation, and maintainability; approval requires acceptance; input requires needed; blocked requires requiredAction and blocking=true. Returns Markdown; never writes files or uses the network.",
    parameters: z.object({
      version: z.literal(1),
      kind: z.enum(["decision", "approval", "input", "blocked"]),
      title: z.string(),
      context: z.string(),
      question: z.string(),
      blocking: z.boolean(),
      productBasis: z.union([z.array(z.object({
        source: z.string(),
        reference: z.string(),
        relevance: z.string(),
      }).strict()), empty]).nullable().optional(),
      productBasisUnavailableReason: optionalText,
      options: z.union([z.array(z.object({
        label: z.string(),
        strengths: z.array(z.string()),
        weaknesses: z.array(z.string()),
        downstream: z.string(),
      }).strict()), empty]).nullable().optional(),
      recommendation: z.union([z.object({
        option: z.string(),
        rationale: z.string(),
      }).strict(), empty]).nullable().optional(),
      maintainability: optionalText,
      acceptance: optionalText,
      needed: optionalText,
      requiredAction: optionalText,
    }).strict(),
    async execute(_toolCallId, request, signal, _onUpdate, ctx) {
      const fail = (message: string, result?: ValidatorResult) => ({
        content: [{ type: "text" as const, text: message }],
        details: {
          status: "error", request, message,
          exitCode: result?.exitCode ?? null,
          stderr: result?.stderr ?? "",
          stdout: result?.stdout ?? "",
        },
        isError: true,
      });
      if (!existsSync(requestRenderer)) {
        return fail(`Developer-request renderer is missing: ${requestRenderer}`);
      }
      let result: ValidatorResult;
      try {
        result = await runValidator(
          [requestRenderer, "--stdin"], ctx.cwd, signal, "Developer-request renderer", JSON.stringify(request));
      } catch (error) {
        const message = error instanceof Error && "code" in error && error.code === "ENOENT"
          ? "python3 is missing from PATH; cannot render developer request."
          : `Unable to run developer-request renderer: ${String(error)}`;
        return fail(message);
      }
      const { stdout, stderr, exitCode, boundedFailure } = result;
      if (boundedFailure) return fail(boundedFailure, result);
      if (exitCode !== 0 || stderr.trim()) {
        return fail(stderr.trim() || `Developer-request renderer exited with code ${exitCode}.`, result);
      }
      return {
        content: [{ type: "text" as const, text: stdout }],
        details: { status: "ok", request, exitCode, stderr },
      };
    },
  });
}
