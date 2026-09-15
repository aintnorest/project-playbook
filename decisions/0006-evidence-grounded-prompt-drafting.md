# Add an evidence-grounded prompt drafting task

## Status

Accepted on 2026-09-14. Superseded in part by [Decision 0007](0007-separate-prompt-construction-and-evaluation.md): prompt drafting no longer owns behavioral execution, candidate comparison, or evaluation.

## Context

The playbook contains reusable prompts but lacked a task for creating a new prompt from a user's goal, use case, execution environment, and possible target models. A generic meta-prompt would be easy to add, but it would reproduce the failure the library already avoids: requirements, shared guidance, model folklore, and delivery instructions would become one large duplicated block with no behavioral selection rule.

The public `knowledge-base` repository contains source-backed synthesis on prompt contingency, model-aware harness design, prompt–model drift, answer engineering, in-context examples, reasoning prompts, evaluation, and automatic prompt optimization. Those findings argue against a universal prompt recipe: prompt effects vary by task, model, interface, examples, output contract, parser, and metric. The same evidence supports selective domain research and model adaptation, but not loading the whole corpus or maintaining complete prompt copies per provider.

Both the playbook and knowledge base may exist as local checkouts for repository agents or only as public GitHub repositories for other users. Local material must remain authoritative when available so a remote default branch does not silently replace local revisions.

## Decision

Add [evidence-grounded prompt design](../guides/prompt-design.md) as the authoritative reusable contract and [Draft an Evidence-Grounded Prompt](../prompts/draft-prompt.md) as the task that applies it. Publish the corresponding generated chat-ready prompt and register both delivery surfaces in the prompt catalog.

The task accepts an ordinary-language brief plus optional use-case, output, model, interface, tool, research, example, evaluation, and destination details. It asks only about consequential missing choices. It produces one model-neutral prompt first, then adds a conditional model or interface adaptation only for an observed failure, current official requirement, or evaluated improvement.

Research follows local-first discovery. Use a supplied or discoverable local Project Playbook and knowledge-base checkout before their public fallbacks. Only when local material is unavailable may the task use `https://github.com/aintnorest/project-playbook` or `https://github.com/aintnorest/knowledge-base`; it records the remote source and observed revision instead of silently mixing it with local state.

When the harness supports independent subagents, the prompt owner may delegate bounded read-only research into knowledge-base evidence, domain evidence, and current model/interface evidence. Workers return sourced evidence packets and never edit the prompt target or create competing final prompts. The main agent retains task interpretation, reconciliation, behavioral evaluation, and sole ownership of the final prompt.

Prompt selection uses a bounded loop: smallest complete baseline, task-aligned development cases, a small hypothesis-driven candidate set, observed comparison, and an untouched final check when feasible. Static walkthroughs are labeled unverified when the target surface cannot run. A generated prompt is not called strongest, optimal, or production-ready without a declared comparison space and supporting behavior.

## Alternatives and costs

Embed the entire knowledge base or a fixed prompt-engineering handbook in the task. Rejected: irrelevant context raises cost, can distract the model, and would make every knowledge-base revision a prompt-library synchronization event. Selective retrieval preserves the knowledge base as the evidence source.

Generate one complete prompt per model family. Rejected: this conflicts with the existing model-neutral source-of-truth decision and multiplies drift. Conditional adaptations preserve one common task contract while making evaluated differences explicit.

Have research workers independently draft prompts and choose the most polished. Rejected: competing drafts confound research with design, create shared-file ownership problems, and encourage prose preference instead of behavioral selection. Research workers answer evidence questions; one owner designs and edits.

Add a runtime prompt optimizer or model-service dependency. Rejected: this repository publishes Markdown workflows. The task can use capabilities exposed by its current harness, but the playbook does not become an execution engine.

The accepted design is more demanding than a one-shot meta-prompt. It requires source retrieval, explicit evaluation cases, and honest unverified labels. That cost is limited to prompts whose use case warrants it and buys traceable design decisions rather than unsupported prompt folklore.

## Consequences

Consumers gain a repository-agent source and a self-contained chat-ready prompt for designing one prompt from a use case. Repository-capable agents can retrieve local research and dispatch read-only research workers; chat-only users receive the same design contract but must attach sources or accept stated coverage limits when retrieval and delegation are unavailable.

The prompt-builder output still requires developer judgment. Its design record and evaluation report explain why a candidate was selected, but they do not create an approval gate, guarantee research completeness, or certify cross-model reliability. Future model-specific guidance belongs as scoped evidence-backed adaptations, not duplicated prompt libraries.