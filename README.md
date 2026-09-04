# Project Playbook

A versioned source of truth for reusable project workflows, documentation guidance, and prompts.

This repository contains documentation only. It has no runtime, package-manager, or development-tool dependency.

## Contents

- `guides/` contains active working agreements.
- `prompts/` contains reusable prompts and communication rules.
- `decisions/` preserves the reasoning behind important playbook choices.
- `integrations/` explains how other repositories consume the playbook.

The initial material comes from workflows already used in production projects. Project-specific rules stay in each project rather than being copied back into this repository.

## Distribution

Edit shared guidance here and tag stable releases. Each consuming repository owns the automation that fetches its selected release.

[The mise integration](integrations/mise.md) shows how a consuming repository can expose `mise run playbook:update`. Mise belongs in the repositories that already use it for toolchains and tasks; this documentation repository does not need a `mise.toml`.

## Source-of-truth rules

1. Edit shared guidance here, not in generated project copies.
2. Give each fact one authoritative document and link to it elsewhere.
3. Put project-specific commands, architecture, and exceptions in the consuming project.
4. Pin released versions for automation; do not execute unpinned remote tasks.
