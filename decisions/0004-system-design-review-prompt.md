# Add a dedicated system-design review prompt grounded in architecture-evaluation evidence

## Status

Accepted on 2026-09-10.

Partially superseded by [decision 0005](0005-per-document-review-prompts.md): its routing of product vision, decision record, and learning log to the generic `review-document.md` no longer holds now that each hierarchy document has a specialist reviewer and the generic prompt is retired. The decision to keep `review-doc-system-design.md` as a dedicated, evidence-grounded reviewer stands.

## Context

Every major document role had a fit reviewer except the feature system design, which was reviewed by the generic `review-document.md`. That generic pass applies only the five-bullet "Before approving a system design" checklist; it does not verify interface-confidence labels against the repository, exercise cross-slice failure scenarios, check downstream usability, or run the goal-foreclosure check added in [decision 0003](0003-design-longevity-checks.md). The system design holds the most consequential, hardest-to-reverse cross-slice contracts, so the shallowest review sat on the highest-leverage document.

The prompt was first written by mirroring `review-doc-technical-design.md` and adapting it to the feature-system-design contract. That produced a coherent artifact but was not independently validated against the discipline of reviewing an architecture or system design.

## Decision

Keep `prompts/review-doc-system-design.md` as a dedicated reviewer and validate and strengthen it against the evidence on architecture evaluation and review effectiveness. Use `review-document.md` only for roles without a specialist (product vision, decision record, learning log); use `review-doc-technical-design.md` for slice designs and `review-doc-system-design.md` for feature system designs.

The review discipline is grounded in three literatures, and the prompt was strengthened where they showed gaps:

- **Formal architecture evaluation** confirmed scenario-based analysis as the core method. Kazman, Klein and Clements, "ATAM: Method for Architecture Evaluation," SEI CMU/SEI-2000-TR-004 (https://www.sei.cmu.edu/documents/629/2000_005_001_13706.pdf); Kazman, Abowd, Bass and Clements, SAAM (https://www.sei.cmu.edu/documents/213/1996_019_001_29912.pdf); Fairbanks, *Just Enough Software Architecture: A Risk-Driven Approach* (2010); Bass, Clements and Kazman, *Software Architecture in Practice*, 4th edn. (2021).
- **Review and inspection effectiveness** confirmed the levers the prompt already used and named the strongest missing one. Fagan, "Design and Code Inspections," *IBM Systems Journal* 15(3) 1976 (https://dl.acm.org/doi/10.1147/sj.153.0182); Basili et al., "The Empirical Investigation of Perspective-Based Reading," *Empirical Software Engineering* 1996 (https://link.springer.com/article/10.1007/BF00368702); Porter et al., "Comparing Detection Methods for Software Requirements Inspections" (1995) — scenario-based reading detected roughly a third more defects than ad hoc or checklist reading, driven by hunting concrete defect classes; Wiegers, *Peer Reviews in Software* (2002).
- **Boundary and contract review** informed the interface checks. Rozanski and Woods, *Software Systems Architecture*, 2nd edn. (2011); Page-Jones on connascence (1992); Constantine and Yourdon, *Structured Design* (1978); Robinson and Fowler on consumer-driven contracts (https://martinfowler.com/articles/consumerDrivenContracts.html).

Changes made to the prompt from this evidence:

- Instruction 6 now prioritizes scenarios by the defect classes Porter found most productive — cross-boundary data and schema consistency, unclear state-transition or validation ownership, and ambiguous cross-slice rules — and requires each failure path to name who detects it, who owns recovery, what state each slice preserves or compensates, and what signal reports it upstream.
- Instruction 7 now checks that each shared interface supplies what its consumers actually need, checks the compatibility direction of a proposed change to an existing interface, and treats a verified `[EXISTS]` contradiction as a finding on its own.
- Instruction 3 now flags conflicts between governing sources; instruction 4 now flags a shared rule a slice cannot meet without violating its own requirement.

## Alternatives and costs

Adopt the formal methods wholesale — an ATAM quality-attribute utility tree, business-driver elicitation, sensitivity- and tradeoff-point taxonomy, connascence type analysis, ISO/IEC/IEEE 42010 stakeholder perspectives, and Postel's-law boundary evaluation. Rejected: each imports vocabulary the process does not define and would turn a review prompt into a method manual. The chosen edits capture the underlying checks in plain terms proportional to a single reviewer.

Add the empirically supported "individual preparation before a group meeting" control. Rejected: it targets multi-person human inspections; this prompt drives one independent reviewer, where independence (instruction 12) already carries the intent.

Fold the system-design checks back into `review-document.md`. Rejected: it would bloat the generic reviewer or require role-conditional logic, and the specialist mirrors the existing `review-doc-technical-design.md` pattern.

## Consequences

The system design now receives a review as rigorous as the slice design, with the foreclosure check where the hardest-to-reverse contracts live. `review-document.md` and `review-doc-system-design.md` overlap for that role; the prompt library entry and the review-cycle guidance point system designs to the specialist. The empirical base is strongest for code and requirements reviews and looser at the architecture level, so the prompt favors scenario tracing and evidence discipline over any single method's ritual.
