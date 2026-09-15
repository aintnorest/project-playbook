# Separate prompt construction from prompt evaluation

## Status

Accepted on 2026-09-14.

## Context

Decision 0006 introduced evidence-grounded prompt drafting and coupled it to candidate generation, behavioral execution, comparison, and selection. Comparative trials exposed the architectural cost of that coupling. Prompt construction and prompt evaluation need different inputs, permissions, stopping conditions, and outputs: construction researches a task and writes one coherent prompt, while evaluation freezes an exact artifact, exercises behavior, preserves raw results, and reports defects without editing.

The trials also showed that comparison is not the normal prompt-creation path. A new prompt often has no incumbent. Requiring a tournament would add work unrelated to construction and pressure the task to invent candidates or force a winner. When comparison is explicitly requested, it needs controlled delivery artifacts, common evidence and settings, repeated samples for stochastic work, and an independent rubric; those concerns do not belong in every prompt-writing request.

Repository-native prompts add another boundary. Their editable source selects shared policy through `Required guidance`, while consumers run a publisher-generated delivery artifact. Construction must preserve that source-of-truth design, but behavioral evaluation must inspect the artifact actually executed. A successful source write or publisher run is structural evidence, not prompt-performance evidence.

## Decision

Split [evidence-grounded prompt design](../guides/prompt-design.md) into two authoritative contracts:

- The prompt construction contract governs `draft-prompt.md`. It may research domain, project, and model-interface facts; delegate bounded read-only research; design one model-neutral task with supported adaptations; and verify only the artifact it creates, such as required sections, local links, schema syntax, source/delivery boundaries, and publisher freshness. It does not execute the generated prompt, create behavioral candidates, compare an incumbent, score outputs, or review its own work.
- The prompt evaluation contract governs a separate `review-prompt.md` task. That task is read-only. It reviews one exact prompt and may exercise its behavior when the target runtime is available. It reports structural defects, observed failures, repeated-run variance, comparison results when explicitly requested, and precise coverage limits without rewriting the prompt.

Comparison is optional and evaluation-only. A comparative review holds the delivery artifact, evidence packet, model/interface settings, parser, and rubric constant; uses neutral labels and order reversal where model judging is useful; preserves disagreements and item-level regressions; and allows `candidate selected`, `incumbent retained`, `no dominance`, or `inconclusive`. It never requires an incumbent for a new prompt or rewards issue count, verbosity, confidence, or similarity to a reference.

Evaluation records distinguish source checking, guidance resolution, delivery publication, prompt execution, output adjudication, and cross-model coverage. Repeated executions are expected for open-ended or stochastic tasks when the evaluation budget permits; one output is not prompt reliability.

This decision supersedes the parts of Decision 0006 that assign behavioral evaluation, candidate selection, and convergence to the prompt-drafting task. Decision 0006 remains authoritative for local-first evidence retrieval, bounded research delegation, one final prompt owner, the model-neutral core, and evidence-backed adaptations.

## Alternatives and costs

Keep evaluation inside `draft-prompt.md`. Rejected: it combines author and reviewer, makes routine creation perform unnecessary experiments, and obscures whether construction or behavioral execution was completed.

Have the construction task generate several candidates but leave scoring elsewhere. Rejected as the default: candidate generation is itself evaluation-driven work and is unnecessary when creating a new prompt from an adequately resolved contract. An evaluator may request focused alternatives later in a separate revision cycle.

Make every prompt review comparative. Rejected: new prompts may have no incumbent, and an independent review can identify defects without manufacturing a contest. Comparison occurs only when the user supplies that scope.

Automatically revise the prompt after evaluation. Rejected: a read-only evaluator should not mutate the artifact it judges. The owner decides whether to run `draft-prompt.md` again with the supported findings as revision input.

## Consequences

Prompt creation becomes shorter and terminates with one prompt, its evidence-backed design record, and genuine caveats. It cannot claim behavioral validation.

Prompt evaluation becomes reusable across standalone prompts, repository-native sources, generated chat bundles, and model/API configurations. It can apply stronger experimental controls without burdening every creation request.

A full lifecycle is now explicit rather than recursive: create with `draft-prompt.md`, review or exercise with `review-prompt.md`, then start a separate revision pass only when the owner accepts supported findings. The tasks share guidance but never share mutation ownership in one run.
