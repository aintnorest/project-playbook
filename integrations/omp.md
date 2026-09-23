# Install the playbook in OMP

The playbook installs once, at the root OMP configuration, and applies to every project. Nothing is copied into consuming repositories.

Enabling this repository as an OMP extension package exposes its two capability directories:

- `agents/` — one agent per task, naming the model, tool boundary, and the skill it autoloads.
- `skills/` — the generated skill directories (`SKILL.md` plus `references/` files read through `skill://<name>/references/<file>`) those agents load.

Two playbook agents spawn `scout` for independent repository research. `scout` ships with OMP and is not provided by this extension.

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

`/agents` lists the playbook agents. Dispatch one by name, or describe the task and let OMP select by description.

The generated skills are marked `hide: true`, so they deliberately do not appear in the global skill menu. Each surfaces only through the agent that autoloads it. An empty skill menu is expected, not a failed install.

## Templates

OMP loads only `agents/` and `skills/`. Templates are plain files you copy by hand: to start a project's roadmap, copy `templates/roadmap.md` from this checkout to `docs/roadmap.md` in the project.

## Model roles

Agents pin concrete models. To route them through roles instead, replace an agent's `model:` value with a `@role` alias and map it under `modelRoles:` in the same configuration file. Changing the mapping then repoints the agent without editing the agent file.

## Update

Pull the checkout:

```sh
git -C ~/development/projects/project-playbook pull
```

Agent and skill files are rediscovered on the next dispatch, so an update needs no restart. Restart only after changing the `extensions:` entry itself.

Pin a release by checking out a tag in that clone when a moving `main` is not acceptable.

## Project-specific facts stay in the project

The playbook carries shared guidance only. Keep each repository's own commands, architecture, and exceptions in that repository, and point its `AGENTS.md` or README at the local document that holds them.

Apply the exception requirements owned by the [product documentation process](../guides/product-documentation-process.md): identify the affected shared rule, its scope, the reason, and the replacement rather than silently overriding it.

## Without OMP

The prompt sources under `prompts/` remain authoritative and readable, and you can copy one and paste it yourself. Nothing outside this repository compiles a prompt source into a runnable artifact, so that path is no longer the intended use. A generated skill embeds its task and the guidance applied on every run, and carries the rest as reference files.
