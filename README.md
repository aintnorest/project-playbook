# Project Playbook

A versioned source of truth for reusable project workflows, documentation guidance, and prompts.

The playbook is Markdown with no runtime or model-service dependency for consumers. An optional Python standard-library publishing utility assembles committed chat-ready prompts; it needs no third-party packages.

## Contents

- `guides/` contains authoritative shared standards and workflows.
- `prompts/` contains task sources, the action-oriented catalog, and generated chat-ready delivery copies.
- `decisions/` preserves the reasoning behind important playbook choices.
- `integrations/` explains how other repositories consume the playbook.
- `scripts/` contains the optional prompt publisher, not a workflow runtime.
- `tests/` protects the publisher's inclusion, freshness, and overwrite-safety contracts.

The initial material comes from workflows already used in production projects. Project-specific rules stay in each project rather than being copied back into this repository.

## Start here

1. Use the [product documentation process](guides/product-documentation-process.md) to choose the smallest applicable workflow and find each document's purpose, contents, and location.
2. Apply the [communication policy](guides/communication-policy.md) to reader-facing output and the [technical-writing standards](guides/technical-writing-standards.md) to system and technical designs.
3. Choose an action in the [prompt library](prompts/README.md). It covers document creation and convergence, targeted TypeScript/Rust/Tauri code reviews, handoff, and implementation-plan execution through isolated subagents; each task has an agent source and a chat-ready version.
4. Follow the [mise integration and adoption instructions](integrations/mise.md) to install a selected release and make the guidance discoverable in another repository.

The [document convergence workflow](guides/document-convergence.md) explains how these tasks fit your repeated review and revision loop. Start from an idea, upstream documents, or a current draft; your explicit approval, not a model's issue count, ends the document's cycle.

The [guidance authority decision](decisions/0001-guidance-authority.md) records why standards and tasks have separate responsibilities. The [prompt-library decision](decisions/0002-document-convergence-prompts.md) records the two delivery surfaces, research inputs, and application boundary.

## Distribution

Edit shared guidance here and tag stable releases. Each consuming repository owns the automation that fetches its selected release.

[The mise integration](integrations/mise.md) shows how a consuming repository can expose `mise run playbook:update`. Mise belongs in the repositories that already use it for toolchains and tasks; this documentation repository does not need a `mise.toml`.

## Source-of-truth rules

1. Edit shared guidance here, not in generated project copies.
2. Give each fact one authoritative document and link to it elsewhere.
3. Put project-specific commands, architecture, and exceptions in the consuming project.
4. Pin released versions for automation; do not execute unpinned remote tasks.
5. Record consumer exceptions using the [product documentation process's scope and exception rules](guides/product-documentation-process.md). Project-specific facts supplement shared guidance; undocumented differences do not silently override it.

## Maintaining the playbook

### Change the owning guidance

When a workflow changes, update its authoritative document in the same change rather than saving the documentation for later. Check affected prompts, examples, links, and integration instructions; describe whether consumers need to change their documents or setup.

After editing a task or its included guidance, run `python3 scripts/build-prompts.py` and commit the changed sources and generated files together. The [prompt catalog](prompts/README.md#maintain-sources-not-chat-copies) defines the inclusion format; do not maintain a second editable policy in a chat copy.

Try uncertain practices in a consuming project first and mark them as local experiments, not active shared requirements. Promote a practice into an active guide when you decide it should be the default for other repositories, with its scope and exceptions stated.

Record a decision in `decisions/` only when its reasoning, accepted cost, or rejected alternative will help a future change. Use the next numbered filename; link to the current rule instead of copying it into the decision, and mark a decision superseded when a later decision replaces it.

### Review before release

Check that each rule has one authoritative home, all local links resolve, examples are self-contained, and installation paths include the required guidance. Run `python3 scripts/build-prompts.py --check` to detect stale chat copies, then exercise changed executable examples and affected prompt behaviors; do not claim cross-model performance from a successful build or a single-model smoke run.

When changing the publisher, run `python3 -m unittest discover -s tests -v`. These regression tests protect delivery mechanics; prompt behavior still needs representative document runs and developer judgment.

Include a short consumer-impact note in the change description. For changed paths or obligations, name the migration rather than treating the change as wording-only.

### Publish a version

`VERSION` names the release version without a `v` prefix; its matching Git tag is `v<VERSION>`. Unreleased edits remain on the working branch until a release is deliberately prepared.

1. Choose the next version and update `VERSION` in the release commit, then rebuild chat prompts so their version metadata matches. During `0.x`, increment the minor version for new obligations, incompatible guidance, or moved/removed consumer paths; use a patch for clarifications and corrections that do not change those contracts.
2. Include release notes in the release description covering changed guidance, compatibility, and required consumer actions.
3. After review, tag that commit with the matching version and publish the commit and tag. Never move or reuse a published release tag; publish a new version for corrections.
4. Upgrade each consumer explicitly using the integration's update procedure. Publishing a release does not itself update consuming repositories.

After `1.0.0`, use major versions for incompatible contracts, minor versions for compatible additions, and patch versions for compatible corrections. Git does not enforce tag immutability; preserving published tags is a release obligation.

## Unreleased consumer changes

These changes are not a published release; `VERSION` remains `0.1.0`. At release preparation, include these migration notes in the release description:

- Replace entry points to `prompts/communication-rules.md` with `guides/communication-policy.md`, and `prompts/sdd-tdd-communication-rules.md` with `guides/technical-writing-standards.md`. Under an installed playbook, prefix these paths with `.project-playbook/`.
- Replace `prompts/sdd-review.md` with `prompts/review-document.md`. Use `prompts/README.md` to find all authoring and lifecycle tasks, or paste the matching file from `prompts/chat/` without collecting separate guides.
- Use the product documentation process's lightweight path for qualifying minor changes. Full-feature designs retain Gherkin as the default, with justified alternatives. Implementation plans define a DAG through task prerequisite IDs; diagrams and parallel-wave tables are optional derived views.
- Use `prompts/orchestrate-implementation-plan.md` to execute an approved plan through isolated subagents. It requires a repository-capable harness with worker stop controls and orchestrator-owned worktree integration; its generated chat copy does not enable execution in a chat-only interface.
- Use the separate `review-typescript.md`, `review-rust.md`, and `review-tauri.md` prompts under `prompts/` for read-only correctness and maintainability reviews. They share the catalog's code review contract, preserve polyglot scope boundaries, and have generated chat-ready copies; existing document review prompts are unchanged.
- `playbook:check` retains its reference-only behavior; its documentation now states that it does not verify installed content.
- Consumer installations include the convergence workflow, catalog, and generated chat prompts, plus the README, decisions, and integration notes needed for local links. Consumers need no Python; maintainers use the publisher and freshness check when changing prompt sources.

Remove this pending section once its notes have been published with the release.
