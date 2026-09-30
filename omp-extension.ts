// Enabling this extension package exposes its sibling agents/ and skills/
// directories and registers read-only document checks and developer-request rendering.
// Scripts resolve from this extension's directory, independent of the workspace.

import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import type { ExtensionAPI } from "@oh-my-pi/pi-coding-agent";

const validator = fileURLToPath(new URL("./scripts/check-implementation-plans.py", import.meta.url));
const statusValidator = fileURLToPath(new URL("./scripts/check-doc-status.py", import.meta.url));
const requestRenderer = fileURLToPath(new URL("./scripts/request-developer.py", import.meta.url));
// Bound each validator output stream independently; the child has at most 120 seconds to finish.
const MAX_STREAM_BYTES = 16 * 1024 * 1024;
const VALIDATOR_TIMEOUT_MS = 120_000;

type Mode = "check" | "json" | "protected-diff" | "frozen-diff";

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

async function runValidator(args: string[], cwd: string, signal: AbortSignal | undefined, label: string, stdinPayload?: string): Promise<ValidatorResult> {
  return new Promise<ValidatorResult>((resolve, reject) => {
    const child = spawn("python3", args, {
      stdio: [stdinPayload === undefined ? "ignore" : "pipe", "pipe", "pipe"],
      cwd,
      signal,
    });
    const output: Buffer[] = [];
    const errors: Buffer[] = [];
    let outputBytes = 0;
    let errorBytes = 0;
    let settled = false;
    const stop = (message: string) => {
      if (settled) return;
      settled = true;
      clearTimeout(deadline);
      child.kill("SIGKILL");
      child.stdin?.destroy();
      child.stdout.destroy();
      child.stderr.destroy();
      resolve({ stdout: "", stderr: "", exitCode: null, boundedFailure: message });
    };
    const deadline = setTimeout(() => {
      stop(`${label} exceeded ${VALIDATOR_TIMEOUT_MS / 1000}-second deadline.`);
    }, VALIDATOR_TIMEOUT_MS);
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
    const fail = (error: Error) => {
      if (settled) return;
      settled = true;
      clearTimeout(deadline);
      child.kill("SIGKILL");
      child.stdin?.destroy();
      child.stdout.destroy();
      child.stderr.destroy();
      reject(error);
    };
    child.on("error", fail);
    child.stdin?.on("error", fail);
    child.on("close", code => {
      if (settled) return;
      settled = true;
      clearTimeout(deadline);
      resolve({
        stdout: Buffer.concat(output, outputBytes).toString("utf8"),
        stderr: Buffer.concat(errors, errorBytes).toString("utf8"),
        exitCode: code,
      });
    });
    child.stdin?.end(stdinPayload);
  });
}

export default function projectPlaybook(pi: ExtensionAPI) {
  const z = pi.zod;

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
      task: z.string().nullable().optional().describe("Protected-diff only: optional task ID; omit or null for check/json."),
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
        ? [validator, "--protected-diff", plan, "--repo", repo!, "--base", base!, "--head", head!, ...(task == null ? [] : ["--task", task]), ...(worktreeRoot == null ? [] : ["--worktree-root", worktreeRoot])]
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
    description: "Validate YAML document status with mode=check, read metadata with mode=json, or reject edits to delivered documents and unversioned system-design changes with mode=frozen-diff. For check/json pass path; for frozen-diff pass repo, base, and head. Reads only.",
    parameters: z.object({
      mode: z.enum(["check", "json", "frozen-diff"]),
      path: z.string().nullable().optional().describe("Check/JSON only: document path."),
      repo: z.string().nullable().optional().describe("Frozen-diff only: repository root."),
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
      if (mode !== "frozen-diff" && (!path || [repo, base, head].some(value => value != null && value !== ""))) {
        return failure(mode, "Check and JSON modes require path and do not accept repo, base, or head.");
      }
      const args = mode === "frozen-diff"
        ? [statusValidator, "--frozen-diff", "--repo", repo!, "--base", base!, "--head", head!]
        : [statusValidator, mode === "json" ? "--json" : "--check", path!];
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
