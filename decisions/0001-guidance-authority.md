# Separate shared standards from task prompts

## Status

Accepted on 2026-09-04.

## Context

The playbook exists to keep reusable project rules in one authoritative place. Communication and technical-writing policies were maintained in both the product documentation guide and prompt files, with different wording and requirements; the review prompt also mixed a reusable task with model-specific usage claims.

These files had different responsibilities, so imposing an identical format would not resolve their competing authority. Organizing complete prompt libraries by model would multiply the copies that need to stay synchronized.

## Decision

Keep the existing top-level directories and organize guidance by purpose, not by model:

- `guides/` owns shared standards and workflows. The [product documentation process](../guides/product-documentation-process.md), [communication policy](../guides/communication-policy.md), and [technical-writing standards](../guides/technical-writing-standards.md) each own a distinct contract.
- `prompts/` owns task instructions: purpose, inputs, actions, and expected output. Prompts reference applicable standards instead of redefining them; standing policies need not use the task-prompt format.
- `integrations/` owns how consumers install and load the guidance. The [mise integration](../integrations/mise.md) explains both steps.
- `decisions/` preserves rationale and accepted tradeoffs rather than maintaining another copy of current rules.

Keep task prompts model-neutral by default. Add a model or tool adaptation only for an observed limitation or an evaluated improvement; record the affected task, model/version or tool, relevant settings, example cases, and evidence for the adaptation. An adaptation changes delivery or wording, not the authoritative requirements, and does not require a separate complete prompt library.

When a tool cannot retrieve references, include the authoritative content in its input. Such assembled input is a delivery copy, not a separately editable source; no prompt assembly tooling is introduced by this decision.

## Alternatives and costs

A single rigid format for every file would conceal the difference between a standing policy and a task. Separate full prompt libraries per model would make tuning convenient but recreate the duplication this repository is meant to prevent.

The chosen separation requires readers and tools to load more than one document. Explicit entry points and supplied source content address that cost, while changes to shared rules have one authoritative home.

## Consequences

The former `prompts/communication-rules.md` and `prompts/sdd-tdd-communication-rules.md` were removed in favor of the linked guides; consumers loading those paths must update their entry points. This decision initially retained `prompts/sdd-review.md`; the later [convergence-library decision](0002-document-convergence-prompts.md) replaces it with the shared document-review task and adds generated delivery copies.

This decision records organization and authority, not a claim that the prompt performs equally across models. No cross-model evaluation accompanies this change.
