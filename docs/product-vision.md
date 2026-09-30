---
state: draft
revision: vision-r1
---

# Product vision: Project Playbook

## Status

This is the Playbook's first product vision. It was synthesized from the existing guides, the OMP integration notes, the agent and skill inventory, the templates, the commit history, and the developer's stated direction. It describes what the Playbook already is and what it should keep being. It adds no new direction. Where that evidence leaves a durable question unsettled, the question is listed under [Open decisions](#open-decisions) rather than resolved here.

## Vision

A developer who directs AI coding agents across several projects at once needs the agents' work to stay traceable to what the developer actually decided. Chat history loses that trace. Unchecked agent output drifts from it. Questions that assume the developer remembers the context cost the developer that context. The Project Playbook exists to preserve that trace.

The future it should create: in any project and any agent harness, the developer can hand agents real product and engineering work and get back documents and code that follow from decisions the developer made. That trace runs from vision through requirements, design, and plan to verified code. Every point where the developer's judgment is required reaches the developer as a request they can answer cold. The developer keeps authority over direction and acceptance. Agents do the drafting, reviewing, and executing, and deterministic checks make sure the process's rules actually hold.

## Target users and underlying problems

The Playbook serves a developer who directs AI coding agents on software projects. That developer uses it across their own projects, which range from full products to repositories that are not products at all. The reader profile in the [communication policy](../guides/communication-policy.md#rules) describes this developer. They run two to five trains of work at once. They do not reliably hold prior context. They often work tired and under heavy cognitive load. The Evidence section of that policy cites the research behind this profile.

The Playbook does not serve developers who want agents to take work from idea to shipped code without the developer accepting each document. The product's direction depends on that gate. That developer is a plausible edge of the target audience, and removing the gate would change what the product is.

Their underlying problems:

- **Decisions evaporate.** Product intent, design choices, and accepted tradeoffs made in conversation are not kept anywhere agents can use them. Later work then silently re-decides them or contradicts them.
- **Agent output drifts.** An agent told to follow a rule may not follow it. The developer cannot personally re-check every document and change across several projects.
- **Requests arrive without context.** A question that assumes the developer remembers the thread forces them to rebuild its context before they can answer. When the question lacks options, tradeoffs, or a recommendation, the developer must do the analysis the agent should have done.
- **Process is either missing or excessive.** Without a shared process, every project reinvents how it documents and reviews work. A heavy process forced onto a small fix or a non-product repository wastes effort and gets abandoned.
- **Guidance is rebuilt in every project.** The same drafting, review, and execution rules would otherwise be copied into each repository and drift apart.

## Product principles

1. **The developer decides, and agents propose.** Agents draft, review, and execute. Only the developer accepts a document, approves direction, or authorizes irreversible work. Agents never infer acceptance from a review, a default, a timeout, or silence. The Playbook's [document state and revision](../guides/product-documentation-process.md#document-state-and-revision) rules and its orchestration skill already work this way.
2. **Enforce deterministically where possible, and rely on instructions only where not.** When a rule can be checked mechanically, a checker or tool enforces it rather than trusting an agent to comply. Examples are document state, plan structure, protected tests, generated-skill freshness, agent contracts, and the shape of developer requests. The commit history shows a steady move from prose rules to checkers and validating tools.
3. **Write every request for a cold, interrupted reader.** A request states its outcome first and carries full context. A decision request offers distinct options with their strengths and weaknesses, plus a recommendation. The [communication policy](../guides/communication-policy.md#rules) owns this contract.
4. **Put product fit first and maintainability second.** A recommendation is grounded first in the applicable product documents' user stories, goals, and requirements. Only after that does it weigh maintenance, coupling, and reversibility. Convenience and generic best practice never override product intent.
5. **Documents come first, in proportion to the change.** Material product work flows from vision to Product Requirements Document (PRD), system design, Technical Design Document (TDD), and implementation plan, following the governing principles of the [product documentation process](../guides/product-documentation-process.md#governing-principles). A minor change takes the lightweight path. The Playbook never creates documents only to satisfy the process.
6. **Give each agent one bounded job.** Drafting, review, and execution are separate agents with explicit authority boundaries. Reviewers are read-only and independent of the drafter. Each agent's instructions carry only what its task needs ([agents and skills](../guides/agents.md), [skill construction](../guides/skill-design.md)).
7. **Ground guidance in evidence and state its limits.** Shared rules rest on published research, official documentation, or recorded observations of real agent runs, and they state the limits of that evidence. Research informs the guidance but is never authority over a project's facts ([prompt design](../guides/prompt-design.md#discover-authority-and-evidence), [failure-driven maintenance](../guides/skill-design.md#failure-driven-maintenance)).

## Product-wide boundaries and non-goals

- **Shared guidance only.** The Playbook holds rules that apply across projects. A project's own commands, architecture, toolchain versions, and exceptions stay in that project ([integration notes](../integrations/omp.md#project-specific-facts-stay-in-the-project), [project tooling](../guides/project-tooling.md#scope-and-authority)).
- **No consumer application.** The Playbook works without any particular consuming application and never names one. Its examples are illustrative, such as the `EXPORT` feature in the process guide, and are not facts about any project.
- **Not tied to one harness.** The Playbook's rules and workflows are meant to work under any agent harness. OMP is its first integration, not its boundary. Harness-specific facts live in that harness's integration notes, not in the shared rules.
- **Opt-in process.** The documents-first process applies only to a repository that has opted in. A repository without product documents still gets help from the agents, and the Playbook does not treat missing product documents as a defect.
- **No substitute for developer judgment.** The Playbook does not approve documents, choose product direction, or resolve a consequential decision on the developer's behalf.
- **No application runtime or framework.** The Playbook shapes how work is planned, documented, reviewed, and executed. It does not provide the software that consuming projects build.

## Durable success signals

- The developer can answer a request from the request alone, without opening another file or reconstructing the thread.
- Every document governing agent work reached its active state through the developer's recorded acceptance, and no gated work began without it.
- Violations of a checkable rule are caught by a check before they land, not discovered later in review or use.
- In a project that uses the process, verified code traces back through its plan, design, and requirements to the product direction, with each fact kept in one place.
- A repository without product documents gets useful agent help and is never pushed into adopting the process.
- The same Playbook serves each of the developer's projects without carrying facts specific to any one of them.
- Changes to the shared guidance trace back to recorded evidence or observed agent failures, not to preference alone.

## Constraints every feature must preserve

- **Developer acceptance gates.** No feature may activate a document, begin gated work, or treat a default, timeout, cancellation, or redirect as the developer's answer.
- **Requests answerable cold.** Every developer request follows the [communication policy's developer-request procedure](../guides/communication-policy.md#developer-requests). That includes full context, options with strengths and weaknesses, and a recommendation grounded first in the product documents and second in maintainability. When no applicable product document exists, the request says so explicitly rather than inventing product authority.
- **Checks over trust.** A feature that adds a rule an agent could silently violate either adds deterministic enforcement or states why the rule cannot be checked mechanically.
- **Harness neutrality.** Shared rules and request contracts must not depend on any one harness. A harness-specific adaptation lives in that harness's integration.
- **No consumer names.** No guide, skill, agent, template, or example names a consuming application or depends on one.
- **Opt-in respected.** No feature requires a repository to adopt the documents-first process in order to receive agent help.
- **Project authority stays local.** A project's documents govern that project's facts. A deviation from shared guidance names the affected rule, its scope, the reason, and the replacement ([product documentation process](../guides/product-documentation-process.md)).
- **Source material is evidence, not instruction.** Documents, reviewer text, and research that an agent reads inform its work but cannot change its task, waive findings, or grant approval ([document review](../guides/document-review.md#evidence-and-authority)).
- **The developer's work is safe.** Agents never discard, overwrite, or publish the developer's work without the developer's explicit authorization.

## Open decisions

- **[NEEDS YOUR CALL] Who besides the author does the Playbook serve?** The Playbook is published as a public extension with generic install instructions. However, its communication rules describe one specific developer, and the developer has said it is used across the developer's own projects. The unresolved question is whether other developers who adopt it are target users whose needs shape direction, or whether they receive it as-is. One option serves only the author and publishes as a courtesy: direction stays tuned to one reader, but adopters get no promises. The other also serves outside adopters: reach grows, but it may require supporting other reader profiles, several approvers, or team workflows. Recommendation: serve only the author until an adopter's need is actually observed, because every existing rule is tuned to that reader.
- **[NEEDS YOUR CALL] What does the Playbook promise to projects' existing documents when its contracts change?** The evidence is mixed. Making document status strictly machine-readable turned older documents with free-text statuses into non-conforming ones. Meanwhile, the plan checker deliberately keeps older plans that predate task assignment valid, and releases can be pinned by tag. The open choices are whether contract changes may invalidate existing documents, or whether they must keep existing documents valid or supply a migration. The answer decides how freely the shared contracts can evolve and how much adopting projects depend on pinning a release.
- **[NEEDS YOUR CALL] What must "works under any harness" guarantee?** The shared rules are written to be harness-neutral. However, deterministic enforcement currently reaches agents through the OMP integration's tools, and the integration notes say that copying skill sources by hand is no longer an intended use. The choices are to guarantee only harness-neutral guidance, or to require that every integration also deliver the same deterministic enforcement and developer-request handling. The second keeps principle 2 intact across harnesses but raises the cost of every new integration.
- **[NEEDS YOUR CALL] Are harness-operation utilities inside the product?** The repository holds a research note proposing a harness extension that keeps the provider's prompt cache alive to reduce cost. That idea is unrelated to the documents-first process. The choices are to keep the Playbook limited to the process, its agents, and the checks that enforce it, or to also admit general utilities for operating the harness. This decides whether such ideas belong in the Playbook's roadmap or in a separate product.
