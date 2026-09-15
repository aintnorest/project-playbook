# Check design work for goal foreclosure and reversibility

## Status

Accepted on 2026-09-10.

## Context

The document hierarchy promises "a traceable path from vision to verified code," but the design prompts enforced traceability only to the parent Product Requirements Document (PRD). A slice or feature design could satisfy every local requirement and still narrow the project's durable direction by persisting a schema, exporting a shared contract, or fixing a wire format that later goals must then fight.

This surfaced when a reviewer, asked directly whether a Technical Design Document (TDD) was too focused on its slice to protect the project's goal, found real foreclosure that no prompt instruction had required checking. Relying on the developer to remember to ask that question each round is not a control.

The repository already forbids the opposite failure, speculative generalization and invented scale targets, so any new guard had to avoid reintroducing over-engineering.

## Decision

Add a forward-compatibility check to the three design prompts and admit the product vision as a traceable source:

- `draft-system-design.md`, `draft-technical-design.md`, and `review-doc-technical-design.md` each gain one instruction requiring the design to trace to the product vision's durable direction, not only the parent PRD, and requiring any costly-to-reverse or de facto global choice to be named.
- The product vision's durable direction is added as an available governing source in each prompt's inputs; an unavailable vision is a coverage limit, not a defect.

The check rests on one reconciling principle: you need not build the future now, but you must not foreclose it. Concretely:

- Classify a decision by how hard it is to reverse; scrutinize the one-way-door choices (persisted data, shared or exported contracts, wire or event formats, trust boundaries, depended-on names) and spend no design budget defending easily reversible ones.
- Preserve optionality cheaply by hiding a likely-to-change decision behind a module boundary, not by adding speculative machinery, which stays excluded.
- Defer a forced-but-not-yet irreversible decision to the last responsible moment with a named gate and the evidence needed, or record it as an explicit tradeoff naming what it forecloses.
- In review, a foreclosure is a finding only when a stated durable goal is demonstrably foreclosed or made materially more expensive; a capability correctly not built yet is not a defect.

Evidence:

- Reversible versus irreversible decisions: Jeff Bezos, 2015 Amazon shareholder letter, one-way versus two-way doors (https://s2.q4cdn.com/299287126/files/doc_financials/annual/2015-Letter-to-Shareholders.PDF); Gregor Hohpe, *The Software Architect Elevator* (O'Reilly, 2019).
- Deferring commitment: Mary and Tom Poppendieck, *Lean Software Development: An Agile Toolkit* (Addison-Wesley, 2003), the last responsible moment; Sobek, Ward and Liker, "Toyota's Principles of Set-Based Concurrent Engineering," *MIT Sloan Management Review* (1999), https://sloanreview.mit.edu/article/toyotas-principles-of-set-based-concurrent-engineering/.
- Optionality through boundaries rather than speculation: David Parnas, "On the Criteria To Be Used in Decomposing Systems into Modules," *Communications of the ACM* (1972), https://dl.acm.org/doi/10.1145/361598.361623, and "Designing Software for Ease of Extension and Contraction," *IEEE Transactions on Software Engineering* (1979); Baldwin and Clark, *Design Rules: The Power of Modularity* (MIT Press, 2000); Martin Fowler, "Is Design Dead?" (https://www.martinfowler.com/articles/designDead.html) and the "speculative generality" smell.
- Tracing to durable goals: Eric Evans, *Domain-Driven Design* (Addison-Wesley, 2003), core versus supporting and generic subdomains; Bass, Clements and Kazman, *Software Architecture in Practice*, 3rd edn. (Addison-Wesley, 2012), quality-attribute scenarios and the Architecture Tradeoff Analysis Method.
- Recording what a choice forecloses: Michael Nygard, "Documenting Architecture Decisions" (2011), https://cognitect.com/blog/2011/11/15/documenting-architecture-decisions.

## Alternatives and costs

Import heavier frameworks wholesale as prompt vocabulary: fitness functions (Ford, Parsons and Kua, *Building Evolutionary Architectures*), Wardley evolution stages, or the domain-driven-design subdomain tiers. Rejected: each needs defining machinery the product documentation process does not carry, and fitness functions govern code and continuous integration, not a design document. The minimal reversibility-plus-traceability check delivers the benefit without that surface.

Add a standalone "architecture longevity" checklist document. Rejected: it would duplicate authority the three prompts already own and add another file to keep synchronized, which [decision 0001](0001-guidance-authority.md) exists to prevent.

Leave the check to the developer's ad-hoc question. Rejected: that omission is the failure this record addresses.

The added instructions lengthen three prompts and introduce the terms "reversible," "last responsible moment," and "hidden behind a boundary." That cost buys a first-class guard against the one failure the anti-speculation rules do not cover.

## Consequences

The three prompts and their generated chat copies now require the vision trace and the foreclosure check. Because the check keys on the product vision, a project without a `docs/product-vision.md` yields a coverage limit rather than a defect; the vision is worth writing for the check to bite. The reversibility framing is confined to these prompts; the communication policy and technical-writing standards are unchanged.
