# Use selective research and prior evidence in prompt evaluation

## Status

Accepted on 2026-09-14.

## Context

The prompt evaluation contract established controlled behavioral review but did not explicitly retrieve technique-specific research. That omission could leave a static review unable to assess a material prompt technique or capability claim when the relevant evidence already existed in the knowledge base. Embedding the complete research catalog would create irrelevant context, stale copies, and a checklist that encourages claims beyond each study's measured scope.

Developers may also know how a prompt behaved before review. Reported failures, successful responses, raw outputs, grader reports, and earlier comparisons can identify consequential regressions and positive controls. A developer-reported observation is established for the artifact and runtime they identify, but its prompt revision, model, interface, settings, or inputs may differ from the artifact currently under review. Carrying a winner label or aggregate score forward as proof of a different target would reproduce the same uncontrolled-comparison problem the evaluation contract rejects.

Managed prompts add a related evidence boundary: users execute a compiled chat artifact assembled from a task source and shared guidance. Reviewing only the task source misses effective instructions; reviewing only the compiled text hides which editable owner must change and whether that owner feeds other prompts. A correction aimed at shared guidance therefore needs a consumer-impact check before mutation.

## Decision

Extend the [prompt evaluation contract](../guides/prompt-design.md#prompt-evaluation-contract) and [prompt-review task](../prompts/review-prompt.md) with two bounded evidence paths.

First, the evaluator identifies only material prompt techniques, model or interface adaptations, and capability claims whose external evidence could change a finding or behavioral case. It retrieves the smallest relevant local knowledge-base synthesis and supporting dossiers, using the public fallback only when no local copy is available and remote retrieval is permitted. Research retains its task, model, interface, metric, and revision limits. It may challenge an unsupported claim or motivate a test, but it does not prove the target prompt defective without applicable evidence. Functional responsibility boundaries remain distinct from prestige personas.

Second, the evaluator accepts every material developer-reported behavioral observation as established for its identified artifact and runtime without rerunning work merely to prove that history. It binds each observation to its provenance when possible and classifies its relationship to the current target as current, resolved, regressed, stale, or unverified. Prior failures seed regression cases; prior strengths seed positive controls. The evaluator preserves disagreements and raw evidence, does not carry a prior winner to another artifact or runtime, and does not narrow review to known cases.

For managed prompts, the evaluator reviews the generated delivery artifact and uses the task source, guidance manifest, included shared sections, publisher, and model/interface layer as a provenance map. Every structural finding names its editable owner or composition boundary. A finding that implicates shared guidance identifies the known consumer scope, preserves the behavior that shared rule serves, and requires cross-prompt impact review before correction. The evaluator does not modify the shared source or assume it should change when a narrow task-specific precedence rule is sufficient.

The evaluator remains read-only. Supplying historical comparison results does not request a new comparison, and neither research retrieval nor prior evidence authorizes automatic prompt revision.

## Alternatives and costs

Embed the complete knowledge base in every review prompt. Rejected: most of it is irrelevant to a given prompt, consumes context, becomes stale, and encourages a universal prompt-technique checklist contrary to the research itself.

Ignore prior user observations unless they arrive as formal findings. Rejected: this discards high-value regression evidence and observed strengths. Requiring provenance and an explicit evidence status controls the risk without throwing away the signal.

Treat reported behavior as proof of every later artifact or runtime. Rejected: the report is authoritative evidence that the identified observation occurred, but artifact and runtime differences still determine whether it establishes current behavior. The evaluator preserves the historical fact and assesses its applicability rather than silently carrying it forward or dismissing it.

Edit the compiled delivery artifact directly. Rejected: it would create an unowned fork that the publisher overwrites and would conceal whether the task or shared guidance caused the defect.

Change shared guidance whenever a compiled prompt exposes a conflict. Rejected: the same guide may serve many prompts correctly. Source ownership and consumer-impact review must precede a shared change; a local precedence statement is smaller when the conflict is task-specific.

Require behavioral execution for every research-backed concern. Rejected: static review may still identify an unsupported capability claim or missing contract. When execution is unavailable, the evaluator reports the precise behavioral limit instead of promoting generic research into proof.

## Consequences

Prompt reviews can use existing research without bloating every delivery artifact and can turn known good and bad behavior into explicit evaluation coverage. Reports become longer when prior evidence is supplied because every material observation receives a disposition. Consumers should provide raw outputs and runtime provenance when available; missing provenance limits current-behavior conclusions but does not block supported structural review.
