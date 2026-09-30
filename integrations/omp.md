# Install the playbook in OMP

The playbook installs once, at the root OMP configuration, and applies to every project. Nothing is copied into consuming repositories.

Enabling this repository as an OMP extension package exposes:

- `agents/` — one agent per task, naming the model, tool boundary, and the skill it autoloads.
- `skills/` — the generated skill directories (`SKILL.md` plus `references/` files read through `skill://<name>/references/<file>`) those agents load.
- `check_implementation_plan` — a read-only tool for plan syntax, the task DAG, and protected diffs. For assigned tasks, protected-diff also checks the recorded worktree under `<repo-root>/.worktrees`, branch, clean candidate tip, and Git ignore rule; it cannot prove where commits originated. It runs the bundled Python validator, so `python3` and Git must be on `PATH`.
- `request_developer` — validates a version-1 developer-request object against `guides/developer-request.schema.json` and returns Markdown. Request fields are the tool arguments themselves, not a nested `request` property. The call arguments are the machine-readable observer contract; consumers observe those arguments rather than parse Markdown or depend on OMP's presentation. The tool does not contact the developer or collect an answer.

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

`/agents` lists the playbook agents. Dispatch one by name, or describe the task and let OMP select by description. The draft, review, and orchestration implementation-plan agents each include `check_implementation_plan` in their task-agent tool list.

The generated skills are marked `hide: true`, so they deliberately do not appear in the global skill menu. Each surfaces only through the agent that autoloads it. An empty skill menu is expected, not a failed install.

The `review-code-*` agents list `ast_grep` and `lsp` in their tools, but OMP withholds both from spawned agents by default. Set these in the same configuration file, or run `omp config set astGrep.enabled true` and `omp config set task.enableLsp true`:

```yaml
astGrep:
  enabled: true
task:
  enableLsp: true
```

`task.enableLsp` gives spawned agents LSP; agents with a `tools` list receive only its read-only actions. It costs extra tokens for every agent that lists `lsp`. `lsp` also needs each project's language server on `PATH`, for example `rust-analyzer` (`rustup component add rust-analyzer` for every toolchain the project uses), `typescript-language-server`, or `basedpyright-langserver` (or `pyright-langserver`) for Python. Restart OMP after changing these settings. If a project uses mise shims for language servers, follow the [project tooling guide's trust instructions](../guides/project-tooling.md#trust-configuration-outside-ci).

## Developer requests and OMP's built-in ask

The [communication policy](../guides/communication-policy.md#rules) owns request content and sequencing in OMP. Validate/render through `request_developer` first and include its Markdown verbatim in the developer-facing message. The seven draft agents and the implementation-plan orchestrator allow this tool. Task subagents are headless: they return the rendered request verbatim to their caller, who owns developer escalation and any interactive `ask` call. Do not add `ask` to task-agent tool lists.

For a blocking decision, the interactive caller then calls the built-in `ask` tool with `questions: [{id, question, options, recommended}]`: put the complete rendered Markdown in `question`, copy the decision's option labels in the same order into `options: [{label}]`, and set `recommended` to the zero-based index of the named recommendation. This preserves full context in both the rich dialog and the fallback picker; do not rely on option previews or a previous message for essential facts.

`ask` is interactive-only: OMP registers it only when the session has a UI, and `omp --help` identifies it as “Ask user questions (interactive mode only).” Its documented interface accepts descriptions and previews, but fallback selectors do not display previews. It adds its own `Other (type your own)`, `Chat about this`, and `Next →` controls; do not use those reserved option labels. The runtime does not enforce 2–5 choices, so the Playbook request validator owns that limit.

Inspect the answer before resuming: `details.timedOut` reports timeout auto-selection and `details.chatRedirect` reports a request to discuss instead. Cancellation throws; none of these is developer acceptance. When `ask` is unavailable, retain the rendered request verbatim and wait for an explicit reply. Reviews return questions to their caller; the top-level caller owns any developer escalation. Without the extension tool, pass JSON on stdin to `python3 <playbook-checkout>/scripts/request-developer.py --stdin`; `--request '<JSON>'` remains a CLI fallback. Valid Markdown is on stdout, invalid requests return precise stderr errors and a nonzero status, with no files or network touched. Shell-capable callers own this fallback; it does not require widening a task agent's tool list.

Runtime evidence: OMP's local `docs/tools/ask.md`, sections `Inputs`, `Flow`, and `Limits & Caps`, documents the UI guard, schema, fallback behavior, timeout result, and reserved controls. `docs/tools/task.md`, `Flow` step 12, documents headless child sessions with no UI to confirm prompts; combined with `ask`'s `session.hasUI` registration guard, this excludes task-subagent use. Verified against `omp --help` on OMP v18.4.4; the policy and machine-readable observer contract target OMP.

## Templates

OMP discovers `agents/` and `skills/` as capability directories; the extension factory registers the tool. Templates are plain files you copy by hand: to start a project's roadmap, copy `templates/roadmap.md` from this checkout to `docs/roadmap.md` in the project.

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
