// Enabling this extension package exposes its sibling agents/ and skills/
// directories and registers one read-only implementation-plan check tool.
// The tool resolves its Python validator from this extension's directory,
// independent of the workspace or process working directory.

import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import type { ExtensionAPI } from "@oh-my-pi/pi-coding-agent";

const validator = fileURLToPath(new URL("./scripts/check-implementation-plans.py", import.meta.url));
// Bound each validator output stream independently; the child has at most 120 seconds to finish.
const MAX_STREAM_BYTES = 16 * 1024 * 1024;
const VALIDATOR_TIMEOUT_MS = 120_000;

type Mode = "check" | "json" | "protected-diff";

function failure(mode: Mode, message: string, exitCode: number | null = null, stderr = "", stdout = "") {
  return {
    content: [{ type: "text" as const, text: message }],
    details: { status: "error", mode, exitCode, stderr, stdout, message },
    isError: true,
  };
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
        ({ stdout, stderr, exitCode, boundedFailure } = await new Promise<{
          stdout: string;
          stderr: string;
          exitCode: number | null;
          boundedFailure?: string;
        }>((resolve, reject) => {
          const child = spawn("python3", args, {
            stdio: ["ignore", "pipe", "pipe"],
            cwd: ctx.cwd,
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
            child.stdout.destroy();
            child.stderr.destroy();
            resolve({ stdout: "", stderr: "", exitCode: null, boundedFailure: message });
          };
          const deadline = setTimeout(() => {
            stop(`Implementation-plan validator exceeded ${VALIDATOR_TIMEOUT_MS / 1000}-second deadline.`);
          }, VALIDATOR_TIMEOUT_MS);
          const collect = (stream: "stdout" | "stderr", chunk: Buffer) => {
            if (settled) return;
            const length = stream === "stdout" ? outputBytes : errorBytes;
            if (length + chunk.length > MAX_STREAM_BYTES) {
              stop(`Implementation-plan validator ${stream} exceeded ${MAX_STREAM_BYTES / (1024 * 1024)} MiB limit.`);
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
          child.on("error", error => {
            if (settled) return;
            settled = true;
            clearTimeout(deadline);
            reject(error);
          });
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
        }));
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
}
