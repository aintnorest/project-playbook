# Prompt library

Pick the action you want, supply your current material, and run one pass. For documentation, the [document convergence workflow](../guides/document-convergence.md) explains the loop and owns feedback, review, and approval rules; for targeted code reviews, use the [code review contract](#code-review-contract) below.

## Choose a task

Use **Agent source** when the assistant can read repository files. Use **Chat-ready** when you want one prompt with its applicable shared guidance already included; copy the file's raw contents, not just its link.
Review prompt filenames are grouped by target: `review-doc-*` reviews project documents, while `review-code-*` reviews source code and application boundaries.

| What you want to do | Agent source | Chat-ready |
| --- | --- | --- |
| Shape product direction from an idea, notes, or existing vision | [Draft product vision](draft-product-vision.md) | [Copy prompt](chat/draft-product-vision.md) |
| Turn an idea, vision, notes, or draft into feature requirements | [Draft PRD](draft-prd.md) | [Copy prompt](chat/draft-prd.md) |
| Design a feature's shared architecture and slice boundaries | [Draft system design](draft-system-design.md) | [Copy prompt](chat/draft-system-design.md) |
| Design one small feature or one slice concretely | [Draft technical design](draft-technical-design.md) | [Copy prompt](chat/draft-technical-design.md) |
| Turn an approved TDD into a DAG of executable tasks | [Create a DAG task list](draft-implementation-plan.md) | [Copy prompt](chat/draft-implementation-plan.md) |
| Turn a use case into one evidence-grounded prompt | [Draft a prompt](draft-prompt.md) | [Copy prompt](chat/draft-prompt.md) |
| Independently review a prompt and, when possible, exercise its behavior | [Review a prompt](review-prompt.md) | [Copy prompt](chat/review-prompt.md) |
| Execute a plan through isolated subagents and validate the working branch | [Orchestrate implementation](orchestrate-implementation-plan.md) | [Copy prompt](chat/orchestrate-implementation-plan.md) |
| Review a product vision's users, problems, boundaries, and durable success signals | [Review product vision](review-doc-product-vision.md) | [Copy prompt](chat/review-doc-product-vision.md) |
| Review a feature PRD's requirements, acceptance intent, and scope | [Review PRD](review-doc-prd.md) | [Copy prompt](chat/review-doc-prd.md) |
| Review a feature's shared architecture, cross-slice contracts, and durable direction | [Review system design](review-doc-system-design.md) | [Copy prompt](chat/review-doc-system-design.md) |
| Review one slice or small-feature technical design against its contract | [Review technical design](review-doc-technical-design.md) | [Copy prompt](chat/review-doc-technical-design.md) |
| Review an implementation plan's task DAG, coverage, and verifiability | [Review implementation plan](review-doc-implementation-plan.md) | [Copy prompt](chat/review-doc-implementation-plan.md) |
| Find duplicated facts and competing sources of truth across documents | [Review document authority](review-doc-dry.md) | [Copy prompt](chat/review-doc-dry.md) |
| Review TypeScript correctness and maintainable design | [Review TypeScript](review-code-typescript.md) | [Copy prompt](chat/review-code-typescript.md) |
| Review Rust correctness and maintainable design | [Review Rust](review-code-rust.md) | [Copy prompt](chat/review-code-rust.md) |
| Review Tauri host/frontend integration and maintainable boundaries | [Review Tauri](review-code-tauri.md) | [Copy prompt](chat/review-code-tauri.md) |

PRD means Product Requirements Document. Technical Design Document is abbreviated TDD in the process; it does not mean test-driven development here. Use the [document contracts](../guides/product-documentation-process.md#document-contracts) rather than choosing a task based on an ambiguous acronym.

## Use with a repository agent

Point the agent at the task, your target, and relevant context. Its `Required guidance` manifest selects only the shared rules for that operation. Retrieve the target role's contract and upstream evidence only when the requested work needs them, rather than reading every document type or the full review workflow.

Example, after installing the playbook in a consuming repository:

```text
Use .project-playbook/prompts/draft-prd.md.
Start from my idea below and docs/product-vision.md.
Create docs/features/document-export/prd.md; that is the only editing target.
Idea: Let a signed-in user download a copy of a document they can view.
Ask me about consequential product choices rather than inventing them.
```

For the next pass, you can simply say:

```text
Use .project-playbook/prompts/revise-comments.md on
 docs/features/document-export/prd.md, revision export-r2.
The HTML comments I added in this file are my feedback.
Keep the accepted decisions and open questions from our previous pass.
```

Use the real path, revision, and facts for your project; the example is not a requirement to implement document export. Without a consumer installation, point to the corresponding source file in your playbook checkout.

### Draft a prompt

Use the prompt-drafting task to turn a goal, use case, target model set, and execution environment into one reusable prompt. Supply an existing prompt when revising rather than starting over. The task retrieves only relevant prompt-design evidence, may delegate independent read-only research when the harness supports it, and keeps one agent responsible for the final artifact. It checks construction and repository integration only; it does not execute, compare, score, or review the prompt it creates.

```text
Use .project-playbook/prompts/draft-prompt.md.
Goal: Review PostgreSQL schema migrations for deployment and compatibility risks.
Use case: A repository agent runs the prompt before a pull request is merged.
Target models and interface: Claude Sonnet and GPT Codex in our repository harness.
Available tools or subagents: Repository search, Git diff, PostgreSQL documentation,
and read-only research workers.
Required output: Impact-ordered findings grounded in exact migration locations.
Destination: prompts/review-postgres-migrations.md
```

Provide a local knowledge-base path when one is available. Otherwise the task checks readable sibling `knowledge-base` and `knowledge-base-intelligent-systems` checkouts before using the public fallback at `https://github.com/aintnorest/knowledge-base`. It likewise uses the local Project Playbook before `https://github.com/aintnorest/project-playbook`; remote fallbacks never silently override local revisions.

### Review a prompt

Use the prompt-review task as a separate, read-only pass after a prompt has an exact revision or unambiguous body. For a managed prompt, review the generated delivery artifact users actually run and supply its editable task source, guidance manifest, included shared sections, and publisher as provenance. Include known failures, observed strengths, raw responses, test conditions, or earlier comparison results when they should inform regression cases; identify the prompt revision and runtime to which they belong. Add a model runtime, representative cases, answer key, parser, or incumbent only when those checks are in scope; a new prompt does not need a manufactured comparison.

```text
Use .project-playbook/prompts/review-prompt.md.
Prompt source: prompts/review-postgres-migrations.md
Delivery artifact: prompts/chat/review-postgres-migrations.md
Use case: A repository agent reviews PostgreSQL migrations before merge.
Target model and interface: GPT Codex in our repository harness.
Success criteria: Supported findings cite exact migrations; unsupported concerns
remain questions or coverage limits.
Relevant research: /path/to/knowledge-base-intelligent-systems
Prior evidence: On revision 3 with the same model, missing-schema inputs caused
invented migration findings, while exact migration citations remained reliable.
Run three representative migration packets twice each and report behavior variance.
Do not edit the prompt.
```

When a material prompt technique or capability claim needs external evidence, the reviewer retrieves only the relevant local knowledge-base synthesis and supporting dossiers, falling back publicly only when no local copy is available. Research motivates findings or cases within its measured scope; it is not a universal defect checklist and does not replace target-model behavior. Supplied testing history is accepted as evidence of what the developer observed for the identified artifact and runtime, not rerun merely to prove that history, and assessed for applicability to the current target. The reviewer accounts for each material issue and strength and marks its current relationship as current, resolved, regressed, stale, or unverified. When execution is unavailable, the reviewer can still inspect the prompt contract, repository integration, research, and supplied artifacts, but it must label current behavior unverified. Compare an incumbent only when you explicitly request a new comparative review.

The reviewer traces every structural finding in a compiled prompt to its editable task source, shared guide, publisher, model/interface layer, or their interaction. When a shared guide is implicated, the report names its known consumer scope, the behavior the shared rule serves, and the cross-prompt impact review required before changing that source. The reviewer remains read-only and does not assume a global rule should change when a narrow task-specific precedence statement is sufficient.

The DAG task prompt loads only the implementation-plan contract. Supply the TDD and repository context; it follows upstream references as needed rather than importing the review workflow. Each task's prerequisite IDs define the graph; request a Mermaid diagram only when you want that additional view.

The orchestration prompt executes an existing plan rather than drafting one. It requires a repository-capable harness with subagents, Git worktrees, worker stop controls, and orchestrator-controlled integration; the chat-ready copy is self-contained guidance for that harness, not a chat-only execution engine.

Use the same prompt with Fable 5.1 or GPT-6-Astra; tool availability and permissions come from the harness, not the model name. No model-specific reliability claim is implied.

```text
Use .project-playbook/prompts/orchestrate-implementation-plan.md.
Repository: /absolute/path/to/my-project
Plan: docs/features/document-export/implementation-plan.md
The current referenced TDD and system design are approved; execute this plan.
Integration branch: feat/document-export
```

Omit `Integration branch` to create a unique branch from the current committed `HEAD`, or supply a base explicitly for a new branch. Existing local edits are preserved, and significant design changes stop all workers until your decision, updated documentation approval, and explicit resume authorization.

## Use in a chat interface

1. Open the **Chat-ready** file for the action and paste its entire raw contents into the chat. The operation's shared rules are embedded; authoring prompts also embed their own document contract.
2. Attach or paste the current document and only the governing sources needed for the request. Cross-document review, editing, approval, and handoff prompts do not bundle every document role's contract: supply the relevant contract section when that compliance check is in scope and the assistant cannot retrieve it. Missing evidence limits that check, not every supported part of the task. For comment revision, use raw `.md` or plain text so `<!-- comments -->` survive.
3. State the action-specific input in ordinary language: your idea, which comments are yours, the reviews to judge, or the candidate you want to inspect. Include a prior handoff if this chat does not have the relevant history.
4. Save the complete returned document and the decision/open-item context you need for the next pass. A generated prompt includes static instructions, not your project files or previous conversations.

Optional compact input block, useful in a fresh session:

```text
Target: document kind, path or attachment, revision label when available
Task input: idea / designated comments / reviewer reports / approval request
Sources: attached upstream documents and applicable project exceptions
Carryover: accepted decisions, unresolved items, and relevant prior dispositions
Output: authorized file path, or complete Markdown in this chat
```

Omit irrelevant fields and reuse context already present. A saved chat project may hold shared context, but a fresh conversation remains supported; do not assume it retrieved files merely because they were uploaded previously.

## Review code

Choose TypeScript or Rust for that language's code, or Tauri for the application integration boundary, regardless of the frontend language. These are separate read-only reviews, not an orchestration run or automatic repair; use the same prompts with GPT-6-Astra or Fable 5.1 without assuming either model provides particular tools or guarantees.

```text
Use .project-playbook/prompts/review-code-typescript.md.
Repository: /absolute/path/to/my-project
Scope: src/editor and src/shared/document.ts
Review the current working-tree snapshot for correctness and maintainability.
Read other languages only at connections needed to judge this TypeScript.
```

For a change review, supply the actual base and target instead of the snapshot instruction. A chat-ready prompt embeds the review rules but not the code: attach the target, relevant configuration, and any connected contracts it cannot retrieve.

### Code review contract

This contract governs the TypeScript, Rust, and Tauri review prompts. Assess good, maintainable code in its actual context, not idealized architecture or only executable bugs.

#### Scope and evidence

1. Establish the requested technology, paths/component, and candidate identity. An explicit diff/base-target request is a change review: report issues introduced or materially worsened by that change, including affected unchanged callers, not unrelated existing debt; otherwise review the supplied current snapshot without inventing a baseline.
2. If no paths are supplied, map the repository and review its first-party code for the selected technology, excluding unrelated languages, vendored dependencies, and generated output as independent review targets. State the actual files/components and revision or working-tree state covered; do not claim comprehensive coverage of unread code or turn a language review into a repository-wide audit.
3. Read applicable instructions, relevant configuration, enclosing code, direct callers, existing tests, and contracts before judging a candidate issue. Cross into another language only through an actual API, serialization, foreign-function, IPC, lifecycle, or build connection needed to assess the target; stop when that contract is understood, and report a connected mismatch as one boundary finding rather than unrelated findings about foreign internals.
4. Ground version-sensitive claims in the installed toolchain/dependencies and applicable documentation. With missing source or configuration, finish supported checks and name the precise coverage limit or question; absence of supplied evidence is not a defect or proof of safety.

#### Review standard

Prioritize correct behavior, explicit ownership, cohesive responsibilities, understandable control/data flow, stable boundaries, localized changes, and useful failure contracts. Look for duplicated authoritative decisions, leaked implementation details, hidden ordering obligations, misleading contracts/names, and abstractions that add more coupling than they remove; similarity, function length, or a preferred pattern alone is not evidence.

A maintainability finding need not demonstrate a current runtime failure or violate a written rule. Show a concrete present burden in understanding, changing, testing, or owning the inspected code—such as one policy requiring synchronized edits—and explain why the proposed correction improves it at an acceptable cost.

Check existing guarantees and accepted tradeoffs before alleging missing validation, error handling, cleanup, or tests. Prefer the smallest useful correction; do not demand new frameworks, libraries, schemas, traits, generic layers, retries, immutability, or migrations merely because they are possible, and do not weaken requirements to simplify the code.

**Assess test effectiveness.** Review tests as evidence of observable behavior, failure paths, invariants, and boundaries, not by count or coverage percentage; identify tests that would still pass under a concrete, plausible violation of the behavior they claim to protect. Look for weak or circular assertions, mocks that replace the behavior under review, ineffective asynchronous/error checks, and assertions that pin implementation details without a contractual reason; explain the missed defect or concrete maintenance burden and the smallest useful correction, which may be strengthening, replacing, or removing a test.

A legitimate smoke test need not prove full functionality, and mocks or interaction assertions can protect real contracts; judge the test's intended scope and other coverage before alleging a gap. Ask what plausible regression the test would catch, but do not mutate code, introduce a mutation-testing framework, or execute checks without authorization; distinguish reasoned failure sensitivity from an observed test failure.

**Check for unused and obsolete code.** Look for unused declarations, exports, modules, unreachable branches, and superseded paths within the requested review scope. Establish reachability through supported entry points, consumers, registration, generated code, and configurations before recommending removal; no local references or a tool warning alone is not proof, and uncertain external use is a coverage limit rather than proven dead code.

Performance concerns need an actual unnecessary cost or applicable workload, not hypothetical scale; distinguish correctness defects from contextual design recommendations and leave equally sound alternatives alone.

#### Read-only operation

Do not edit files, apply fixes, generate code, install/update dependencies, mutate Git state, or launch an implementation workflow. Static review is the default; run only requested or already authorized narrow checks after inspecting the commands and their effects, never automatic fix modes or unrelated suites, and distinguish execution evidence from reasoning or proposed verification.

#### Report

Open with the target technology, candidate identity, change/snapshot mode, and supported finding count. Give concise coverage of target code and connected context inspected, then findings in impact order; zero findings is valid and is not certification or approval.

Each finding includes a stable ID such as `R1-F1`, precise path/line or symbol, category (`correctness` or `maintainability`), observed evidence and contract or engineering rationale, concrete consequence, and the smallest corrective direction with any meaningful tradeoff. Do not fabricate line numbers, reproductions, approvals, or commands; retain supplied IDs on follow-up and merge only the same underlying issue and correction.

For code reviews, use `Blocker` for a demonstrated issue preventing safe use or integration, `Major` for a material behavior risk or substantial maintenance burden, and `Minor` for a bounded actionable defect without those consequences. Judge by impact, not confidence, keyword presence, or review category; optional polish and unsupported concerns do not become Minor findings.

Finish with checks actually run or not run and specific questions or coverage limits when needed. No praise padding, scores, issue quotas, exhaustive checklist recitals, speculative rewrites, or claims of whole-application safety; separate uncertainty from supported findings.

## Run a review cycle

After your comment passes, send the same saved revision and governing context to fresh reviewers, choosing another model family when useful. For frozen, persisted, exported, or otherwise costly-to-reverse contracts, do not treat one completion as a complete defect-recall control; use a second independent pass or focused human boundary review. Use the document-role review that matches your target — **Review product vision**, **Review PRD**, **Review system design**, **Review technical design**, or **Review implementation plan** — and **Review document authority** as separate passes; the latter does not replace requirements, correctness, or feasibility review.

Give the author the current draft plus the returned reports using **Integrate feedback**. The report must account for every item and explain skipped portions; retain it so repeated findings and accepted decisions remain recognizable. If a review used an older draft, include that identity rather than relabeling it as current.

Use **Handoff** to prepare either an independent first-review packet without previous verdicts or a continuation packet with outstanding findings and decisions. Use **Prepare approval** after your final reading and comment passes; explicit approval is yours, and starting the next document is a separate request.

## Maintain sources, not chat copies

Files in `chat/` are generated delivery copies. Edit the task source or authoritative guide, then regenerate; never tune a chat copy directly and leave the source unchanged.

From the playbook checkout, using Python 3.9 or newer with no third-party packages:

```sh
python3 scripts/build-prompts.py
python3 scripts/build-prompts.py --check
```

When changing the publisher, also run `python3 -m unittest discover -s tests -v` from the playbook checkout. These tests defend section inclusion, non-writing freshness checks, and preservation of unrecognized files; they do not certify prompt behavior.

No Python, model service, or build step is required to use committed chat-ready files. `--check` verifies that generated copies match their current sources; it does not evaluate model behavior or establish a published release. Bundles omit version/hash metadata and generated HTML anchors. The generated-file marker remains so the publisher can refuse to overwrite or delete unrecognized files.

The publisher reads only the local Markdown links listed under each task's `Required guidance` heading. A fragment selects that heading and its subsections; list every section necessary for the task instead of assuming transitive hyperlinks were read. It embeds the selected guidance and the task, deduplicates overlapping sections, and turns included references into readable section references. References to sources not included remain source citations; external links and fenced examples are preserved.

A new task uses `Role`, `Purpose`, `Required guidance`, `Inputs`, `Instructions`, and `Output` sections. Give the model a concrete responsibility and output boundary. Keep each guidance entry to one local Markdown-link bullet and select the smallest sufficient authoritative section; a parent heading includes all its children. Do not bundle unrelated lifecycle stages, all document-role contracts, or duplicate output reports. Retain substantive task-specific rules rather than optimize for a fixed word count. Other guides and standing policies do not need this task format.

Before publishing, run the freshness check and exercise affected prompts on representative inputs. Compare preserved decisions, supported findings, complete feedback dispositions, and approval behavior—not just formatting or prose polish. Keep model-specific adaptations tied to observed failures and measured examples, not a separate library per provider.
