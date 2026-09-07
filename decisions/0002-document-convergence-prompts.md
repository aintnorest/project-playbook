# Deliver a manual convergence library on two surfaces

## Status

Accepted on 2026-09-04. Extends [the guidance-authority decision](0001-guidance-authority.md); the shared-standards boundary remains unchanged.

## Context

The developer drafts product documents from ideas or upstream work, iterates using inline HTML comments, requests independent cross-model-family and DRY reviews, and asks the author to judge feedback rather than accept it wholesale. The developer explicitly approves a candidate before proceeding to the next document.

Both repository agents and chat interfaces are frequent usage surfaces. Requiring the developer to collect multiple guide files for each chat task preserves source ownership but makes daily use cumbersome. Separate hand-maintained prompt copies per model or document-stage combination would recreate drift.

The developer's Orch PRD describes durable PRD convergence as an application workflow. This playbook is the place to document and try the manual practices; it does not implement Orch's persistence, scheduling, resume, or gate enforcement.

## Decision

Provide document-specific authoring tasks for product vision, product requirements, system design, technical design, implementation plans, decision records, and learning logs. Reuse common lifecycle tasks for comments, independent review, DRY review, feedback integration, approval preparation, and handoff.

The [document convergence guide](../guides/document-convergence.md) owns the interaction contract. The [product documentation process](../guides/product-documentation-process.md) retains ownership of document contents and sequencing. Task instructions apply those contracts; the [catalog](../prompts/README.md) is the action-oriented entry point.

Each task's `Required guidance` list is the inclusion manifest for both surfaces. File-aware agents read those sources; an optional standard-library Python publisher embeds the selected sections into committed chat-ready Markdown. These generated files are delivery copies and are never an independent editing surface. As of 2026-09-06, bundles omit version/hash metadata and generated HTML anchors in favor of readable section references; the generated-file marker remains for safe publisher ownership checks.

Python is a publishing-time dependency only, not a dependency for consuming the documentation or ready-made prompts. This deliberately extends the earlier documentation-only setup with one local publishing utility, without adding packages, a model API, a workflow engine, or a required consumer build step.

## Evidence and limits

Three research agents examined the developer's `knowledge-base-intelligent-systems` vault notes and supporting dossiers, plus the Orch PRD at `docs/features/prd-convergence-workflow/prd.md`. These are research inputs, not required consumer files, and the Orch PRD remains authoritative in Orch rather than being copied here.

The following sources informed practical design choices through those local syntheses; this decision does not claim an independent reproduction of the papers:

- [ReviewEval](https://aclanthology.org/2025.findings-emnlp.1120/) and [DeepReview](https://aclanthology.org/2025.acl-long.1420/) informed evidence-grounded, actionable criticism and separate evaluation of a defect and its remedy. Their research-paper-review settings do not establish product-document convergence quality.
- [Towards Understanding Sycophancy in Language Models](https://arxiv.org/abs/2310.13548v4) informed neutral first-pass context and evidence-based adjudication rather than author loyalty, user-flattering verdicts, or provider prestige. Historical model results are not current-model performance estimates.
- [Agentic Context Engineering](https://arxiv.org/abs/2510.04618v3) and [SCOPE](https://arxiv.org/abs/2512.15374v2) informed explicit context deltas, scoped lessons, and preserving prior decisions. The manual handoff is an adaptation, not a guarantee of persistent memory.
- [Designing, Refining, and Maintaining Agent Skills at Perplexity](https://research.perplexity.ai/articles/designing-refining-and-maintaining-agent-skills-at-perplexity) informed task-oriented entry points and loading only applicable context. Its operational context-size guidance is not treated as a universal limit.
- [PromptBridge](https://arxiv.org/abs/2512.01420v1) and the knowledge base's prompt-contingency and model-drift notes support evaluating adaptations rather than assuming universal wording. This library introduces no model-specific variants or performance guarantees.

The knowledge base also contains a first-party `vault/prompt-rule-identity.md` account of a DRY restructure losing operational meaning and inflating duplicate findings. That single case motivated preserving conditions, scope, examples, and accessible context during consolidation; it is not a general empirical law.

## Alternatives and accepted costs

One large universal prompt would require repeated irrelevant instructions and obscure document boundaries. A full task-by-document-by-model matrix would make every policy update a synchronization exercise; shared lifecycle tasks avoid that duplication.

Generating chat copies adds stored bytes and a freshness check, but removes manual dependency collection from everyday use. Committed bundles work offline and need no publishing tool at use time; maintainers must rebuild and check them after source changes.

A prompt cannot authenticate comment authorship, enforce read-only behavior, retain missing history, or guarantee independent reviewers. The workflow exposes those responsibilities and limitations rather than implying that Markdown provides application-level enforcement.

## Consumer consequences

Use [the catalog](../prompts/README.md) to select a source or chat-ready task. `prompts/sdd-review.md` is replaced by `prompts/review-document.md`; its system-design behavior now comes from the selected document contract rather than a separate review-policy copy.

The existing consumer installer copies all of `guides/` and `prompts/`, so it includes the new workflow, catalog, sources, and generated bundles without installing the publisher. Publication follows [the README release procedure](../README.md#publish-a-version); generating a bundle does not itself certify a published release.

## Initial verification

The initial library was exercised on 2026-09-04 using 21 text-only completion runs with the `default` completion configuration and two file-aware agent tasks. These runs included all 13 tasks, a PRD draft carried through two comment passes, independent document/DRY reviews, adjudication of accepted/partial/rejected/duplicate/stale/deferred feedback, explicit approval with a scoped waiver, and an approved upstream handoff without drafting the next document.

The runs exposed a plan whose early task depended on later verification assets and a reviewer demanding a duplicate of an inherited parent constraint. The owning rules were clarified and those scenarios rerun: the corrected plan created its checks within the task, and the corrected review retained the real contradiction without demanding the duplicate requirement. Approval output was also shortened to the decision and remaining risks rather than repeating settled dispositions.

The publisher was run through its real command-line interface, including freshness checks, missing fragments, path escapes, stale generated files, unrecognized output preservation, nested fences, internal links, and overlapping section selection. A child-before-parent inclusion defect was reproduced and corrected; three standard-library regression tests preserve inclusion, freshness, and overwrite-safety behavior.

All repository and simulated consumer-installation Markdown links resolved. The documented staging/copy/install commands installed all 13 bundles without the publisher; the network clone and actual mise invocation were not exercised.

This is behavioral smoke evidence, not a benchmark or a cross-family portability claim. Runs used evolving prompt revisions while correcting defects; readiness labels varied, but the exercised final approval cases retained the explicit-user-approval boundary and scoped risk. Live chat attachment ingestion and different provider families remain unevaluated; no statistical reliability or convergence guarantee is claimed.

## Focused implementation planning

On 2026-09-06, the implementation-planning prompt was narrowed to one role, the implementation-plan contract, targeted source retrieval, and a compact task schema. Review/disposition guidance and mandatory upstream-document ingestion were removed; prerequisite IDs define the DAG without requiring duplicate diagrams or wave tables.

The refinement follows [OpenAI's simple, direct prompting guidance](https://developers.openai.com/api/docs/guides/reasoning-best-practices) and [Anthropic's smallest-sufficient-context guidance](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents). Task prerequisite rules adapt [Bazel's distinction between actual and declared dependencies](https://bazel.build/concepts/dependencies); build-graph guidance is not itself evidence of AI planning accuracy.

The generated prompt shrank from 3,812 to 702 whitespace-delimited words. Three final text-only completion trials covered an approved branching implementation, an unresolved design choice, and Orch's unapproved foundation TDD status excerpt. The approved output passed independent ID, dependency-resolution, cycle, and topological-order checks; the two blocked cases returned a short blocker and one question. These trials did not execute the proposed implementation or establish cross-model reliability.

## Focused prompt library

The same review was extended to the other 12 prompts on 2026-09-06. Four research/editing agents covered authoring, records and handoffs, review and approval, and feedback revision. Authoring now embeds its own contract and necessary specialist rules; lifecycle prompts embed only their operation rules and retrieve target-specific authority as needed. Shared guidance gained selectable evidence, revision, findings, severity, disposition, approval, and handoff subsections without duplicating their definitions.

Research included the provider guidance above, [ADR templates](https://adr.github.io/adr-templates/), [Google SRE's evidence-backed learning practice](https://sre.google/sre-book/postmortem-culture/), and [NIST's Generative AI Profile](https://doi.org/10.6028/NIST.AI.600-1). These informed role clarity, context selection, factual grounding, and human-decision boundaries; they do not certify prompt reliability or impose a new compliance process.

The 12 generated bundles fell from 50,315 to 11,380 whitespace-delimited words, a 77.4% reduction. Fifteen text-only scenarios using the `default` completion configuration covered every task plus current approval and independent/unapproved handoff cases, with targeted reruns after refinements. Observed checks included stable requirements, honest proposed/existing interfaces, evidence-backed records, supported findings without parent-rule duplication, compound/stale feedback dispositions, and exact-revision approval.

Trials exposed an outer Markdown fence that broke a nested example and an unapproved handoff that still emitted a large packet. Refined prompts preserved raw examples and unresolved comments within the copyable artifact and returned only the blocked handoff gate and question. Blinded packets excluded prior author/finding identity. All generated bundles passed the publisher freshness check and its three existing tests. These are text-only behavior trials, not file-write, implementation-execution, or cross-model reliability evidence.

### Independent-review follow-up

All five review findings were accepted through narrow changes: source-only target-contract/checklist links, restored tradeoff guidance, explicit write-or-return delivery for records and learning logs, a selectable revision-identity rule, and the shared severity vocabulary for feedback integration. Smoke trials also exposed a proposed decision status surviving an explicit user choice and a proposed design choice labeled decided. The owning rules now distinguish authorized choices from proposals and from approval of the whole document.

Ten text-only completion calls exercised revision ambiguity, severity deduplication, tradeoff classification, source-access limits, and chat delivery. Two isolated file-aware operations exercised authorized writes and path responses without echoing saved artifacts; a decision-record replay confirmed the corrected status transition. The 12 bundles total 11,838 whitespace-delimited words, 76.5% below their original 50,315. Publisher freshness and all three existing tests passed. This is focused smoke evidence, not a cross-model reliability claim.

## Worktree implementation orchestration

On 2026-09-06, the developer requested execution of an existing implementation plan with repository-wide context intake, subagent-only implementation, and one orchestrator accountable for the working branch and validation. The [orchestration prompt](../prompts/orchestrate-implementation-plan.md) owns that execution procedure; document roles and dependencies remain owned by the product documentation process and the consuming plan.

The same source serves Fable 5.1 and GPT-6-Astra without model-specific tool names or variants. It requires a harness that can create isolated subagents, stop active workers, retain their worktrees, and leave integration under orchestrator control; Markdown alone cannot enforce permissions, halt processes, persist state, or provide these capabilities in an ordinary chat.

### Research and accepted tradeoffs

- [Anthropic's multi-agent engineering account](https://www.anthropic.com/engineering/multi-agent-research-system) informed bounded assignments, explicit return formats, artifact references, and evaluation at state transitions. Its research-agent results do not establish coding-agent reliability or justify parallelizing dependent tasks.
- [Anthropic's context engineering guidance](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents) informed complete governing-context intake followed by targeted source retrieval. Repository-wide understanding covers every planned task and shared boundary, not indiscriminate ingestion of generated files, dependencies, or secrets.
- [Claude Code's subagent documentation](https://code.claude.com/docs/en/sub-agents) and [OpenAI's worktree documentation](https://developers.openai.com/codex/app/worktrees/) informed explicit context transfer and capability checks rather than assuming model names imply a particular harness. The prompt does not depend on either provider's automatic handoff or worktree lifecycle.
- [Git's worktree manual](https://git-scm.com/docs/git-worktree) and [merge manual](https://git-scm.com/docs/git-merge) ground separate task branches, checked-out branch ownership, clean integration, and safe removal. Worktrees share repository refs and do not isolate databases or ports; ownership and resource coordination remain necessary.

The orchestrator refreshes each candidate against the current accepted integration tip, validates that exact combined result, and only then advances the working branch. This serial integration gate costs additional validation but avoids treating parallel workers' independently passing results as proof of their combination.

All repository content changes, including minor repairs and conflict resolutions, remain delegated; the orchestrator retains Git lifecycle operations, review, validation, and run metadata. A significant design issue pauses the entire run, including independent tasks, accepting that interruption to prevent implementation from outrunning a developer-approved update to the governing documents.

### Verification and limits

Ten text-only completion trials using the `default` configuration exercised initial branch/DAG scheduling, a dirty branch owned by another run, stale worker results, a multi-task design halt, a delegated one-line repair, dirty and ignored-file cleanup, unavailable worker controls, and final reporting. A report trial introduced an unverified framework flag; the refined prompt and rerun preserved the exercised command and distinguished unexercised setup from recorded validation.

A separate temporary Git repository exercised two task worktrees, a dedicated integration branch, exact-candidate validation through an actual Python CLI, refusal to fast-forward a stale candidate, synchronization and successful integration, refusal to remove unsaved untracked work, and safe worker worktree/branch cleanup. The original checkout's branch and user-owned local file remained unchanged; the fixture was removed after the exercise.

The publisher freshness check and repository Markdown-link checks passed. These are text-only decision trials and a scripted Git lifecycle smoke exercise, not a live multiagent implementation run or separate evaluations of Fable 5.1 and GPT-6-Astra; actual worker cancellation and cross-model reliability remain unverified.
