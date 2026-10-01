# Project Playbook

Project Playbook provides reusable guidance and task instructions for planning, documenting, reviewing, and implementing software projects with Oh My Pi (OMP).

## Use the playbook

[Install the playbook in OMP](integrations/omp.md), then dispatch a playbook agent by name or describe the task and let OMP choose one.

Guides define the shared rules for the work. Agents route tasks and enforce their boundaries. Generated skill directories (`SKILL.md` plus `references/`) give each agent the task-specific instructions and guidance it needs. Templates in `templates/` give documents you maintain by hand, such as the roadmap, their starting structure.

Top-level agents and callers follow the [agent guidance](guides/agents.md#developer-communication-and-escalation) and [communication policy](guides/communication-policy.md#rules) before asking the developer for a decision, approval, input, or unblock action. Shared request framing stays in that policy; project-specific product authority stays in the project's own documents.

To review how a project's documents work together, dispatch `review-doc-coherence-agent`. Its [coherence review skill](skill-sources/review-doc-coherence.md) checks roles, levels of detail, competing authority, contradictions, traceability, and context usability against the same guidance used to draft the documents; document-specific agents remain available for individual reviews.

To improve an agent from its real runs, dispatch `review-friction-agent` for it over a time window. It finds the agent's runs in OMP's session transcripts through the `collect_agent_runs` tool and reports friction as evidence records. Then dispatch `review-prompt-agent` with those records and apply the corrections you choose; [failure-driven maintenance](guides/skill-design.md#failure-driven-maintenance) describes the loop.

## Changing the playbook

When you remove a mechanism, or learn that the reason for one was wrong, list everything that exists only to serve it — fields, report sections, skill wording, checks, tests, and docs — and in the same change either delete each one or give it a current reason. For example, removing the reviewer JSON schema also had to remove the report section that existed only to carry the schema's top-level fields.

Edit skill sources in `skill-sources/` or shared rules in `guides/`; never edit generated files in `skills/`. A git pre-commit hook regenerates the skills, stages them, and runs the build check, so a commit can never carry a stale skill. Install the hook once per clone:

```sh
brew install lefthook
lefthook install
```

Regenerate by hand when you want to inspect the result before committing:

```sh
python3 scripts/build-skills.py
```

Before pushing, install the pinned Markdown linter with [mise](guides/project-tooling.md) once:

```sh
mise trust
mise install
```

Install the extension test dependency with `bun install --frozen-lockfile`. The tests use the real `@oh-my-pi/omptype/zod` builder, pinned to the verified OMP 18.4.4 runtime, rather than a schema mock. OMP injects this Zod-compatible subset as `pi.zod`; it does not expose every Zod method. Empty optional arrays use `.max(0)` because the runtime has no `z.never()`.

The pre-push hook runs the Python tests, OMP extension tests (using Bun), a real installed-OMP sandbox load check (fresh temporary HOME/agent config and minimal environment, no model turn), and a check-only Markdown lint. Run the same gate manually with `lefthook run pre-push --force` (`--force` runs it even without pending push files), or run its checks separately:

```sh
python3 -m unittest discover -s tests
bun test
python3 scripts/check-omp-load.py
mise run lint-markdown
```

Git hooks export repository-location overrides such as `GIT_DIR`; those override even `git -C` and can redirect temporary fixtures into the repository being pushed. Git-creating Python fixtures import a shared suite sanitizer, and Bun preloads its suite sanitizer; both discard all inherited `GIT_*` variables before creating fixtures. Pre-push commands also run through `scripts/git_environment.py` as defense in depth. The repository checkers and run collector use that same Python helper for their Git subprocesses, so their explicit repository paths remain authoritative.

Markdown is checked with rumdl 0.2.77, pinned in `mise.toml` and the cross-platform `mise.lock`. Checks use the installed binary without network access and never rewrite files. `.rumdl.toml` permits long paragraph lines (MD013) and agent bodies without a leading H1 (MD041). Generated `skills/` are excluded; their source Markdown is checked instead.

`run_check` (CLI: `python3 scripts/run-check.py --command 'your check' --cwd /path/to/repo`) runs foreground project commands with Bash pipefail, a timeout, and a full combined-output log outside the repo. Leftover background processes fail the gate and are killed; cancellation kills the command process group too. Results are `passed`, `failed`, `timed-out`, or `unavailable` (exit 127: missing command, not verified rather than a task-code failure); only `passed` permits integration. Optional `timeout` and `tailLines` default to 120 seconds and 40 lines; returned output is also capped at 64 KiB, without truncating the full log.

`run_check` also removes inherited `GIT_*` variables from project commands while preserving ordinary environment settings. Its explicit `cwd` selects the project, not the caller's hook repository. A command that intentionally needs a Git override can set it explicitly inside `--command`. The regression suite runs Python and Bun fixtures, both repository checker CLIs, and `run_check` with Git overrides pointing at a scratch victim, then compares the victim's config, refs, and HEAD byte for byte.
