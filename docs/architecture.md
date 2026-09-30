---
state: draft
revision: arch-r1
---

# System architecture: Project Playbook

## Status

This is the Playbook's first architecture document. It records the technical foundations the repository already follows and proposes the ones it lacks. It is governed by the [product vision](product-vision.md); proposals and open decisions below await the developer.

## Imposed constraints

The vision's [constraints every feature must preserve](product-vision.md#constraints-every-feature-must-preserve) bind every technical choice here; the rules below give harness neutrality, checks over trust, and the developer's safety their technical form without restating them. The Playbook ships no runtime for consuming projects and runs only on the developer's machine, inside an agent harness or a shell.

## System boundary

- **Agent harness (currently OMP).** The harness owns discovery of agent and skill capability directories, extension loading, the extension API and schema library that tools are declared with, agent dispatch and models, and interactive questions. The Playbook integrates as an extension package declared in `package.json` [EXISTS]; harness runtime facts live in `integrations/omp.md` [EXISTS].
- **`python3` on `PATH`.** Owns execution of every checker, renderer, and the build; the Playbook reaches it only as a child process.
- **Git.** Owns history, revisions, branches, and worktrees; checkers read it only through the `git` command, and consumers receive the Playbook as a clone of `git@github.com:aintnorest/project-playbook.git` [EXISTS] (`.git/config`).
- **Consuming project repositories.** Each owns its own documents, commands, toolchain, and exceptions; the Playbook reads them only through agents and checker arguments.

## Technology decisions

- All deterministic logic — checkers, the developer-request renderer, and the skill build — is Python 3 using only the standard library, run as command-line programs with no install step.
- A harness adapter is TypeScript loaded directly by the harness, importing only Node built-ins and the harness's own API, with no package dependencies and no build step.
- Human-authored content — guides, skill sources, agents, templates, and documents — is Markdown; machine-readable contracts are JSON, and JSON Schema where a shape is validated.

## Decomposition and repository structure

The repository separates authored rules, authored task procedures, generated per-task artifacts, deterministic programs, and harness adapters, so each rule and each check has exactly one home. Top-level layout (every `[EXISTS]` path in this document was verified by listing the repository root and the named directories):

- `guides/` [EXISTS] — shared rules, each stated once, plus machine-readable contracts such as `guides/developer-request.schema.json` [EXISTS] and `guides/findings-schemas.json` [EXISTS].
- `skill-sources/` [EXISTS] — one authored task procedure per skill, selecting guide sections by link.
- `skills/` [EXISTS] — generated per-task skills (`SKILL.md` plus `references/`); committed so consumers never build.
- `agents/` [EXISTS] — one harness agent per skill, plus `agents/routing-cases.json` [EXISTS] and build-check exceptions in `agents/checks.json` [EXISTS].
- `scripts/` [EXISTS] — the build and the checker command-line programs.
- `tests/` [EXISTS] — executable proof for `scripts/` and the harness adapter.
- `templates/` [EXISTS] — starting files consumers copy by hand into their own projects.
- `integrations/` [EXISTS] — one note per harness: installation, runtime facts, and harness-specific procedure.
- `research/` [EXISTS] — evidence notes that inform guidance and never govern it.
- `docs/` [EXISTS] — the Playbook's own product documents.
- `.beads/` [EXISTS] — the maintainer's issue-tracker state; never loaded by consumers.
- Root files: `omp-extension.ts` [EXISTS] (OMP adapter), `package.json` [EXISTS] (extension manifest), `VERSION` [EXISTS], `lefthook.yml` [EXISTS], `README.md` [EXISTS].

## Boundaries and dependency rules

- **Source and generated output.** Only `scripts/build-skills.py` [EXISTS] writes `skills/` and the `output:` line of review agents; authors edit `guides/`, `skill-sources/`, and the rest of `agents/`. The build refuses to overwrite a file without its generated marker, and its check fails on stale output.
- **One home per rule.** A rule lives in one guide section; skill sources link to that section, and the build inlines guidance every run needs and ships conditional guidance as references ([skill construction](../guides/skill-design.md#scope-and-disclosure)). No skill source, agent, or integration note restates a guide rule.
- **Harness boundary.** `guides/`, `skill-sources/`, `scripts/`, and `templates/` are harness-neutral and may reach a harness only through a conditional link to its integration note; harness adapters, harness-format output, and harness facts depend on the neutral layer, never the reverse. This keeps a second harness an addition rather than a rewrite.
- **Logic and adapter.** Every validation, parse, and rendering lives in a `scripts/` program; a tool adapter only maps arguments to that program's mode flags, runs it as a bounded child process, and translates its exit status and output. Any caller without the tool gets identical enforcement from the same program.
- **Trust boundary.** At runtime nothing writes to the Playbook checkout or the consuming project: tools and checkers only read files and Git state named by their arguments, never use the network, and never contact the developer. Scripts resolve their own files relative to their location, never the caller's workspace.

## Build, tooling, and test execution

- `scripts/build-skills.py` is the only build; its check mode gates generated-output freshness, the agent contract, and routing cases ([build check](../guides/agents.md#build-check)).
- The `lefthook.yml` pre-commit hook regenerates, stages, and checks generated output, so no commit carries a stale skill.
- Checker tests are black-box command-line contract tests under `unittest` that run each program as a subprocess against temporary files and temporary Git repositories. Adapter tests run under Bun's test runner against a stub harness API and the real programs. The README owns the commands.
- Test automation beyond the pre-commit hook, and formatting and linting: see [Proposed foundations](#proposed-foundations).
- Every generated skill stays within the size limit that `scripts/build-skills.py` enforces; the build owns the numbers.

## Cross-cutting concepts

- **No persistence or service.** The Playbook keeps no state of its own; every durable fact is a file under Git, in this repository or the consuming project.
- **Program output contract.** A checker is deterministic for the same files and revisions. It reports diagnostics on standard error with a nonzero exit, and writes standard output only in its machine-readable modes; adapters treat any other output as a failure.
- **Tool arguments.** An optional tool argument that is null or empty means absent, and a mode rejects any non-empty argument that belongs to another mode.
- **Distribution.** Consumers enable a clone of this repository as a harness extension, optionally pinned to a release tag ([install](../integrations/omp.md#install)); because of the trust boundary, a pinned checkout may be read-only.

## Conventions

- Agent frontmatter, body, description, and routing cases: [agents and skills](../guides/agents.md), checked by the build.
- Skill sources and generated skills: [skill construction](../guides/skill-design.md) and [prompt design](../guides/prompt-design.md).
- Prose: [technical-writing standards](../guides/technical-writing-standards.md).
- Document frontmatter for `docs/` and status-bearing guides: [document state and revision](../guides/product-documentation-process.md#document-state-and-revision), checked by `scripts/check-doc-status.py` [EXISTS].
- Developer requests: `guides/developer-request.schema.json`, validated by `scripts/request-developer.py` [EXISTS].
- Illustrative features use the guides' `EXPORT` example ([routing cases](../guides/agents.md#routing-cases)).

## Proposed foundations

- **Pre-push test hook.** Add a pre-push command to `lefthook.yml` [PROPOSED] that runs the Python and Bun test suites. We choose a local hook over hosted continuous integration because it reuses the existing hook tool and needs no hosted service, at the accepted cost that a clone without hooks installed, or a skipped hook, can push failing code.
- **No formatter or linter.** The build check and the test suites remain the only gates. We choose no style tooling over adding one because it keeps `python3`, Bun, and lefthook the only development tools, at the accepted cost that style drift is caught only in review.
- **Release identity.** `VERSION` owns the release number and each release is the Git tag `v` plus that number; the `package.json` version is not a release identifier. We choose `VERSION` over `package.json` because it is harness-neutral and already matches the existing tag, at the accepted cost that `package.json` carries a version nobody reads.

## Technology index

| Choice | Status | Authority | Rule |
| --- | --- | --- | --- |
| Python standard-library programs | Decided | Developer, repository at `96ae784` | [Technology decisions](#technology-decisions) |
| Dependency-free TypeScript adapter | Decided | Developer, repository at `96ae784` | [Technology decisions](#technology-decisions) |
| Markdown and JSON formats | Decided | Developer, repository at `96ae784` | [Technology decisions](#technology-decisions) |
| Repository layout | Decided | Developer, repository at `96ae784` | [Decomposition and repository structure](#decomposition-and-repository-structure) |
| Generated skills | Decided | Developer, commit `f10819d` | [Boundaries and dependency rules](#boundaries-and-dependency-rules) |
| One home per rule | Decided | Developer, repository at `96ae784` | [Boundaries and dependency rules](#boundaries-and-dependency-rules) |
| Harness boundary | Decided | Developer, repository at `96ae784` | [Boundaries and dependency rules](#boundaries-and-dependency-rules) |
| Logic in programs, thin adapters | Decided | Developer, repository at `96ae784` | [Boundaries and dependency rules](#boundaries-and-dependency-rules) |
| Read-only runtime | Decided | Developer, repository at `96ae784` | [Boundaries and dependency rules](#boundaries-and-dependency-rules) |
| Build and pre-commit hook | Decided | Developer, repository at `96ae784` | [Build, tooling, and test execution](#build-tooling-and-test-execution) |
| Contract test strategy | Decided | Developer, repository at `96ae784` | [Build, tooling, and test execution](#build-tooling-and-test-execution) |
| Skill size limit | Decided | Developer, repository at `96ae784` | [Build, tooling, and test execution](#build-tooling-and-test-execution) |
| No persistence or service | Decided | Developer, repository at `96ae784` | [Cross-cutting concepts](#cross-cutting-concepts) |
| Program output contract | Decided | Developer, repository at `96ae784` | [Cross-cutting concepts](#cross-cutting-concepts) |
| Null or empty means absent | Decided | Developer, commit `d73aeb7` | [Cross-cutting concepts](#cross-cutting-concepts) |
| Extension distribution | Decided | Developer, repository at `96ae784` | [Cross-cutting concepts](#cross-cutting-concepts) |
| Pre-push test hook | Proposed | — | [Proposed foundations](#proposed-foundations) |
| No formatter or linter | Proposed | — | [Proposed foundations](#proposed-foundations) |
| Release identity | Proposed | — | [Proposed foundations](#proposed-foundations) |
| Python 3.9 floor | Current scope | Supplied environment fact (`python3` 3.9.6) | [Current scope](#current-scope) |
| OMP as the only harness | Current scope | Developer, repository at `96ae784` | [Current scope](#current-scope) |
| Harness output format | [NEEDS YOUR CALL] | — | [Open decisions](#open-decisions) |
| Compatibility for pinned consumers | [NEEDS YOUR CALL] | — | [Open decisions](#open-decisions) |

## Current scope

- **Python 3.9 floor.** Scripts and tests must run on Python 3.9, because the developer's `python3` is 3.9.6; no file declares this floor. Trigger: the developer adopts a newer minimum `python3`, at which point the floor is declared where the toolchain is declared.
- **OMP is the only harness.** `agents/`, `skills/`, `omp-extension.ts`, and the `omp` key in `package.json` are in OMP's format, and `integrations/omp.md` is the only integration note. Trigger: a second harness integration begins, which forces the open decision on harness output format.

## Open decisions

- **[NEEDS YOUR CALL] Harness output format.** The build describes its output as OMP skills, and several neutral guides (`guides/skill-design.md`, `guides/prompt-design.md`, `guides/document-review.md`) and `guides/findings-schemas.json` carry OMP facts about that output. The choice is whether a second harness gets its own generated output from the same sources, or whether the build emits one portable skill format with harness facts moved to integration notes. It depends on the vision's open decision on [what "works under any harness" must guarantee](product-vision.md#open-decisions) and on the second harness's actual skill and agent formats.
- **[NEEDS YOUR CALL] Compatibility for pinned consumers.** Which changes — to document frontmatter, plan grammar, checker modes, or request schema — count as breaking for a consumer pinned to a tag, and whether a breaking change requires a migration. It depends on the vision's open decision on what the Playbook promises existing documents, and determines how releases are numbered once release identity is approved.
