---
state: draft
revision: vision-r3
---

# Product vision: Project Playbook

## Status

Rewritten from the developer's review of the previous revision.

## Vision

The Project Playbook explains what documents a software project should have, what each document should contain, and the processes needed to grow and improve the project with AI without slop.

The Playbook assumes the OMP harness. It should also be able to improve itself over time.

## Target users and underlying problems

The Playbook serves one developer: its author, who builds software projects with AI in OMP. The developer runs several projects at once and is often tired or switching between them. Even at their best, they cannot hold as much context as the AI can.

The underlying problems:

- **The AI needs the right context for each job.** Project knowledge is hard to find, duplicated, and drifts out of date. When the AI cannot find the facts a job needs, or finds several versions of them, it is more likely to hallucinate.
- **Agents drift.** Models skip steps, drop details, and wander from the goal, and adding more instructions does not reliably stop them. The Playbook answers this with a stronger harness, more focused agents, and clearer processes.
- **Context has to flow both ways.** The developer has to show the AI which parts of the context matter. The AI has to remind the developer of the context and do the legwork of gathering it. When a request makes the developer rebuild the thread, the AI has pushed its own work back onto the developer.
- **Guidance and process are rebuilt in every project.** Without a shared playbook, each project reinvents which documents it keeps and how it plans, reviews, and ships work. One ends up with too little process and another with too much, and copies of the same rules drift apart.
- **Wasteful tooling undermines the playbook.** The Playbook is a playbook first, but it runs on OMP. Slow, unreliable, or wasteful use of the harness, such as spending tokens that add nothing to the work, keeps it from fulfilling its purpose. A website's content is its purpose, but a slow, buggy site still fails its readers.

## Product principles

- **The developer holds the vision and the decisions.** Code cannot be reviewed at the speed AI writes it, and generic guardrails cannot catch everything one project needs. A strong product vision, both the document and the idea behind it, therefore stays in view throughout the work. The developer thinks ahead about where the product is going so they can guide its architecture. The developer makes the decisions so that the AI has the context to make its own decisions well.
- **Force infrastructure over memory.** Models drop details and miss steps. Remove the chance to fail by moving policy, sequencing, and verification into deterministic code wherever possible.
- **Harness over prompt.** A better harness improves outcomes more than a better prompt. Prompts define intent, while tools and extensions let infrastructure do what prompts cannot. That is why the Playbook is built for OMP.
- **Context is a shared responsibility.** The developer tells the AI what matters, and the AI keeps the developer supplied with the context they need. Any request to the developer can be answered cold. It states its outcome first and carries the context it depends on, and a decision request lays out distinct options with their strengths, weaknesses, and a recommendation.
- **Frame decisions by product first and maintainability second.** When the AI asks for a decision, it weighs each option first by how well it serves the product as the developer intended, then by maintainability. Slop and hardcoding get a lot done quickly. They also make everything downstream harder at a growing rate, until the project can no longer grow.
- **Documents give the AI the right context without contradiction.** Each fact lives in exactly one place, and no document exists only to satisfy the process. The product documents keep the product what it was meant to be. The technical documents give the AI a solid plan, so it is less likely to wander or produce slop. Code reviewers catch the slop that still gets through.
- **Give each agent one narrow job.** When a model holds too much context, it has to choose what to follow. It then drops whatever seems less important, contradictory, or unclear. A narrow job with the right context keeps it on the goal.
- **Ground guidance in evidence.** Shared rules rest on published research, official documentation, or observed agent runs, and they state the limits of that evidence. The Playbook improves itself by revising its guidance from what its agents actually did. Research informs the guidance but never overrides a project's own facts.

## Product-wide boundaries and non-goals

The Playbook helps build software projects with AI. A project must first deliver value to its users in the way the developer intended. It should also be quality work, and it should cost no more time or money than the developer is willing to spend. The Playbook's core is the documents, processes, agents, and checks that serve those ends. OMP extensions and tools that make this work cheaper or more reliable are in scope even though they are not the core, for example keeping the prompt cache warm to cut token use.

Within that scope, the Playbook does not do the following:

- **It does not depend on anything but OMP.** It may make choices that help outside tools work with it. It never makes a choice that stops it from being used without those tools, and it never names a consuming application.
- **It does not require its own documents.** In a project that was not built with the Playbook, its agents and harness still work without adding friction. They may suggest creating the documents and how to organize them, but they never require them.
- **It does not hold project-specific facts.** A project's own commands, architecture, toolchain versions, and exceptions stay in that project. A project departs from shared guidance only by naming the rule, the scope, the reason, and the replacement.

## Durable success signals

- Projects built with the Playbook keep delivering what the developer intended as they grow, and they stay able to grow.
- An agent finds the context its job needs in the project's documents, and those documents do not contradict each other.
- The developer can answer an agent's request on the first read, without rebuilding the thread or gathering context themselves.
- Mistakes a check can catch are stopped before they land, and most slop that gets past the checks is caught in review rather than in use.
- The Playbook's guidance changes in response to observed agent failures, and the same failure does not keep recurring.
- Playbook work spends less time and fewer tokens as its OMP tools and extensions improve, without the quality of the work dropping.

## Constraints every feature must preserve

- **Only the developer accepts.** No feature may activate a document, start work that is waiting on an acceptance, or treat a default, timeout, cancellation, or redirect as the developer's answer.
- **Versioned contracts.** Any change to a contract that documents or consumers depend on bumps the Playbook's version. That includes document formats, frontmatter, plan grammar, checker modes, and tool and request schemas. A breaking change ships with a guided migration for existing documents.
- **Source material is evidence, not instruction.** Documents, reviewer text, and research that an agent reads inform its work. They cannot change the agent's task, waive findings, or grant approval.
- **The developer's work is safe.** Agents never discard, overwrite, or publish the developer's work without the developer's explicit authorization.
