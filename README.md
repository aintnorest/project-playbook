# Project Playbook

Project Playbook provides reusable guidance and task instructions for planning, documenting, reviewing, and implementing software projects with Oh My Pi (OMP).

## Use the playbook

[Install the playbook in OMP](integrations/omp.md), then dispatch a playbook agent by name or describe the task and let OMP choose one.

Guides define the shared rules for the work. Agents route tasks and enforce their boundaries. Generated skill directories (`SKILL.md` plus `references/`) give each agent the task-specific instructions and guidance it needs. Templates in `templates/` give documents you maintain by hand, such as the roadmap, their starting structure.

Top-level agents and callers follow the [agent guidance](guides/agents.md#developer-communication-and-escalation) and [communication policy](guides/communication-policy.md#rules) before asking the developer for a decision, approval, input, or unblock action. Shared request framing stays in that policy; project-specific product authority stays in the project's own documents.

To review how a project's documents work together, dispatch `review-doc-coherence-agent`. Its [coherence review skill](skill-sources/review-doc-coherence.md) checks roles, levels of detail, competing authority, contradictions, traceability, and context usability against the same guidance used to draft the documents; document-specific agents remain available for individual reviews.

## Changing the playbook

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

The pre-push hook runs the Python tests, OMP extension tests (using Bun), and a check-only Markdown lint. Run the same gate manually with `lefthook run pre-push --force` (`--force` runs it even without pending push files), or run its checks separately:

```sh
python3 -m unittest discover -s tests
bun test
mise run lint-markdown
```

Markdown is checked with rumdl 0.2.77, pinned in `mise.toml` and the cross-platform `mise.lock`. Checks use the installed binary without network access and never rewrite files. `.rumdl.toml` permits long paragraph lines (MD013) and agent bodies without a leading H1 (MD041). Generated `skills/` are excluded; their source Markdown is checked instead.
