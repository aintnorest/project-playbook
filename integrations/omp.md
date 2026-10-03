# Install the playbook in OMP

The playbook installs once, at the root OMP configuration, and applies to every project. Nothing is copied into consuming repositories.

Enabling this repository as an OMP extension package exposes:

- `agents/` — one agent per task, naming the model, tool boundary, and the skill it autoloads.
- `skills/` — the generated skill directories (`SKILL.md` plus `references/` files read through `skill://<name>/references/<file>`) those agents load.
- `check_implementation_plan` — a read-only tool for plan syntax, the task DAG, and protected diffs. For assigned tasks, protected-diff also checks the recorded worktree under `<repo-root>/.worktrees`, branch, clean candidate tip, and Git ignore rule; it cannot prove where commits originated. It runs the bundled Python validator, so `python3` and Git must be on `PATH`.
- `check_doc_status` — a read-only tool for document status checks, metadata as JSON, and frozen diffs that reject edits to delivered documents or unversioned system-design changes.
- `run_check` — runs a foreground project command with Bash pipefail, a timeout, and a full combined-output log outside the repository. It reports `passed`, `failed`, `timed-out`, or `unavailable`; project commands may write project files. See the [runner details](../README.md#changing-the-playbook).
- `request_developer` — validates a version-1 developer-request object against `guides/developer-request.schema.json` and returns Markdown. Request fields are the tool arguments themselves, not a nested `request` property. The call arguments are the machine-readable observer contract; consumers observe those arguments rather than parse Markdown or depend on OMP's presentation. The tool does not contact the developer or collect an answer.
- `collect_agent_runs` — a read-only tool that finds one Playbook agent's runs in OMP session transcripts within a time window and returns JSON pointers: transcript paths and 1-based line numbers for each run's task, skill read, final report, the parent session's dispatch and result delivery, and the developer's next message, plus `Friction:` lines from final reports. It reads `~/.omp/agent/sessions` unless given another sessions directory, such as one kept by a separate OMP profile, and needs `python3` and Git on `PATH`.
- `doc_approval` — wraps `scripts/doc-approval.py` with `init`, `status`, `revoke`, and `accept` modes. It initializes or updates the consuming repository's `docs/approvals.json`, reports approval validity, and records agent acceptance with evidence. It refuses agent acceptance of developer-gated documents.
- `factory_status` — wraps `scripts/factory-status.py` to report the current feature and slice, document states and approvals, open gates, the next document-derived step, and ambiguity between unfinished features.

The checkers invoke Git with `--no-optional-locks`, including protected-diff and frozen-diff checks, so inspection does not refresh or write the consuming repository's index. For protected-diff, a null or empty `worktreeRoot` is treated as absent; an assigned candidate still requires the recorded worktree root. An explicitly empty `task` is rejected rather than treated as absent.

Two playbook agents spawn `scout` for independent repository research. `scout` ships with OMP and is not provided by this extension.

OMP's task `isolated` creates a temporary workspace, applies its patch or cherry-picks its branch back into the parent checkout, then removes the workspace. It cannot pin a worker to the orchestrator's chosen persistent worktree, so leave it off for plan execution. An ordinary task inherits the parent's working directory; it has no per-item directory setting. The orchestration skill therefore assigns `<repo-root>/.worktrees/<name>` and requires explicit worktree paths for every file operation and command. If `.worktrees/` is not already ignored by Git, execution stops until the developer adds it to the repository's `.gitignore`; the agent neither edits ignore files nor chooses an alternate directory. The protected-diff gate checks worktree identity and candidate state, but cannot prevent edits elsewhere.

## Install

Clone the playbook once, somewhere stable:

```sh
git clone https://github.com/aintnorest/project-playbook.git ~/development/projects/project-playbook
```

Add the checkout to `extensions:` in the root OMP configuration, `~/.omp/agent/config.yml`:

```yaml
extensions:
  - ~/development/projects/project-playbook
```

Restart OMP. A new extension root is read at startup; `/reload-plugins` refreshes only skills, commands, and MCP servers.

## Verify

`/agents` lists the playbook agents. Dispatch one by name, or describe the task and let OMP select by description. The draft, review, and orchestration implementation-plan agents each include `check_implementation_plan` in their task-agent tool list, and `review-friction-agent` includes `collect_agent_runs`.

The generated skills are marked `hide: true`, so they deliberately do not appear in the global skill menu. Hidden skills remain reachable through `skill://<name>` and `/skill:<name>` when `skills.enableSkillCommands` is enabled. Agents autoload their own skills; load the factory skill explicitly as described below. An empty skill menu is expected, not a failed install.

The `review-code-*` agents list `ast_grep` and `lsp` in their tools, but OMP withholds both from spawned agents by default. Set these in the same configuration file, or run `omp config set astGrep.enabled true` and `omp config set task.enableLsp true`:

```yaml
astGrep:
  enabled: true
task:
  enableLsp: true
```

`task.enableLsp` gives spawned agents LSP; agents with a `tools` list receive only its read-only actions. It costs extra tokens for every agent that lists `lsp`. `lsp` also needs each project's language server on `PATH`, for example `rust-analyzer` (`rustup component add rust-analyzer` for every toolchain the project uses), `typescript-language-server`, or `basedpyright-langserver` (or `pyright-langserver`) for Python. Restart OMP after changing these settings. If a project uses mise shims for language servers, follow the [project tooling guide's trust instructions](../guides/project-tooling.md#trust-configuration-outside-ci).

## Software factory

In the consuming project's main interactive OMP session, enter:

```text
/skill:orchestrate-factory
```

This loads the factory procedure into the session that talks to the developer; there is no `orchestrate-factory-agent`. The main session drives the next step and dispatches drafting, review, implementation, and fix agents. The skill initializes `docs/approvals.json` for a new project. To opt an existing consumer project in, use `doc_approval` with mode `init`; migrate its legacy product-document approvals using the [consumer migration guide](../guides/migrations/0.1.0-to-1.0.0.md).

The presence of `docs/approvals.json` opts that repository into enforcement. Every factory hook is inert when the file is absent. The [process guide's approvals section](../guides/product-documentation-process.md#approvals) owns approval rules, and the [code-review cycle](../guides/code-review.md#review-cycle) owns implementation and fix review rules.

The extension registers these hooks:

| Hook | Runtime effect in an opted-in repository |
| --- | --- |
| Approvals-file guard (`tool_call`, all sessions) | Blocks direct `edit`, `write`, and `ast_edit` paths or globs targeting `docs/approvals.json`; blocks shell/eval text that names the file with a write pattern, or invokes `--developer-approve`. Reads remain allowed. Agents use `doc_approval` instead. |
| Creation guard (`tool_call`, all sessions) | Blocks creation of a downstream document while a prerequisite approval gate is open. Edits to existing documents remain allowed. The refusal names the open gate and expected next step. |
| Implementation gate (`before_subagent_spawn`) | Blocks `orchestrate-implementation-plan-agent` until the current slice's TDD and plan have valid approvals and its upstream developer gates are approved. Worker, reviewer, and fix-agent spawns are not gated. |
| Revision limit (`before_subagent_spawn` and creation guard) | Counts `draft-*` revisions in memory for the main session's agent tree; creating a new document is a first draft, not a revision. The sixth revision is refused with an instruction to stop and summarize for the developer. A main-session developer message, explicit `ask` answer, recorded acceptance, or developer approval resets the count; timeouts, cancellation, and chat redirects do not. A session restart loses the count. |
| Status line (`before_agent_start`, main session only) | Appends document-derived factory status, the revision count, and a pointer to `skill://orchestrate-factory` without replacing the base prompt. Execution phase and review round remain with the skill; ask it for full status. |

When unfinished work spans multiple features, order and implementation hooks do not block; status reports the ambiguity instead.

To record a developer approval, enter `/playbook-approve <path>` in the interactive session, using a repository-relative document path. The command presents the document type's attestation through OMP's confirmation UI, then records approval only after the developer confirms. It refuses without a UI or when confirmation is declined; agents cannot substitute a shell invocation.

These checks target forgotten or skipped steps, not deliberate circumvention. The factory needs only OMP and the Playbook; it is not a security sandbox.

## Developer requests and OMP's built-in ask

The [communication policy](../guides/communication-policy.md#rules) owns request content and sequencing in OMP. Validate/render through `request_developer` first and include its Markdown verbatim in the developer-facing message. The seven draft agents and the implementation-plan orchestrator allow this tool. Task subagents are headless: they return the rendered request verbatim to their caller, who owns developer escalation and any interactive `ask` call. Do not add `ask` to task-agent tool lists.

For a blocking decision, the interactive caller then calls the built-in `ask` tool with `questions: [{id, question, options, recommended}]`: put the complete rendered Markdown in `question`, copy the decision's option labels in the same order into `options: [{label}]`, and set `recommended` to the zero-based index of the named recommendation. This preserves full context in both the rich dialog and the fallback picker; do not rely on option previews or a previous message for essential facts.

`ask` is interactive-only: OMP registers it only when the session has a UI, and `omp --help` identifies it as “Ask user questions (interactive mode only).” Its documented interface accepts descriptions and previews, but fallback selectors do not display previews. It adds its own `Other (type your own)`, `Chat about this`, and `Next →` controls; do not use those reserved option labels. The runtime does not enforce 2–5 choices, so the Playbook request validator owns that limit.

Inspect the answer before resuming: `details.timedOut` reports timeout auto-selection and `details.chatRedirect` reports a request to discuss instead. Cancellation throws; none of these is developer acceptance. When `ask` is unavailable, retain the rendered request verbatim and wait for an explicit reply. Reviews return questions to their caller; the top-level caller owns any developer escalation. Without the extension tool, pass JSON on stdin to `python3 <playbook-checkout>/scripts/request-developer.py --stdin`; `--request '<JSON>'` remains a CLI fallback. Valid Markdown is on stdout, invalid requests return precise stderr errors and a nonzero status, with no files or network touched. Shell-capable callers own this fallback; it does not require widening a task agent's tool list.

Runtime evidence: OMP's local `docs/tools/ask.md`, sections `Inputs`, `Flow`, and `Limits & Caps`, documents the UI guard, schema, fallback behavior, timeout result, and reserved controls. `docs/tools/task.md`, `Flow` step 12, documents headless child sessions with no UI to confirm prompts; combined with `ask`'s `session.hasUI` registration guard, this excludes task-subagent use. Verified against `omp --help` on OMP v18.4.4; the policy and machine-readable observer contract target OMP.

## Templates

OMP discovers `agents/` and `skills/` as capability directories; the extension factory registers the tools, hooks, and developer command. Templates are plain files you copy by hand: to start a project's roadmap, copy `templates/roadmap.md` from this checkout to `docs/roadmap.md` in the project.

## Model roles

Agents pin concrete models. To route them through roles instead, replace an agent's `model:` value with a `@role` alias and map it under `modelRoles:` in the same configuration file. Changing the mapping then repoints the agent without editing the agent file.

## Update

Pull the checkout:

```sh
git -C ~/development/projects/project-playbook pull
```

Agents are rediscovered on the next dispatch, but an active session's skill registry can retain the old names. After adding or renaming a skill, run `/reload-plugins` or start a fresh OMP session before dispatching its agent; otherwise the new agent can be found while its `skill://` URI is still unknown. Restart after changing the `extensions:` entry itself.

Restart OMP after changing `omp-extension.ts`, including after pulling an extension-load fix. Sessions that failed to load the extension do not acquire its tools automatically; `/reload-plugins` does not reload extension factories.

Pin a release by checking out a tag in that clone when a moving `main` is not acceptable.

## Project-specific facts stay in the project

The playbook carries shared guidance only. Keep each repository's own commands, architecture, and exceptions in that repository, and point its `AGENTS.md` or README at the local document that holds them.

Apply the exception requirements owned by the [product documentation process](../guides/product-documentation-process.md): identify the affected shared rule, its scope, the reason, and the replacement rather than silently overriding it.

## Without OMP

The skill sources under `skill-sources/` remain authoritative and readable, and you can copy one and paste it yourself. Nothing outside this repository compiles a skill source into a runnable artifact, so that path is no longer the intended use. A generated skill embeds its task and the guidance applied on every run, and carries the rest as reference files.
