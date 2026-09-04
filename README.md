# Project Playbook

A versioned source of truth for reusable project workflows, documentation guidance, and prompts.

## Contents

- `guides/` contains active working agreements.
- `prompts/` contains reusable prompts and communication rules.
- `decisions/` preserves the reasoning behind important playbook choices.
- `scripts/` contains dependency-free maintenance commands.

The initial material comes from workflows already used in production projects. Project-specific rules stay in each project rather than being copied back into this repository.

## Use with mise

[mise](https://mise.jdx.dev/) supplies the development toolchain and repository-wide tasks. It should coordinate language-native package managers rather than replace `Cargo.toml`, `package.json`, `go.mod`, or `pyproject.toml`.

```sh
mise install
mise run check
```

Available tasks:

```sh
mise run check                         # validate repository structure and local links
mise run sync -- /path/to/project      # install the current playbook snapshot
mise run sync:check -- /path/to/project # detect whether an installed snapshot is stale
```

`[settings] lockfile = true` makes `mise install` create or update `mise.lock`. Commit that file so every contributor resolves the same tool version.

## Install into a project

The sync task writes the distributable material to `.project-playbook/` in the target project:

```text
.project-playbook/
  VERSION
  manifest.json
  guides/
  prompts/
```

Clone or update this repository, then run:

```sh
mise run sync -- ../my-project
```

Commit `.project-playbook/` in the target project when contributors, continuous integration, or coding agents need the guidance without access to this repository. Keep project-specific overrides outside `.project-playbook/`; every sync replaces that directory completely.

After updating this repository, tag a release and sync the new version into each consumer through a reviewed pull request. This keeps updates explicit and lets different projects upgrade on their own schedule.

## Source-of-truth rules

1. Edit shared guidance here, not in generated project copies.
2. Give each fact one authoritative document and link to it elsewhere.
3. Put project-specific commands, architecture, and exceptions in the consuming project.
4. Pin released versions for automation; do not execute unpinned remote tasks.
