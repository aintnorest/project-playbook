---
state: draft
revision: arch-r7
---

# System architecture: Project Playbook

## Status

This document records how the Playbook is built to deliver its guidance: the rules anyone adding a guide, skill, agent, checker, or tool must follow. The guidance itself, including the documents-first process, lives in `guides/`; product direction lives in the [product vision](product-vision.md).

## Imposed constraints

The vision's [product-wide boundaries](product-vision.md#product-wide-boundaries-and-non-goals) and [constraints every feature must preserve](product-vision.md#constraints-every-feature-must-preserve) bind every choice here; this document gives versioned contracts and the developer's safety their technical form without restating them. The Playbook ships no runtime for consuming projects and runs only on the developer's machine, inside OMP or a shell.

## System boundary

- **OMP.** Owns discovery of agent and skill capability directories, extension loading, the extension API and the schema builder that tools are declared with, agent dispatch and models, sessions and provider calls, and interactive questions. The Playbook integrates as an extension package declared in `package.json` [EXISTS]; installation, update, and OMP runtime facts live in `integrations/omp.md` [EXISTS].
- **`python3` on `PATH`.** Owns execution of every checker, renderer, gate runner, and the build; the Playbook reaches it only as a child process.
- **Git.** Owns history, revisions, branches, worktrees, and release tags; checkers read it only through the `git` command. How a consumer obtains and pins a checkout is owned by [install](../integrations/omp.md#install).
- **Consuming project repositories.** Each owns its own documents, commands, toolchain, and exceptions; the Playbook reads them only through agents and checker arguments.

## Technology decisions

- OMP is the only harness the Playbook targets. Guides, skill sources, scripts, and generated output may state OMP facts directly; no layer is kept harness-neutral for portability.
- All deterministic logic — checkers, the developer-request renderer, the gate runner, and the skill build — is Python 3 using only the standard library, run as command-line programs with no install step. The gate runner requires Bash on `PATH` for pipeline failure propagation.
- Extension code is TypeScript that OMP loads directly, with no build step. At runtime it uses only Node built-ins and what OMP's extension API supplies; tool schemas use the API's `pi.zod`, a Zod-compatible subset that lacks some Zod methods (`README.md` [EXISTS] records the known gaps). The only package dependency is the development dependency `@oh-my-pi/omptype`, declared in `package.json` and locked in `bun.lock` [EXISTS], which the tests use to exercise OMP's real schema builder at the verified OMP release.
- Human-authored content — guides, skill sources, agents, templates, and documents — is Markdown; machine-readable contracts are JSON, and JSON Schema where a shape is validated.

## Parts and repository structure

The repository separates authored rules, authored task procedures, generated per-task artifacts, deterministic programs, and extension code, so each rule and each check has exactly one home. Top-level layout (every `[EXISTS]` path in this document was verified by listing the repository root and the named directories):

- `guides/` [EXISTS] — shared rules, each stated once, plus machine-readable contracts such as `guides/developer-request.schema.json` [EXISTS].
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
- Root files: `omp-extension.ts` [EXISTS] (contract tools), `package.json` [EXISTS] and `bun.lock` [EXISTS] (extension manifest and locked development dependency), `VERSION` [EXISTS], `lefthook.yml` [EXISTS] (Git hooks), `mise.toml` [EXISTS] and `mise.lock` [EXISTS] (maintainer tool pins and tasks), `.rumdl.toml` [EXISTS] (Markdown check configuration), `README.md` [EXISTS].

## Content flow

- **One home per rule.** A rule lives in one guide section. A skill source links to the sections its task needs, and `scripts/build-skills.py` [EXISTS] inlines guidance every run needs into `SKILL.md` and ships conditional guidance as references ([skill construction](../guides/skill-design.md#scope-and-disclosure)). No skill source, agent, or integration note restates a guide rule.
- **Generated output.** Only the build writes `skills/`; authors edit `guides/`, `skill-sources/`, and `agents/`. The build refuses to overwrite a file without its generated marker, and its check fails on stale output.
- **Loading.** OMP loads everything through the extension package: it discovers `agents/` and `skills/` as capability directories, each agent autoloads its generated skill, and the extension modules named in `package.json` register tools ([integrations/omp.md](../integrations/omp.md)). Templates are the only content a consumer copies.

## Boundaries and dependency rules

- **Contract tools.** A tool that enforces or renders a Playbook contract is registered in `omp-extension.ts`. Domain validation and rendering live in a `scripts/` program; the tool owns only transport: declaring its arguments, rejecting argument combinations a mode does not accept, running the program as a bounded child process, and checking the result envelope — exit status, unexpected output, and JSON shape — before returning it. The program's command-line mode is the fallback when the tool is not loaded, not a portability promise.
- **Way-of-working extensions.** An OMP extension that supports the way of working without enforcing a Playbook contract — for example, a prompt-cache keep-alive, should one ever be built — is its own module under `extensions/`, declared in the extension list in `package.json`, and acts only through OMP's extension API. Contract tools never depend on such a module, so each one can be removed alone.
- **Trust boundary.** Contract tools and checkers only read files and Git state named by their arguments, never use the network, and never contact the developer. The explicit exception is `run_check`: it executes the project's own command in the given directory; any writes by that command belong to the project. The Playbook itself writes only the runner's full-output log outside the repo. The agent-run collector's sessions default, OMP's `~/.omp/agent/sessions`, is read-only. Scripts resolve their own files relative to their location, never the caller's workspace, so the Playbook works as a read-only copy pinned to a release tag.
- **No persistence or service.** Except for gate-runner evidence logs in the system temp directory, the Playbook keeps no state of its own; every durable governing fact is a file under Git, in this repository or the consuming project.

## Consumer contracts and versioning

A consumer contract is any format, grammar, mode, output, or schema that consuming projects' documents, agents, or callers depend on. Each has one owner; change it there:

- Document formats and frontmatter: [document contracts](../guides/product-documentation-process.md#document-contracts), checked by `scripts/check-doc-status.py` [EXISTS].
- Implementation-plan grammar: [implementation plan](../guides/product-documentation-process.md#implementation-plan), checked by `scripts/check-implementation-plans.py` [EXISTS].
- Checker command-line modes and JSON output: each program in `scripts/`, described in the guide section it checks.
- Tool arguments: the tool declarations in `omp-extension.ts`.
- Developer requests: `guides/developer-request.schema.json`, rendered by `scripts/request-developer.py` [EXISTS].
- Task verification: `scripts/run-check.py` owns execution, Bash pipefail, timeouts, external logs, and passed/failed/timed-out/unavailable results; `run_check` declares arguments. Missing commands (exit 127) are unavailable, not verified and not a task-code failure.
- Markdown review reports: the [document](../guides/document-review.md#report), [code](../guides/code-review.md#report), [prompt](../guides/prompt-design.md#report-without-editing), and [friction](../guides/friction.md#report) report contracts, delivered as [review report delivery](../guides/agents.md#review-report-delivery) specifies.

Rules shared by every contract:

- **Program output.** A checker is deterministic for the same files and revisions. It reports diagnostics on standard error with a nonzero exit, and writes standard output only in its machine-readable modes; tools treat any other output as a failure.
- **Optional arguments.** A null or empty optional tool argument means absent, except where a mode requires a supplied argument to be non-empty; each such exception is declared with the tool in `omp-extension.ts`.
- **Releases.** `VERSION` owns the release number, and each release is the Git tag `v<version>`; the `package.json` version is not a release identifier. Numbers follow [Semantic Versioning](https://semver.org/): a change that makes a previously valid document, plan, tool call, or report consumer invalid, or changes the meaning of existing output, bumps the major number; an additive contract change bumps the minor number; a release with no contract change bumps the patch number.
- **Migrations.** Each release that changes a contract ships its guided migration as `guides/migrations/<from>-to-<to>.md` [PROPOSED], named by the two release numbers; releases with no contract change have none.

## Build, checks, and gates

- `scripts/build-skills.py` is the only build; its check mode gates generated-output freshness, the agent contract, and routing cases ([build check](../guides/agents.md#build-check)), and holds every generated skill within the size limit it owns.
- Checker tests are black-box command-line contract tests under `unittest` that run each program as a subprocess against temporary files and temporary Git repositories. Extension tests run under Bun's test runner against OMP's real schema builder and the real programs. The README owns the commands.
- Maintained Markdown passes rumdl, pinned in `mise.toml` and `mise.lock`, configured by `.rumdl.toml`, and run by the `lint-markdown` task in `mise.toml`, which owns the checked paths; generated skills are excluded.
- `lefthook.yml` defines local hooks: pre-commit regenerates, stages, and checks generated output; pre-push runs the Python tests, Bun tests, real installed-OMP sandbox load check with no model turn, and Markdown check. They run only in a clone where installed ([changing the playbook](../README.md#changing-the-playbook)) and can be skipped, so they are not a guaranteed gate. There is no hosted continuous integration.

## Conventions

- Agent frontmatter, body, description, and routing cases: [agents and skills](../guides/agents.md), checked by the build.
- Skill sources and generated skills: [skill construction](../guides/skill-design.md) and [prompt design](../guides/prompt-design.md).
- Prose: [technical-writing standards](../guides/technical-writing-standards.md).

## Technology index

| Choice | Status | Authority | Rule |
| --- | --- | --- | --- |
| OMP as the only harness | Decided | Developer, 2026-09-29 | [Technology decisions](#technology-decisions) |
| Python standard-library programs | Decided | Developer, repository at `96ae784` | [Technology decisions](#technology-decisions) |
| Extension runtime uses only OMP's API | Decided | Developer, 2026-09-30 | [Technology decisions](#technology-decisions) |
| Markdown and JSON formats | Decided | Developer, repository at `96ae784` | [Technology decisions](#technology-decisions) |
| Repository layout | Decided | Developer, repository at `96ae784` | [Parts and repository structure](#parts-and-repository-structure) |
| One home per rule | Decided | Developer, repository at `96ae784` | [Content flow](#content-flow) |
| Generated skills | Decided | Developer, commit `f10819d` | [Content flow](#content-flow) |
| Extension loading | Decided | Developer, repository at `96ae784` | [Content flow](#content-flow) |
| Contract tools wrap programs | Decided | Developer, 2026-09-30 | [Boundaries and dependency rules](#boundaries-and-dependency-rules) |
| Way-of-working extensions | Decided | Developer, 2026-09-29 | [Boundaries and dependency rules](#boundaries-and-dependency-rules) |
| Read-only runtime and pinned copy | Decided | Developer, repository at `96ae784` | [Boundaries and dependency rules](#boundaries-and-dependency-rules) |
| Project-command gate runner and external log exception | Decided | Developer, 2026-09-30 | [Boundaries and dependency rules](#boundaries-and-dependency-rules) |
| No persistence or service | Decided | Developer, repository at `96ae784` | [Boundaries and dependency rules](#boundaries-and-dependency-rules) |
| Consumer contract owners | Decided | Developer, 2026-09-30 | [Consumer contracts and versioning](#consumer-contracts-and-versioning) |
| Program output contract | Decided | Developer, repository at `96ae784` | [Consumer contracts and versioning](#consumer-contracts-and-versioning) |
| Optional tool arguments | Decided | Developer, 2026-09-30 | [Consumer contracts and versioning](#consumer-contracts-and-versioning) |
| Release identity and Semantic Versioning | Decided | Developer, 2026-09-29 | [Consumer contracts and versioning](#consumer-contracts-and-versioning) |
| Migration guides | Decided | Developer, 2026-09-29 | [Consumer contracts and versioning](#consumer-contracts-and-versioning) |
| Build check | Decided | Developer, repository at `96ae784` | [Build, checks, and gates](#build-checks-and-gates) |
| Contract test strategy | Decided | Developer, 2026-09-30 | [Build, checks, and gates](#build-checks-and-gates) |
| Markdown check with rumdl | Decided | Developer, 2026-09-29 | [Build, checks, and gates](#build-checks-and-gates) |
| Local hooks, no hosted CI | Decided | Developer, 2026-09-30 | [Build, checks, and gates](#build-checks-and-gates) |
