# Product documentation process

This process keeps product intent, system architecture, technical design, and implementation work separate while preserving a traceable path from vision to verified code.

It governs document roles, hierarchy, and workflow. General developer-facing output follows [the communication policy](communication-policy.md); confidence labels and the rules for expressing mechanisms, interfaces, failures, non-goals, and tradeoffs follow [the technical-writing standards](technical-writing-standards.md). Those shared guides are authoritative for their subjects. Project-specific facts remain in the document that owns them; any deviation from shared guidance must name the affected rule, scope, reason, and replacement.

This is the full-feature workflow for material product work. The [lightweight path](#lightweight-path-for-minor-changes) applies to a minor fix or change that does not introduce a material product decision, cross-boundary technical contract, or independently planned delivery.

## Status

Active working agreement for new or revised product documentation.

Independent document reviews follow the shared rules in [document review](document-review.md).

## Governing principles

1. **One fact has one authoritative home.** Other documents reference that fact instead of copying it.
2. **Use the smallest document hierarchy that keeps boundaries clear.** Do not create slices, diagrams, or templates merely because the process permits them.
3. **Split work at independently testable handoffs.** A slice ends with observable or persisted state that the next slice can consume.
4. **Design precedes task decomposition.** An implementation plan divides decided work; it does not silently make product or architecture decisions.

## Documentation hierarchy

Product-level documents sit together at the root of `docs/` and apply to every feature. Each feature gets its own directory under `docs/features/`, shaped by whether it needs slices.

### Small feature

```text
docs/
├── product-vision.md
├── architecture.md
├── roadmap.md
└── features/
    └── <feature-name>/
        ├── prd.md
        ├── tdd.md
        └── implementation-plan.md
```

### Large feature

```text
docs/
├── product-vision.md
├── architecture.md
├── roadmap.md
└── features/
    └── <feature-name>/
        ├── prd.md
        ├── system-design.md
        └── slices/
            ├── 01-<slice-name>/
            │   ├── tdd.md
            │   └── implementation-plan.md
            └── 02-<slice-name>/
                └── tdd.md
```

Slice `02-<slice-name>` has no implementation plan yet because its technical design is not ready to build. Do not add `.md` to directory names; the directory supplies context, and stable filenames identify each document's role.

### Product level

`docs/product-vision.md` states the durable product direction. It applies across features and changes less often than feature requirements.

`docs/architecture.md` states the system-wide technical foundations every feature inherits: implementation language, frameworks, repository structure, tooling, and the technical concepts applied once across the system. It changes when a foundation decision changes, not when a feature ships.

`docs/roadmap.md` holds product ideas until they are ready for a document, the features in progress, and a log of finished features. See the [roadmap](#roadmap) contract.

### Feature level

Every full feature lives under `docs/features/<feature-name>/` and starts with `prd.md`, the Product Requirements Document. Use the small-feature shape unless the feature meets the [slice criteria](#when-a-feature-needs-slices); then use the large-feature shape. Create an implementation plan only when its technical design is approved and ready to build.

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

## Document contracts

### Product vision

**File:** `docs/product-vision.md`

**Purpose:** State why the product exists and what durable direction constrains every feature.

Use this title and top-level section order:

1. `# Product vision: <product>`
2. `## Status`
3. `## Vision`
4. `## Target users and underlying problems`
5. `## Product principles`
6. `## Product-wide boundaries and non-goals`
7. `## Durable success signals`
8. `## Constraints every feature must preserve`
9. `## Open decisions`, only when consequential vision-level decisions remain open.

**Contains:**

- document status and an existing revision identifier when one is used;
- a concise statement of why the product exists and the future it should create;
- durable target users and their underlying problems;
- product principles that guide choices across features;
- product-wide boundaries and non-goals;
- durable, observable success signals without time-bound targets;
- constraints that every feature must preserve;
- consequential open decisions whose resolution would change durable product direction.

In `Target users and underlying problems`, name who the product serves before describing exclusions or problems. Include an excluded audience only when it is a plausible subgroup or edge of the stated target and the distinction changes product direction; do not enumerate unrelated people the product was never intended to serve. Put broader product exclusions under `Product-wide boundaries and non-goals`.

The vision owns only product-wide facts intended to remain true when individual features, delivery sequence, interfaces, or implementation change. A feature Product Requirements Document (PRD) references applicable vision content instead of copying it, then owns its feature-specific users, problem, non-goals, requirements, acceptance intent, constraints, and product decisions. Evidence may follow the claim it supports; a separate evidence section is not required.

**Excludes:**

- feature-specific requirements, user stories, and acceptance criteria;
- ideas for future features and what comes next, which belong in the [roadmap](#roadmap);
- quantified or time-bound targets, releases, and milestones;
- implementation architecture;
- command, schema, interface, or module contracts;
- business-model, pricing, competitive-positioning, and go-to-market plans;
- task sequencing.

### System architecture

**File:** `docs/architecture.md`

**Purpose:** Fix the technical foundations every feature inherits, so no feature re-decides them.

**Contains:**

- status;
- externally imposed technical constraints that a feature must technically obey, such as a mandated language, runtime, platform, or organizational technical standard;
- the system boundary: the external systems this system depends on, what each of them owns rather than this system, and the integration mode;
- system-wide technology decisions: implementation language or languages, runtime, primary frameworks, and the core dependencies every feature builds on;
- the top-level decomposition approach and the repository structure it produces, naming each top-level directory's responsibility;
- boundaries — module, layer, and trust — and the dependency rule each one enforces, stated once;
- build, packaging, formatting, linting, and continuous-integration tooling, and the system's test-execution strategy;
- cross-cutting technical concepts applied once across the system, such as persistence approach, configuration, error and logging conventions, and observability;
- system-wide quality thresholds and the measurement regime that guards them, referenced to the configuration that owns the numbers;
- conventions adopted for the whole system, referenced to the standard, manifest, configuration, or lint rule that owns them rather than restated;
- a technology index with one row per system-wide choice: the choice's name, its status, its authority, and a link to the section that owns the rule; the index never restates a rule;
- proposed foundations awaiting the developer's approval, each marked as proposed with the option chosen and its tradeoff;
- current scope: facts every feature must obey today that are true of the present scope rather than foundations, each with the trigger that changes it, placed after the technology index and before open decisions;
- consequential open technical decisions whose resolution would change the system's foundations;

**Excludes:**

- product direction, users, problems, principles, product-wide boundaries, and success signals;
- requirement wording and product-level acceptance intent;
- feature-wide architecture, cross-slice invariants, slice dependency graphs, and requirement-to-slice mapping;
- slice-local interfaces, schemas, signatures, state transitions, and observable acceptance;
- task breakdown, work order, and per-task verification commands;
- rationale for a decision owned by another document;
- any component, technology, or structure that exists for exactly one feature;
- team composition, who reviews or implements, language fluency, hosting plan tiers, billing, vendor commercial terms, and operator identity; when the developer must know one, the revision report carries it.

A technical fact belongs here only when every feature must obey it. A choice that constrains more than one slice of a single feature belongs in that feature's system design; a choice contained in one slice belongs in that slice's technical design. A technology stays in the feature or slice document that introduced it until a second consumer appears or it constrains another feature's design; at that point promote the current rule here. A foundation survives the next feature; a fact that a named event will change — a host, a scale, an operator, a scope boundary — is current scope, not a foundation, and is recorded in the current-scope section with its trigger rather than as a decision.

This document states each current system-wide rule without a separate decision record. Preserve the reasoning beside a rule only when the reason is not obvious, and keep it as brief as possible. System-wide technical decisions are made here: establish what already exists, then research a missing or inadequate foundation and propose one for the developer's approval rather than leaving a blank. Mark a proposed foundation as proposed until the developer approves it, and never present an unapproved choice as established. Propose a change to an established foundation, with the evidence that motivates it, rather than rewriting it silently. Leave a foundation open only when research cannot settle it and the developer has not chosen.

**Altitude.** Each foundation is one rule a feature designer can obey, plus the file, configuration, or external page that owns its details. Record no configuration values, commands, SQL, ports, quotas, retention periods, or vendor defaults; cite the source that owns them. A fact belongs here only if a feature would have to re-decide it were the fact absent. Every rule appears exactly once, in the section that owns it; a section that needs it references that section. A proposal carries the one-sentence tradeoff the developer approves against; a settled rule carries a tradeoff only when the choice is not obvious. Confidence labels go only on the repository structure and conventions the document names, not on rules or prose. A rule's status lives in the technology index, not beside the rule; the document's own history, sources read, and approval record belong in the report that accompanies a revision, not in the document. Omit a content area with nothing system-wide to say. A rule is a sentence or a short paragraph; a table or list of values means the detail belongs in the file that owns it.

### Roadmap

**File:** `docs/roadmap.md`, created from the playbook's `templates/roadmap.md`. Every project has one, even while its sections are empty.

**Purpose:** Hold product ideas until they are ready for a document, show the features in progress, and log the features that are finished.

**Sections:**

- **Now:** features being worked on. Each names the feature, its start date, and a link to `docs/features/<feature-name>/` once that directory exists.
- **Next:** ideas likely to come next. Any level of detail.
- **Later:** ideas worth keeping. A single line is enough.
- **Done:** finished features, each with its name, start date, and finish date.

**Rules:**

- An item moves toward Now by judgement: when there is a need for it and the capacity to work on it. Only work actually in progress sits in Now.
- Items in Next and Later are deliberately loose. They may hold partial ideas, problem statements, and early requirements.
- When a feature's documents are created, the ideas that belong in them move out of the roadmap and into those documents. Drafting agents read the matching Now item as source material but do not edit the roadmap; the developer or the orchestrator trims it. Once the feature's documents exist, its Now entry keeps only a short summary, its start date, and the link to its feature directory.
- A dropped idea is deleted. A deferred one moves back to Later.

**Excludes:**

- decisions and `[NEEDS YOUR CALL]` tags;
- implementation order and how a feature is split into slices;
- planned delivery dates; a real external deadline may be noted on the item it affects;
- content that already lives in a created document.

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
- mapping from requirement IDs to owning slices;
- feature-wide technical decisions that span more than one slice.

**Excludes:**

- exact slice-local database columns;
- complete command flag lists;
- slice-local payload schemas;
- prompt text;
- private algorithms;
- implementation tasks;
- system-wide technology, repository structure, and cross-cutting technical conventions.

A rule belongs here only when multiple slices must obey it or when it defines the boundary between slices. A rule that exists entirely inside one slice belongs in that slice's technical design.

This document states each current feature-wide rule without a separate decision record. Preserve its reasoning beside the rule only when the reason is not obvious. A system-wide rule belongs in the [system architecture](#system-architecture) document instead.

**Altitude.** A shared rule is one sentence or a short paragraph naming the states, owner, and outcome at a boundary, plus the slice technical design that owns the mechanism inside it. A rule belongs here only if two or more slices would each have to re-decide it were it absent. Name the states a slice must persist or observe; do not describe how a slice reaches them. A table enumerates only slice handoffs, requirement ownership, or shared error classes; a table of external facts, per-item evidence, or values means the detail belongs in the owning slice's technical design, with only the invariant it produces kept here. A settled rule is stated without a decision tag; a tradeoff appears only when the choice is not obvious. Omit a content area with nothing cross-slice to say; an empty area is not a defect.

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

### Decisions

A settled decision is just the rule in the document that owns its scope; do not call it out as a decision or create a separate decision record. A system-wide technical rule belongs in the [system architecture](#system-architecture) document; a rule that spans more than one slice of a feature belongs in that feature's [system design](#feature-system-design); and a rule contained in one slice belongs in that slice's [technical design](#technical-design-document). A product-direction rule belongs in the [product vision](#product-vision), and a rule about one feature's promise belongs in its [Product Requirements Document](#feature-product-requirements-document).

When the reason for a settled rule is not obvious, preserve the reasoning beside it as briefly as possible; use more than one sentence when needed. An open decision is one that needs the developer's input or unfinished research. Put it in the owning document's open decisions and tag it `[NEEDS YOUR CALL]`. When a decision changes, revise the rule in place rather than leaving competing current readings.

Future product ideas that are not ready for a document live in the [roadmap](#roadmap) as ideas, not as decisions.

## Reference over repetition

Use this rule whenever information could appear in more than one document:

> Define a fact once in the document that owns it. Everywhere else, reference the owning file, heading, requirement ID, scenario, contract, or task.

### Reference rules

- A product vision owns durable product-wide users, problems, principles, boundaries, success signals, and constraints.
- A roadmap holds product ideas until they are ready for a document, the features in progress, and the log of finished features.
- A system architecture document owns system-wide technical foundations — implementation language, frameworks, repository structure, tooling, and cross-cutting technical conventions — and the system-wide technical decisions that produced them.
- A Product Requirements Document owns requirement wording.
- A system design owns feature-wide architecture, shared invariants, and decisions that span more than one slice of its feature.
- A technical design owns slice-local interfaces, technical decisions, and their rationale.
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

Start from the feature's roadmap item when one exists: move it to Now with its start date, and use its ideas as source material. Create `docs/features/<feature-name>/prd.md`. Assign permanent requirement IDs after the requirements are stable enough for technical design.

### 3. Decide whether to slice

Apply the slice criteria in this document. Record the decision and the independently testable handoff for every proposed slice.

### 4. Maintain system architecture

Check `docs/architecture.md` for system-wide foundations affected by the feature. Update it when a foundation changes; route feature-wide choices to the feature system design and slice-local choices to the applicable technical design.

### 5. Define feature-wide architecture when needed

For a large feature, create `system-design.md`. Define only architecture and contracts shared across slices, then map each requirement ID to an owning slice.

### 6. Write the technical design

Create one `tdd.md` for a small feature or one per slice for a large feature. Resolve choices contained within that small feature or slice that change its implementation contract. Route product choices to the product vision or PRD, system-wide choices to `docs/architecture.md`, and feature-wide choices to the feature system design.

### 7. Define acceptance and verification

Use Gherkin as the default notation for observable acceptance, or justify and name the single authoritative alternate notation. Add technical contracts for internal invariants and identify the verification that will prove each contract.

### 8. Approve the design

Resolve interface confidence according to [the technical-writing standards](technical-writing-standards.md#label-interface-confidence-in-ai-written-specifications) before approving the design. Resolve every `[NEEDS YOUR CALL]` decision and give every requirement an owner before creating the implementation plan; planned work must establish proposed interfaces before dependent tasks use them.

### 9. Create the implementation plan

Create `implementation-plan.md` from the approved technical design using the [implementation plan contract](#implementation-plan). Each task identifies its direct prerequisites and the scenario, contract, or technical criterion it implements.

Once the feature's documents exist, trim its roadmap Now entry to the short summary, start date, and link that the [roadmap](#roadmap) contract describes.

### 10. Implement and verify

Build tasks in dependency order, run narrow checks while iterating, and exercise the actual changed surface. Finish with the repository's required verification command.

For subagent execution with an owned integration branch and isolated task worktrees, use [Orchestrate an implementation plan](../prompts/orchestrate-implementation-plan.md). The prompt owns the dispatch, validation, integration, and design-escalation procedure.

### 11. Close the milestone

Update document status and requirement coverage. When the feature is finished, move it from the roadmap's Now section to Done with its finish date. When the milestone superseded a decision, revise it in its owning document as [Decisions](#decisions) describes rather than leaving conflicting current contracts.
