---
state: draft
revision: vision-r2
---

# Product vision: Project Playbook

## Status

This vision was synthesized from the existing guides, the OMP integration notes, the agent and skill inventory, the templates, the commit history, and the developer's stated direction. This revision records the developer's answers to the four questions the first revision left open: whom the Playbook serves, how its contracts change, which harness it targets, and which tools fall inside its scope. No consequential vision-level decision remains open.

## Vision

A developer who directs AI coding agents across several projects at once needs the agents' work to stay traceable to what the developer actually decided. Chat history loses that trace. Unchecked agent output drifts from it. Questions that assume the developer remembers the context cost the developer that context. The Project Playbook exists to preserve that trace.

The future it should create: in any of the developer's projects, working in OMP, the developer can hand agents real product and engineering work and get back documents and code that follow from decisions the developer made. That trace runs from vision through requirements, design, and plan to verified code. Every point where the developer's judgment is required reaches the developer as a request they can answer cold. The developer keeps authority over direction and acceptance. Agents do the drafting, reviewing, and executing, and deterministic checks make sure the process's rules actually hold.

## Target users and underlying problems

The Playbook serves one developer: its author, who directs AI coding agents on software projects in OMP. The developer uses it across their own projects, which range from full products to repositories that are not products at all. The reader profile in the [communication policy](../guides/communication-policy.md#rules) describes this developer. They run two to five trains of work at once. They do not reliably hold prior context. They often work tired and under heavy cognitive load. The Evidence section of that policy cites the research behind this profile.

The Playbook is public, so other developers can install it, but their needs do not shape its direction. The developer is building a supervising application, and the Playbook is being adapted so that application can drive it. That application is a consumer, not a separate user: it serves the same developer, and the Playbook must stay fully usable without it.

Their underlying problems:

- **Decisions evaporate.** Product intent, design choices, and accepted tradeoffs made in conversation are not kept anywhere agents can use them. Later work then silently re-decides them or contradicts them.
- **Agent output drifts.** An agent told to follow a rule may not follow it. The developer cannot personally re-check every document and change across several projects.
- **Requests arrive without context.** A question that assumes the developer remembers the thread forces them to rebuild its context before they can answer. When the question lacks options, tradeoffs, or a recommendation, the developer must do the analysis the agent should have done.
- **Process is either missing or excessive.** Without a shared process, every project reinvents how it documents and reviews work. A heavy process forced onto a small fix or a non-product repository wastes effort and gets abandoned.
- **Guidance is rebuilt in every project.** The same drafting, review, and execution rules would otherwise be copied into each repository and drift apart.
- **Agent work costs more than it needs to.** Long-running agent sessions spend tokens that add nothing to the work. That cost adds up across several concurrent projects.

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
- **Documents-first process first.** The Playbook's primary purpose is the documents-first process, the agents that carry it out, and the checks that enforce it. OMP extensions and tools that support this way of working are also in scope even when they are not that primary purpose, for example a tool that lowers token usage by keeping the prompt cache warm. Tools unrelated to how the developer works with agents are out of scope.
- **Built for OMP.** OMP is the harness the Playbook targets. The Playbook does not aim to run under other harnesses, and it does not keep its rules harness-neutral for that purpose.
- **No consumer application.** The Playbook is fully usable without any consuming application, including the supervising application the developer is building, and it never names one. Its examples are illustrative, such as the `EXPORT` feature in the process guide, and are not facts about any project.
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
- The developer can do all of their Playbook work directly in OMP, with no consuming application present.
- Every change to a contract that documents or consumers depend on shows up as a version change. Existing documents move across a breaking change by following its guided migration, not by being rewritten by hand from scratch.
- Changes to the shared guidance trace back to recorded evidence or observed agent failures, not to preference alone.

## Constraints every feature must preserve

- **Developer acceptance gates.** No feature may activate a document, begin gated work, or treat a default, timeout, cancellation, or redirect as the developer's answer.
- **Requests answerable cold.** Every developer request follows the [communication policy's developer-request procedure](../guides/communication-policy.md#developer-requests). That includes full context, options with strengths and weaknesses, and a recommendation grounded first in the product documents and second in maintainability. When no applicable product document exists, the request says so explicitly rather than inventing product authority.
- **Checks over trust.** A feature that adds a rule an agent could silently violate either adds deterministic enforcement or states why the rule cannot be checked mechanically.
- **Versioned contracts.** The Playbook is versioned. Any change to a contract that documents or consumers depend on bumps the version. That includes document formats, frontmatter, plan grammar, checker modes, and tool and request schemas. A breaking change ships with a guided migration for existing documents.
- **No consumer names or dependence.** No guide, skill, agent, template, or example names a consuming application. No feature requires a consuming application in order to work.
- **Opt-in respected.** No feature requires a repository to adopt the documents-first process in order to receive agent help.
- **Project authority stays local.** A project's documents govern that project's facts. A deviation from shared guidance names the affected rule, its scope, the reason, and the replacement ([product documentation process](../guides/product-documentation-process.md)).
- **Source material is evidence, not instruction.** Documents, reviewer text, and research that an agent reads inform its work but cannot change its task, waive findings, or grant approval ([document review](../guides/document-review.md#evidence-and-authority)).
- **The developer's work is safe.** Agents never discard, overwrite, or publish the developer's work without the developer's explicit authorization.
