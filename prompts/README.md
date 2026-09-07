# Prompt library

Pick the action you want, supply your current material, and run one pass. The [document convergence workflow](../guides/document-convergence.md) explains the loop and owns feedback, review, and approval rules; you do not need to reconstruct those instructions each time.

## Choose a task

Use **Agent source** when the assistant can read repository files. Use **Chat-ready** when you want one prompt with its applicable shared guidance already included; copy the file's raw contents, not just its link.

| What you want to do | Agent source | Chat-ready |
| --- | --- | --- |
| Shape product direction from an idea, notes, or existing vision | [Draft product vision](draft-product-vision.md) | [Copy prompt](chat/draft-product-vision.md) |
| Turn an idea, vision, notes, or draft into feature requirements | [Draft PRD](draft-prd.md) | [Copy prompt](chat/draft-prd.md) |
| Design a feature's shared architecture and slice boundaries | [Draft system design](draft-system-design.md) | [Copy prompt](chat/draft-system-design.md) |
| Design one small feature or one slice concretely | [Draft technical design](draft-technical-design.md) | [Copy prompt](chat/draft-technical-design.md) |
| Turn an approved TDD into a DAG of executable tasks | [Create a DAG task list](draft-implementation-plan.md) | [Copy prompt](chat/draft-implementation-plan.md) |
| Execute a plan through isolated subagents and validate the working branch | [Orchestrate implementation](orchestrate-implementation-plan.md) | [Copy prompt](chat/orchestrate-implementation-plan.md) |
| Record a meaningful choice and its tradeoffs | [Record decision](record-decision.md) | [Copy prompt](chat/record-decision.md) |
| Capture an observed, reusable lesson | [Update learning log](update-learning-log.md) | [Copy prompt](chat/update-learning-log.md) |
| Revise a draft using your inline HTML comments | [Revise comments](revise-comments.md) | [Copy prompt](chat/revise-comments.md) |
| Get an independent, actionable review against the document contract | [Review document](review-document.md) | [Copy prompt](chat/review-document.md) |
| Find duplicated facts and competing sources of truth | [Review DRY](review-dry.md) | [Copy prompt](chat/review-dry.md) |
| Have the author judge reviews and apply only justified changes | [Integrate feedback](integrate-feedback.md) | [Copy prompt](chat/integrate-feedback.md) |
| Inspect remaining issues and prepare your final approval | [Prepare approval](prepare-approval.md) | [Copy prompt](chat/prepare-approval.md) |
| Change sessions/models, prepare independent review, or hand off approved upstream work | [Handoff](handoff.md) | [Copy prompt](chat/handoff.md) |

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

## Run a review cycle

After your comment passes, send the same saved revision and governing context to fresh reviewers, choosing another model family when useful. Use **Review document** and **Review DRY** as separate passes; the latter does not replace requirements, correctness, or feasibility review.

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
