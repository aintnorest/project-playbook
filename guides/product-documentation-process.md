# Product documentation process

This process keeps product intent, system architecture, technical design, and implementation work separate while preserving a traceable path from vision to verified code.

## Status

Active working agreement for new or revised product documentation.

## Governing principles

1. **One fact has one authoritative home.** Other documents reference that fact instead of copying it.
2. **Use the smallest document hierarchy that keeps boundaries clear.** Do not create slices, diagrams, or templates merely because the process permits them.
3. **Split work at independently testable handoffs.** A slice ends with observable or persisted state that the next slice can consume.
4. **Design precedes task decomposition.** An implementation plan divides decided work; it does not silently make product or architecture decisions.
5. **Write for the reader.** Prefer plain, stable names over acronyms and internal shorthand.
6. **State mechanisms, failures, and tradeoffs.** Do not substitute architectural vocabulary for a concrete contract.

## Documentation hierarchy

```text
Product vision
  └── Feature
      ├── Product requirements document
      ├── Technical design                         # small feature
      └── System design                            # large feature
          └── Slices
              ├── Technical design
              └── Implementation plan
```

### Product level

`docs/product-vision.md` states the durable product direction. It applies across features and changes less often than feature requirements.

### Feature level

Every material feature lives under `docs/features/<feature-name>/` and starts with `prd.md`, the Product Requirements Document. A small feature may add one `tdd.md` and one `implementation-plan.md` at the feature root.

### Large-feature level

A feature that needs slices adds `system-design.md` at the feature root and a numbered directory for each slice. Each slice owns a `tdd.md` and receives an `implementation-plan.md` only when its technical design is approved and ready to build.

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
- actions that automated workers may never perform for the developer;
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
- normative Gherkin scenarios for observable behavior;
- technical contracts and verification criteria;
- handoff state for the next slice.

**Excludes:**

- copied product requirement text;
- copied feature-wide architecture;
- work breakdown and dependency order;
- speculative generalization for unapproved future features.

### Implementation plan

**File:** `implementation-plan.md`

**Purpose:** Divide an approved technical design into dependency-ordered, independently verifiable tasks.

**Contains:**

- a directed acyclic dependency graph;
- stable task identifiers;
- dependency edges;
- exact file and symbol targets;
- the contract each task implements;
- observable acceptance for each task;
- narrow verification commands;
- parallel execution waves and shared merge boundaries;
- explicit decision gates for any approved conditional choice.

**Excludes:**

- new architecture decisions;
- new product behavior;
- copied requirements or technical design sections;
- placeholders that appear complete but leave behavior unimplemented.

If task decomposition reveals an unresolved design choice, stop and update the owning Product Requirements Document, system design, or technical design before continuing. Do not bury a design decision inside a task.

### Code tests

Code tests provide executable proof for behavior and technical contracts. They reference requirement IDs, scenario names, or technical contract names; they do not become the only place where the contract is explained.

### Learning log

`docs/learning-log.md` records durable lessons and decisions worth carrying across features. Do not copy feature-local design details into it; reference the owning document and record only the reusable lesson.

## Reference over repetition

Use this rule whenever information could appear in more than one document:

> Define a fact once in the document that owns it. Everywhere else, reference the owning file, heading, requirement ID, scenario, contract, or task.

### Reference rules

- A Product Requirements Document owns requirement wording.
- A system design owns feature-wide architecture and shared invariants.
- A technical design owns slice-local interfaces and technical decisions.
- Gherkin owns the slice's observable acceptance scenarios.
- Technical contracts own internal preconditions, postconditions, and invariants.
- An implementation plan owns task dependencies and work order.
- Code tests own executable proof.

A short local summary is allowed when a reader cannot understand the current section without it. Label the summary as context, link to the authority, and do not introduce new normative wording.

When an authoritative fact changes:

1. Update its owning document.
2. Check every reference to its identifier or heading.
3. Update dependent contracts only when the changed fact alters them.
4. Do not synchronize copied paragraphs because copied normative paragraphs should not exist.

## Requirement identifiers

Each feature defines one short identifier prefix. The PRD convergence workflow uses `PCW`; the full meaning is stated once in that feature's Product Requirements Document.

Requirement identifiers use an opaque permanent sequence:

```text
PCW-001
PCW-002
PCW-003
```

Rules:

- Each individual requirement bullet receives one identifier.
- An identifier does not encode the requirement's story or category.
- Moving, reordering, or wording-preserving edits do not change the identifier.
- Retired identifiers are never reused.
- A genuinely new requirement receives the next unused number.
- Other documents reference the identifier rather than copying requirement text.

## Behavioral acceptance with Gherkin

Gherkin is normative in a technical design when it describes behavior observable through that design's boundary.

```gherkin
@PCW-001
Scenario: Start a run from a rough idea
  Given the repository has no existing Orch state
  When the developer starts the PRD convergence workflow with an idea
  Then Orch creates one active durable run
  And the idea is preserved as an immutable input artifact
```

Use the clauses consistently:

- `Given` states persisted entry state or a user-visible precondition.
- `When` states one developer or system action.
- `Then` states an observable result, state transition, artifact, or failure.

Do not use Gherkin for private implementation details such as a Rust module name, database index, serializer crate, or helper function. Do not retain an equivalent behavioral acceptance list beside the scenarios; the scenarios replace it.

## Technical contracts and verification

Use Design by Contract when an interface or state change has meaningful preconditions, postconditions, invariants, or partial-failure behavior. Use the obligation words defined by Request for Comments 2119 (RFC 2119) inside the contract.

```text
Contract: Atomic run creation

Preconditions
- Every input MUST have passed size, encoding, and schema validation.

Postconditions on success
- One run, its artifact metadata, first event, and first checkpoint MUST be committed.

Postconditions on failure
- No run metadata MAY be partially committed.

Invariants
- A committed artifact reference MUST identify a durable body with the recorded hash.

Verification
- Inject a failure at every write boundary and assert the applicable postcondition.
```

Use a concise RFC 2119 statement without a full contract block when no useful precondition/postcondition relationship exists. A fixed file mode, hash format, or immutable identifier rule usually needs one normative statement and one verification criterion.

### RFC 2119 vocabulary

- `MUST` or `MUST NOT`: required for correctness, safety, or compatibility.
- `SHOULD` or `SHOULD NOT`: expected unless a documented exception justifies another choice.
- `MAY`: optional behavior with no implied requirement.

Do not capitalize ordinary prose for emphasis. Reserve these words for normative obligations.

## Confidence annotations for specifications written by artificial intelligence

Every concrete interface proposed by a specification written by artificial intelligence carries one of these labels:

| Tag | Meaning |
| --- | --- |
| `[EXISTS]` | Verified in the current codebase. |
| `[PROPOSED]` | New interface introduced by the design. |
| `[ASSUMED]` | Believed to exist or behave as stated but still needs verification. |

Apply the tag to the interface declaration, schema, command, function signature, or section that introduces it. Do not label general explanation or repeat the same tag on every sentence beneath one clearly labeled contract.

An `[ASSUMED]` interface is an unresolved prerequisite. Verify it before implementation or convert it into an explicit decision; do not build load-bearing behavior on the assumption.

## Communication policy

This policy applies to final messages, explanations, summaries, and standalone documents written for the developer, including Product Requirements Documents, system designs, technical designs, implementation plans, reports, and decision records. It does not apply to code or internal reasoning; reasoning may take as much space as correctness requires, but that does not loosen these output rules.

1. **Open with the outcome.** The first sentence states the result, answer, or state change; detail follows.
2. **Size the response to the answer, not the question.** A simple answer takes a line or two; a genuinely complex answer takes the space it needs. Padding and restating the request are prohibited, not depth.
3. **Use at most three sentences per point.** Split larger material into separate labeled points.
4. **Use plain words and one stable name for each thing.** Expand an acronym the first time it appears, unpack noun phrases longer than three words, and omit cheerleading, hedging, filler, and commentary about the request.
5. **Point to concrete things and explain non-obvious names.** Use a file and line, exact command, actual error, symbol, flag, or configuration key; add one clause explaining its purpose when the name is not self-explanatory.
6. **Preserve caveats, tradeoffs, and uncertainty.** Put unresolved items in a final `Caveats / needs your call` line only when that line would be non-empty; state any skipped verification there.
7. **Match structure to content.** Use prose for one or two items, a list for three or more, and headings only when the response has three or more sections. Do not fill a template for its own sake.
8. **Locate multi-step work.** State the current stage and next stage; when detail does not fit, give the short form and name the document that owns the rest.

## Rules for clear system and technical designs

Technical specifications fail through abstract architecture language, fake rigor, and hidden assumptions. Apply the following rules to `system-design.md` and every `tdd.md`.

### Replace vague verbs with mechanisms

Do not use these verbs as substitutes for a contract:

```text
handles
processes
manages
orchestrates
coordinates
facilitates
integrates with
communicates with
```

Name the mechanism, protocol, validation, state change, and output instead.

| Vague | Concrete |
| --- | --- |
| “The worker service handles incoming webhooks.” | “The worker service parses JavaScript Object Notation (JSON) from `POST /webhooks` and writes valid events to `queue_jobs`.” |

### Define boundaries through failure behavior

Every component, endpoint, command, and interface states:

1. Inputs it rejects and the returned failure.
2. Behavior when a dependency times out, rejects work, or exits unexpectedly.
3. State left behind after interruption or partial failure.
4. Retry, cleanup, or repair ownership.

### Attach concrete interfaces to components

Every named component or service points to the applicable concrete primitive:

- function or trait signature;
- command and flags;
- web route or remote-procedure endpoint;
- JSON or other payload schema;
- database table definition;
- primary storage engine and transaction guarantee.

Use `[PROPOSED]` when the primitive does not yet exist and `[ASSUMED]` only until it can be verified. A component without an interface is an unresolved idea, not an implementation-ready design.

### Explain data flow instead of naming hierarchy

Trace one unit of data through the system:

```text
Input → validation or transformation → state change → output or side effect
```

Name the concrete representation at every boundary. State where ownership transfers, what becomes durable, and what can still be rolled back.

### State explicit non-goals

Every technical design includes an `Explicit non-goals` section. Name scale targets, edge cases, generalizations, and optimizations intentionally omitted from the slice.

### State tradeoffs rather than declaring a best choice

Use this form for a meaningful design choice:

> We choose Option A over Option B because we prioritize Advantage X at the accepted cost of Disadvantage Y.

Mark the result `[DECIDED]` or `[NEEDS YOUR CALL]`. Do not hide a cost because one option is common or modern.

## Recommended technical-design order

Use only the sections that apply, but preserve this reasoning order:

1. **Status and parent contracts** — Name the owning documents and requirement IDs.
2. **Purpose, entry state, and exit state** — Bound the slice.
3. **Explicit non-goals** — State what will not be built.
4. **Rejection criteria and failure modes** — Define the edges before the happy path.
5. **Data-flow traces** — Show how concrete data moves and becomes durable.
6. **Concrete interfaces and data model** — Define signatures, commands, schemas, and guarantees.
7. **Tradeoff decisions** — Record benefits, accepted costs, and unresolved calls.
8. **Behavioral acceptance** — Define observable behavior with normative Gherkin.
9. **Technical contracts and verification** — Define internal obligations with Design by Contract and RFC 2119.
10. **Handoff** — State the exact state available to the next slice.

## End-to-end process

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

Replace observable acceptance prose with normative Gherkin. Add technical contracts for internal invariants and identify the verification that will prove each contract.

### 7. Approve the design

Confirm that every `[ASSUMED]` interface is verified or explicitly accepted, every `[NEEDS YOUR CALL]` decision is resolved, and every requirement has an owner. Do not create an implementation plan before this point.

### 8. Create the implementation plan

Create `implementation-plan.md` from the approved technical design. Every task references the scenario, contract, or technical criterion it implements.

### 9. Implement and verify

Build tasks in dependency order, run narrow checks while iterating, and exercise the actual changed surface. Finish with the repository's required verification command.

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
- Shared security, state, compatibility, and worker-authority rules are explicit.

Before approving a technical design:

- Parent contracts are references rather than copied text.
- Interfaces use `[EXISTS]`, `[PROPOSED]`, or `[ASSUMED]` accurately.
- Rejected inputs, dependency failures, and partial state are defined.
- Data flows name concrete representations and state changes.
- Tradeoffs state both the benefit and accepted cost.
- Observable behavior appears once as normative Gherkin.
- Internal invariants have testable technical contracts.
- Explicit non-goals prevent speculative implementation.

Before approving an implementation plan:

- Every task implements an approved scenario or technical contract.
- Dependencies form a directed acyclic graph.
- Parallel tasks have separate file ownership or a named merge boundary.
- No task introduces a new product or architecture decision.
- Final tasks exercise the actual surface and run required repository verification.
