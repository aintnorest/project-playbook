---
state: draft
revision: arch-r3
---

# System architecture: Project Playbook

## Status

This document records the technical foundations every Playbook change inherits. It is governed by the [product vision](product-vision.md).

## Imposed constraints

The vision's [product-wide boundaries](product-vision.md#product-wide-boundaries-and-non-goals) and [constraints every feature must preserve](product-vision.md#constraints-every-feature-must-preserve) bind every technical choice here; the rules below give checks over trust, versioned contracts, and the developer's safety their technical form without restating them. The Playbook ships no runtime for consuming projects and runs only on the developer's machine, inside OMP or a shell.

## System boundary

- **OMP.** Owns discovery of agent and skill capability directories, extension loading, the extension API and schema library that tools are declared with, agent dispatch and models, sessions and provider calls, and interactive questions. The Playbook integrates as an extension package declared in `package.json` [EXISTS]; installation and OMP runtime facts live in `integrations/omp.md` [EXISTS].
- **`python3` on `PATH`.** Owns execution of every checker, renderer, and the build; the Playbook reaches it only as a child process.
- **Git.** Owns history, revisions, branches, and worktrees; checkers read it only through the `git` command, and consumers receive the Playbook as a clone of `git@github.com:aintnorest/project-playbook.git` [EXISTS] (`.git/config`).
- **Consuming project repositories.** Each owns its own documents, commands, toolchain, and exceptions; the Playbook reads them only through agents and checker arguments.

## Technology decisions

- OMP is the only harness the Playbook targets. Guides, skill sources, scripts, and generated output may state OMP facts directly; no layer is kept harness-neutral for portability.
- All deterministic logic — checkers, the developer-request renderer, and the skill build — is Python 3 using only the standard library, run as command-line programs with no install step.
- OMP extension code is TypeScript loaded directly by OMP, importing only Node built-ins and OMP's extension API, with no package dependencies and no build step.
- Human-authored content — guides, skill sources, agents, templates, and documents — is Markdown; machine-readable contracts are JSON, and JSON Schema where a shape is validated.

## Decomposition and repository structure

The repository separates authored rules, authored task procedures, generated per-task artifacts, deterministic programs, and OMP extension code, so each rule and each check has exactly one home. Top-level layout (every `[EXISTS]` path in this document was verified by listing the repository root and the named directories):

- `guides/` [EXISTS] — shared rules, each stated once, plus machine-readable contracts such as `guides/developer-request.schema.json` [EXISTS] and `guides/findings-schemas.json` [EXISTS].
- `skill-sources/` [EXISTS] — one authored task procedure per skill, selecting guide sections by link.
- `skills/` [EXISTS] — generated per-task skills (`SKILL.md` plus `references/`); committed so consumers never build.
- `agents/` [EXISTS] — one OMP agent per skill, plus `agents/routing-cases.json` [EXISTS] and build-check exceptions in `agents/checks.json` [EXISTS].
- `scripts/` [EXISTS] — the build and the checker command-line programs.
- `extensions/` [PROPOSED] — way-of-working OMP extensions, one module each; created with the first such extension.
- `tests/` [EXISTS] — executable proof for `scripts/` and all extension code.
- `templates/` [EXISTS] — starting files consumers copy by hand into their own projects.
- `integrations/` [EXISTS] — installation, update, and OMP runtime facts a consumer acts on.
- `research/` [EXISTS] — evidence notes that inform guidance and never govern it.
- `docs/` [EXISTS] — the Playbook's own product documents.
- `.beads/` [EXISTS] — the maintainer's issue-tracker state; never loaded by consumers.
- Root files: `omp-extension.ts` [EXISTS] (contract tools), `package.json` [EXISTS] (extension manifest), `VERSION` [EXISTS], `lefthook.yml` [EXISTS] (Git hooks), `mise.toml` [EXISTS] and `mise.lock` [EXISTS] (maintainer tool pins and tasks), `.rumdl.toml` [EXISTS] (Markdown check configuration), `README.md` [EXISTS].

## Boundaries and dependency rules

- **Source and generated output.** Only `scripts/build-skills.py` [EXISTS] writes `skills/` and the `output:` line of review agents; authors edit `guides/`, `skill-sources/`, and the rest of `agents/`. The build refuses to overwrite a file without its generated marker, and its check fails on stale output.
- **One home per rule.** A rule lives in one guide section; skill sources link to that section, and the build inlines guidance every run needs and ships conditional guidance as references ([skill construction](../guides/skill-design.md#scope-and-disclosure)). No skill source, agent, or integration note restates a guide rule.
- **Contract tools.** A tool that enforces or renders a Playbook contract is registered in `omp-extension.ts`, and every validation, parse, and rendering it performs lives in a `scripts/` program; the tool only maps arguments to that program's mode flags, runs it as a bounded child process, and translates its exit status and output. The program's command-line mode is the fallback when the tool is not loaded, not a portability promise.
- **Way-of-working extensions.** An OMP extension that supports the way of working without enforcing a Playbook contract — for example, a prompt-cache keep-alive, should one ever be built — is its own module under `extensions/`, declared in the extension list in `package.json`, and acts only through OMP's extension API. Contract tools never depend on such a module, so each one can be removed alone.
- **Trust boundary.** At runtime nothing writes to the Playbook checkout or the consuming project: contract tools and checkers only read files and Git state named by their arguments, never use the network, and never contact the developer. Scripts resolve their own files relative to their location, never the caller's workspace.

## Build, tooling, and test execution

- `scripts/build-skills.py` is the only build; its check mode gates generated-output freshness, the agent contract, and routing cases ([build check](../guides/agents.md#build-check)).
- `lefthook.yml` owns the Git hooks: pre-commit regenerates, stages, and checks generated output, so no commit carries a stale skill; pre-push runs the Python tests, the Bun tests, and the [Markdown check](#conventions), so no push carries a failing test or Markdown violation.
- Checker tests are black-box command-line contract tests under `unittest` that run each program as a subprocess against temporary files and temporary Git repositories. Extension tests run under Bun's test runner against a stub extension API and the real programs. The README owns the commands.
- Every generated skill stays within the size limit that `scripts/build-skills.py` enforces; the build owns the numbers.

## Cross-cutting concepts

- **No persistence or service.** The Playbook keeps no state of its own; every durable fact is a file under Git, in this repository or the consuming project.
- **Program output contract.** A checker is deterministic for the same files and revisions. It reports diagnostics on standard error with a nonzero exit, and writes standard output only in its machine-readable modes; adapters treat any other output as a failure.
- **Tool arguments.** An optional tool argument that is null or empty means absent, and a mode rejects any non-empty argument that belongs to another mode.
- **Distribution.** Consumers enable a clone of this repository as an OMP extension, optionally pinned to a release tag ([install](../integrations/omp.md#install)); because of the trust boundary, a pinned checkout may be read-only.
- **Releases.** `VERSION` owns the release number, and each release is the Git tag `v<version>` (`.git/refs/tags/v0.1.0` [EXISTS] matches `VERSION`); the `package.json` version is not a release identifier. Numbers follow [Semantic Versioning](https://semver.org/): a change that makes a previously valid document, plan, or tool call invalid, or changes the meaning of existing checker or tool output, bumps the major number; an additive contract change bumps the minor number; a release with no contract change bumps the patch number. Which contracts count is owned by the vision's versioned-contracts constraint.
- **Migrations.** Each release that changes a contract ships its guided migration as `guides/migrations/<from>-to-<to>.md` [PROPOSED], named by the two release numbers; releases with no contract change have none.

## Conventions

- Agent frontmatter, body, description, and routing cases: [agents and skills](../guides/agents.md), checked by the build.
- Skill sources and generated skills: [skill construction](../guides/skill-design.md) and [prompt design](../guides/prompt-design.md).
- Prose: [technical-writing standards](../guides/technical-writing-standards.md).
- Markdown: maintained Markdown passes rumdl, pinned in `mise.toml` and `mise.lock`, configured by `.rumdl.toml`, and run by the `lint-markdown` task in `mise.toml`, which also owns the checked paths; generated skills are excluded.
- Document frontmatter for `docs/` and status-bearing guides: [document state and revision](../guides/product-documentation-process.md#document-state-and-revision), checked by `scripts/check-doc-status.py` [EXISTS].
- Developer requests: `guides/developer-request.schema.json`, validated by `scripts/request-developer.py` [EXISTS].
- Illustrative features use the guides' `EXPORT` example ([routing cases](../guides/agents.md#routing-cases)).

## Technology index

| Choice | Status | Authority | Rule |
| --- | --- | --- | --- |
| OMP as the only harness | Decided | Developer, 2026-09-29 | [Technology decisions](#technology-decisions) |
| Python standard-library programs | Decided | Developer, repository at `96ae784` | [Technology decisions](#technology-decisions) |
| Dependency-free TypeScript extension code | Decided | Developer, repository at `96ae784` | [Technology decisions](#technology-decisions) |
| Markdown and JSON formats | Decided | Developer, repository at `96ae784` | [Technology decisions](#technology-decisions) |
| Repository layout | Decided | Developer, repository at `96ae784` | [Decomposition and repository structure](#decomposition-and-repository-structure) |
| Generated skills | Decided | Developer, commit `f10819d` | [Boundaries and dependency rules](#boundaries-and-dependency-rules) |
| One home per rule | Decided | Developer, repository at `96ae784` | [Boundaries and dependency rules](#boundaries-and-dependency-rules) |
| Contract tools backed by programs | Decided | Developer, 2026-09-29 | [Boundaries and dependency rules](#boundaries-and-dependency-rules) |
| Way-of-working extensions | Decided | Developer, 2026-09-29 | [Boundaries and dependency rules](#boundaries-and-dependency-rules) |
| Read-only runtime | Decided | Developer, repository at `96ae784` | [Boundaries and dependency rules](#boundaries-and-dependency-rules) |
| Build and pre-commit hook | Decided | Developer, repository at `96ae784` | [Build, tooling, and test execution](#build-tooling-and-test-execution) |
| Pre-push hook | Decided | Developer, 2026-09-29 | [Build, tooling, and test execution](#build-tooling-and-test-execution) |
| Contract test strategy | Decided | Developer, repository at `96ae784` | [Build, tooling, and test execution](#build-tooling-and-test-execution) |
| Skill size limit | Decided | Developer, repository at `96ae784` | [Build, tooling, and test execution](#build-tooling-and-test-execution) |
| No persistence or service | Decided | Developer, repository at `96ae784` | [Cross-cutting concepts](#cross-cutting-concepts) |
| Program output contract | Decided | Developer, repository at `96ae784` | [Cross-cutting concepts](#cross-cutting-concepts) |
| Null or empty means absent | Decided | Developer, commit `d73aeb7` | [Cross-cutting concepts](#cross-cutting-concepts) |
| Extension distribution | Decided | Developer, repository at `96ae784` | [Cross-cutting concepts](#cross-cutting-concepts) |
| Release identity and Semantic Versioning | Decided | Developer, 2026-09-29 | [Cross-cutting concepts](#cross-cutting-concepts) |
| Migration guides | Decided | Developer, 2026-09-29 | [Cross-cutting concepts](#cross-cutting-concepts) |
| Markdown check with rumdl | Decided | Developer, 2026-09-29 | [Conventions](#conventions) |
| Python 3.9 floor | Current scope | Supplied environment fact (`python3` 3.9.6) | [Current scope](#current-scope) |

## Current scope

- **Python 3.9 floor.** Scripts and tests must run on Python 3.9, because the developer's `python3` is 3.9.6; no file declares this floor. Trigger: the developer adopts a newer minimum `python3`, at which point the floor is declared where the toolchain is declared.
