# Product documentation process

This process keeps product intent, system architecture, technical design, and implementation work separate while preserving a traceable path from vision to verified code.

It governs document roles, hierarchy, and workflow. General developer-facing output follows [the communication policy](communication-policy.md); confidence labels and the rules for expressing mechanisms, interfaces, failures, non-goals, and tradeoffs follow [the technical-writing standards](technical-writing-standards.md). Those shared guides are authoritative for their subjects. Project-specific facts remain in the document that owns them; any deviation from shared guidance must name the affected rule, scope, reason, and replacement.

This is the full-feature workflow for material product work. The [lightweight path](#lightweight-path-for-minor-changes) applies to a minor fix or change that does not introduce a material product decision, cross-boundary technical contract, or independently planned delivery.

## Status

Active working agreement for new or revised product documentation.

Use the [document convergence workflow](document-convergence.md) to draft, comment on, independently review, revise, and approve these documents. This process owns document contents and sequencing; that workflow owns the repeated human/model interaction.

## Governing principles

1. **One fact has one authoritative home.** Other documents reference that fact instead of copying it.
2. **Use the smallest document hierarchy that keeps boundaries clear.** Do not create slices, diagrams, or templates merely because the process permits them.
3. **Split work at independently testable handoffs.** A slice ends with observable or persisted state that the next slice can consume.
4. **Design precedes task decomposition.** An implementation plan divides decided work; it does not silently make product or architecture decisions.

## Documentation hierarchy

```text
Product vision
  └── Feature
      ├── Product requirements document
      ├── Small feature
      │   ├── Technical design
      │   └── Implementation plan
      └── Large feature
          └── System design
              └── Slices
                  ├── Technical design
                  └── Implementation plan
```

### Product level

`docs/product-vision.md` states the durable product direction. It applies across features and changes less often than feature requirements.

### Feature level

Every full feature lives under `docs/features/<feature-name>/` and starts with `prd.md`, the Product Requirements Document. A small feature uses one `tdd.md` and one `implementation-plan.md` at the feature root. A feature that meets the slice criteria adds `system-design.md` at the feature root and numbered slice directories; each slice owns a `tdd.md`. Create an implementation plan only when its technical design is approved and ready to build.

### Lightweight path for minor changes

For a minor fix or change, update the existing document that owns the changed product fact or technical contract, if one exists, and verify the actual changed behavior. Do not create a Product Requirements Document, technical design, system design, or implementation plan merely to satisfy this process.

Use the full-feature workflow instead when the change introduces a material requirement or non-goal, a new or changed cross-boundary interface, an unresolved product or architecture decision, a separately reviewable delivery, or work that needs ordered task decomposition. Record a concise decision in the owning document when the boundary is not obvious.

## When a feature needs slices

Create slices when at least one of these conditions is true:

- The feature has two or more independently useful delivery milestones.
- One part must establish persisted or observable state before another part can begin.
- Different parts have materially different security, reliability, or operational risks.
- The complete technical design is too large to review as one coherent change.
- A later part can be tested from a fixture representing the earlier part's exit state.

Do not create slices merely because the code crosses directories, crates, components, or programming languages. If a proposed slice has no independently testable exit state, it is probably a task inside another slice rather than a slice.

## Standard directory shapes

### Small feature

```text
docs/features/<feature-name>/
  prd.md
  tdd.md
  implementation-plan.md
```

### Large feature

```text
docs/features/<feature-name>/
  prd.md
  system-design.md
  slices/
    01-<slice-name>/
      tdd.md
      implementation-plan.md
    02-<slice-name>/
      tdd.md
```

Do not add `.md` to directory names. The directory supplies context; stable filenames identify the document's role.

## Document contracts

### Product vision

**Purpose:** State why the product exists and what durable direction constrains every feature.

**Contains:**

- target users and their underlying problems;
- product principles;
- product-wide boundaries and non-goals;
- durable success signals;
- constraints that every feature must preserve.

**Excludes:**

- feature-specific requirements;
- implementation architecture;
- command, schema, or module contracts;
- task sequencing.

### Feature Product Requirements Document

**File:** `docs/features/<feature-name>/prd.md`

**Purpose:** The Product Requirements Document (PRD) defines what one complete feature must accomplish and why it matters.

**Contains:**

- status;
- product summary;
- problem;
- explicit non-goals;
- user stories;
- individually identified requirements;
- product-level acceptance intent;
- product constraints and unresolved product decisions.

**Excludes:**

- technical components;
- database or file schemas;
- function signatures;
- implementation order;
- design choices that do not change product behavior.

### Feature system design

**File:** `docs/features/<feature-name>/system-design.md`

**Purpose:** Explain how a large feature works as a whole and define contracts shared by more than one slice.

**Contains:**

- system context and external actors;
- major components and their responsibility boundaries;
- end-to-end control and data flow;
- feature-wide state and consistency model;
- trust and security boundaries shared by slices;
- feature-wide error, schema, event, and compatibility rules;
- feature-wide concurrency, locking, and recovery rules;
- automated-worker authority boundaries, only when the feature includes automated workers;
- slice dependency graph and persisted handoff states;
- mapping from requirement IDs to owning slices.

**Excludes:**

- exact slice-local database columns;
- complete command flag lists;
- slice-local payload schemas;
- prompt text;
- private algorithms;
- implementation tasks.

A rule belongs here only when multiple slices must obey it or when it defines the boundary between slices. A rule that exists entirely inside one slice belongs in that slice's technical design.

### Technical Design Document

**File:** `tdd.md`

**Purpose:** Define how one small feature or one large-feature slice will be implemented. “Technical Design Document (TDD)” is the repository meaning; it does not mean test-driven development here.

**Contains:**

- parent document and requirement references;
- explicit non-goals;
- entry state and exit state;
- rejected inputs and failure behavior;
- data-flow traces;
- concrete interfaces and data schemas;
- state transitions and transaction boundaries;
- security and operational assumptions;
- explicit tradeoff decisions;
- observable acceptance in the notation selected under [behavioral acceptance](#behavioral-acceptance);
- technical contracts and verification criteria;
- handoff state for the next slice.

**Excludes:**

- copied product requirement text;
- copied feature-wide architecture;
- work breakdown and dependency order;
- speculative generalization for unapproved future features.

### Implementation plan

**File:** `implementation-plan.md`

**Purpose:** Divide an approved technical design into bounded, independently verifiable implementation tasks.

**Contains:**

- stable task identifiers and deliverable-oriented titles;
- direct prerequisite IDs, each with its required output or hard ordering constraint; these define the directed acyclic graph (DAG);
- exact file and symbol targets, distinguishing existing edits from approved planned creations;
- the bounded change and referenced TDD requirement, scenario, or technical contract;
- observable acceptance and a narrow verification command or concrete exercise with its expected result;
- verification prerequisites available within the task, the existing repository, or predecessor tasks;
- explicit ownership or ordered handoffs for shared files and contracts;
- integrated feature acceptance and the repository's required final verification;
- explicit decision gates only for already approved conditional choices.

**Excludes:**

- new architecture decisions;
- new product behavior;
- copied requirements or technical design sections;
- placeholders that appear complete but leave behavior unimplemented.

List tasks in topological order. A task is ready when its prerequisites finish, not when an arbitrary phase ends. Dependency IDs are the authoritative graph; diagrams and parallel-wave tables are optional derived views, not additional sources of truth.

If decomposition reveals an unresolved design choice, return the precise question to the owning document instead of hiding it inside a task. Planning does not authorize changing the design.

### Code tests

Code tests provide executable proof for behavior and technical contracts. They reference requirement IDs, scenario names, or technical contract names; they do not become the only place where the contract is explained.

### Learning log

`docs/learning-log.md` records durable lessons and decisions worth carrying across features. Do not copy feature-local design details into it; reference the owning document and record only the reusable lesson.

Include the observation, its supporting source or actual check, the reusable lesson, and the conditions under which it applies. Distinguish an observed result from a hypothesis or a planned experiment; skip an entry when there is no durable lesson.

### Decision record

**File:** Use the project's existing decision-record location and numbering. If none exists, propose `docs/decisions/<number>-<decision-name>.md` before creating it; this playbook itself uses `decisions/`.

**Purpose:** Preserve why a meaningful choice was made without becoming a second definition of the current product or technical contract.

**Contains:**

- status and the actual decision date when known;
- context and the decision to be made;
- chosen option, or a proposed option awaiting the developer's decision;
- rationale, alternatives, and accepted costs;
- consequences and affected document references;
- a superseding decision reference when the choice is replaced.

**Excludes:**

- invented historical reasoning or approval;
- copies of the owning requirements or implementation design;
- routine changes without a durable tradeoff worth preserving.

The current rule stays in its owning guide, requirements, or design document. A decision record preserves reasoning and links to that authority.

## Reference over repetition

Use this rule whenever information could appear in more than one document:

> Define a fact once in the document that owns it. Everywhere else, reference the owning file, heading, requirement ID, scenario, contract, or task.

### Reference rules

- A Product Requirements Document owns requirement wording.
- A system design owns feature-wide architecture and shared invariants.
- A technical design owns slice-local interfaces and technical decisions.
- The technical design's [behavioral acceptance](#behavioral-acceptance) owns observable scenarios, whether expressed in Gherkin or a justified alternative.
- Technical contracts own internal preconditions, postconditions, and invariants.
- An implementation plan owns task dependencies and work order.
- Code tests own executable proof.

A short local summary is allowed when a reader cannot understand the current section without it. Label the summary as context, link to the authority, and do not introduce new normative wording.

An explicitly referenced, applicable parent constraint already governs the child document. Do not require a copied child rule or a new child requirement ID solely to repeat that constraint; use a reference for traceability and verification. Add a child-owned requirement only for a distinct feature-specific obligation, interpretation, or exception that the parent does not already define.

When an authoritative fact changes:

1. Update its owning document.
2. Check every reference to its identifier or heading.
3. Update dependent contracts only when the changed fact alters them.
4. Do not synchronize copied paragraphs because copied normative paragraphs should not exist.

## Requirement identifiers

Each feature defines one short identifier prefix and states its meaning once in that feature's Product Requirements Document.

The examples below use `EXPORT` for a document-export feature: a signed-in user requests a downloadable copy of a selected document.

Requirement identifiers use an opaque permanent sequence:

```text
EXPORT-001
EXPORT-002
EXPORT-003
```

Rules:

- Each individual requirement bullet receives one identifier.
- An identifier does not encode the requirement's story or category.
- Moving, reordering, or wording-preserving edits do not change the identifier.
- Retired identifiers are never reused.
- A genuinely new requirement receives the next unused number.
- Other documents reference the identifier rather than copying requirement text.

## Behavioral acceptance

For the full-feature workflow, Gherkin is the conscious default and normative home for behavior observable through a technical design's boundary. Choose an alternate notation only when it communicates that behavior more precisely, such as a state-transition table for a stateful protocol. Record why the alternate is clearer and keep all normative observable acceptance for that behavior in that single authoritative home; do not maintain an equivalent acceptance list beside it.

```gherkin
@EXPORT-001
Scenario: Export a selected document
  Given a signed-in user has selected one document
  When the user requests an export
  Then the system creates one downloadable export for that document
  And the export contains the document's current content
```

Use the clauses consistently:

- `Given` states persisted entry state or a user-visible precondition.
- `When` states one developer, user, or system action.
- `Then` states an observable result, state transition, artifact, or failure.

Do not use Gherkin for private implementation details such as a module name, database index, serializer library, or helper function.

## Technical contracts and verification

Use Design by Contract when an interface or state change has meaningful preconditions, postconditions, invariants, or partial-failure behavior. Use the obligation words defined by Request for Comments 2119 (RFC 2119) inside the contract.

```text
Contract: Atomic export creation

Preconditions
- The selected document MUST pass authorization and content validation.

Postconditions on success
- One export record and its durable output artifact MUST be committed.

Postconditions on failure
- No export record MAY reference a missing or partial output artifact.

Invariants
- A committed artifact reference MUST identify a durable body with the recorded hash.

Verification
- Inject a failure at each persistence boundary and assert the applicable postcondition.
```

Use a concise RFC 2119 statement without a full contract block when no useful precondition/postcondition relationship exists. A fixed file mode, hash format, or immutable identifier rule usually needs one normative statement and one verification criterion.

### RFC 2119 vocabulary

- `MUST` or `MUST NOT`: required for correctness, safety, or compatibility.
- `SHOULD` or `SHOULD NOT`: expected unless a documented exception justifies another choice.
- `MAY`: optional behavior with no implied requirement.

Do not capitalize ordinary prose for emphasis. Reserve these words for normative obligations.

## Recommended technical-design order

Use only the sections that apply, but preserve this reasoning order. Apply [the technical-writing standards](technical-writing-standards.md) when writing the sections; this guide assigns their place in the design rather than restating their writing rules.

1. **Status and parent contracts** — Name the owning documents and requirement IDs.
2. **Purpose, entry state, and exit state** — Bound the slice.
3. **Explicit non-goals** — State what will not be built.
4. **Rejection criteria and failure modes** — Define the edges before the happy path.
5. **Data-flow traces** — Show how concrete data moves and becomes durable.
6. **Concrete interfaces and data model** — Define signatures, commands, schemas, and guarantees.
7. **Tradeoff decisions** — Record benefits, accepted costs, and unresolved calls.
8. **Behavioral acceptance** — Define observable behavior in Gherkin by default, or record the justified alternate notation that is its sole authoritative home.
9. **Technical contracts and verification** — Define internal obligations with Design by Contract and RFC 2119.
10. **Handoff** — State the exact state available to the next slice.

## Full-feature workflow

The following steps apply to material product work. Use the [lightweight path](#lightweight-path-for-minor-changes) for a qualifying minor change instead.

### 1. Maintain product direction

Update `docs/product-vision.md` only when durable product direction changes. A feature may propose a vision change, but feature work does not silently rewrite the product vision.

### 2. Define one feature

Create `docs/features/<feature-name>/prd.md`. Assign permanent requirement IDs after the requirements are stable enough for technical design.

### 3. Decide whether to slice

Apply the slice criteria in this document. Record the decision and the independently testable handoff for every proposed slice.

### 4. Define feature-wide architecture when needed

For a large feature, create `system-design.md`. Define only architecture and contracts shared across slices, then map each requirement ID to an owning slice.

### 5. Write the technical design

Create one `tdd.md` for a small feature or one per slice for a large feature. Resolve every product, architecture, workflow, security, and dependency choice that changes the implementation contract.

### 6. Define acceptance and verification

Use Gherkin as the default notation for observable acceptance, or justify and name the single authoritative alternate notation. Add technical contracts for internal invariants and identify the verification that will prove each contract.

### 7. Approve the design

Resolve interface confidence according to [the technical-writing standards](technical-writing-standards.md#label-interface-confidence-in-ai-written-specifications) before approving the design. Resolve every `[NEEDS YOUR CALL]` decision and give every requirement an owner before creating the implementation plan; planned work must establish proposed interfaces before dependent tasks use them.

### 8. Create the implementation plan

Create `implementation-plan.md` from the approved technical design using the [implementation plan contract](#implementation-plan). Each task identifies its direct prerequisites and the scenario, contract, or technical criterion it implements.

### 9. Implement and verify

Build tasks in dependency order, run narrow checks while iterating, and exercise the actual changed surface. Finish with the repository's required verification command.

For subagent execution with an owned integration branch and isolated task worktrees, use [Orchestrate an implementation plan](../prompts/orchestrate-implementation-plan.md). The prompt owns the dispatch, validation, integration, and design-escalation procedure.

### 10. Close the milestone

Update document status, requirement coverage, and the learning log when the milestone creates a durable reusable lesson. Preserve superseded decisions through history rather than leaving conflicting current contracts.

## Review checklist

Before approving a Product Requirements Document:

- Every requirement has one permanent identifier.
- Requirements state product behavior rather than implementation.
- Non-goals and unresolved product choices are explicit.

Before approving a system design:

- It contains only feature-wide architecture and cross-slice contracts.
- Every slice has an independently testable entry and exit state.
- Every requirement ID maps to an owning slice.
- Shared security, state, and compatibility rules are explicit.
- Automated-worker authority rules are explicit when the feature includes automated workers.

Before approving a technical design:

- Parent contracts are references rather than copied text.
- It follows [the technical-writing standards](technical-writing-standards.md) for confidence annotations and the expression of mechanisms, interfaces, failures, non-goals, and tradeoffs.
- Observable behavior has one authoritative acceptance home.
- Internal invariants have testable technical contracts.
- Planned work establishes proposed interfaces before dependent tasks use them.

Before approving an implementation plan:

- Every task implements an approved scenario or technical contract.
- Tasks are ordered by their actual dependencies and independently verifiable.
- Direct prerequisite IDs form an acyclic graph and account for required outputs and hard ordering constraints.
- Tasks described as concurrent have compatible file ownership and shared contracts; optional diagrams or waves agree with the task dependencies.
- No task introduces a new product or architecture decision.
- Final tasks exercise the actual surface and run required repository verification.

For a minor change using the lightweight path:

- The existing owning document is updated when the changed fact or contract has one.
- The actual changed behavior is verified.
