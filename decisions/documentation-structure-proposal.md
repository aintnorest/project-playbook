# PRD convergence documentation structure proposal

## Status

Historical decision record. The approved current guidance is [Product documentation process](../guides/product-documentation-process.md); the documented migration completed on 2026-09-04.

The discussion, comments, and responses below are preserved as decision history. Superseded filenames and migration wording are not current guidance.

## Purpose

Decide whether PRD convergence documentation should use:

- one feature-level System Design Document (SDD);
- one Technical Design Document (TDD) per implementation slice;
- Gherkin for slice-level behavioral acceptance;
- ordinary technical criteria for internal invariants;
- stable requirement identifiers to connect the documents without repeating requirement text.
<!--
[SDD - System Design Document]  ──────►  System Architecture, Boundaries, & Data Flow
        │
        ▼
[TDD - Technical Design Document] ───►  Specific Services, APIs, Schemas, & Code Logic
One part of the TDD would be Gherkin the TDD has to be clear enough that the DAG task list is just diving up the work. 
The SDD would just be really high level and the pieces that are between the slices.
-->
## Current structure

```text
docs/features/prd-convergence-workflow/
  prd.md
  sdd-overview.md
  slices/
    01-foundation/
      sdd.md
      DAG-task-list.md
    02-runner-resume-gates/
      sdd.md
    03-input-drafting-loop/
      sdd.md
    04-checks-feedback-review/
      sdd.md
    05-accept-export-fork/
      sdd.md
    06-codex-worker/
      sdd.md
```

The current `sdd-overview.md` already defines the workflow shape, shared invariants, slice boundaries, and story-level requirement coverage. It does not yet provide a complete feature-wide component, state, security, or runtime view.

The slice documents contain detailed interfaces, persistence rules, algorithms, commands, errors, and acceptance criteria. That content is closer to a Technical Design Document than a system-wide design document.

## Proposed source-of-truth model

| Document | Authoritative for | Excludes |
| --- | --- | --- |
| `prd.md` | Product problems, stories, requirements, non-goals, and acceptance intent | Architecture, schemas, Rust modules, and implementation order |
| `system-design.md` | Feature-wide architecture, components, state model, trust boundaries, runtime flow, shared invariants, and slice ownership | Exact slice schemas, flags, algorithms, and task lists |
| `slices/<slice>/tdd.md` | One slice's interfaces, data structures, algorithms, failure behavior, security decisions, entry state, and exit state | Restating the PRD or feature-wide architecture |
| TDD Gherkin | Observable behavior at the slice boundary | Internal implementation details |
| TDD technical verification | Hashes, database constraints, migrations, file modes, and failure injection | Product requirements already owned by the PRD |
| `implementation-plan.md` | Implementation tasks and dependency order | Product and architecture decisions |
| Code tests | Executable proof | Acting as the only documentation of behavior |
<!-- 
 sdd-overview would just be sdd.md
 is there another name in the industry for what i call a DAG task list?
-->
The governing rule would be:

> The PRD says what the product must do. The system SDD says how the feature works as a whole. A slice TDD says how one delivery boundary is implemented. Gherkin says what is observable at that boundary. Technical verification proves internal invariants. The DAG says in what order to build it.
<!--
This exactly
-->

## Decision 1: Role of the feature-level SDD

### Proposal

Keep one SDD at the feature root and expand it into the high-level system design for the complete PRD convergence feature.

It would own:

1. System context and external actors.
2. Major components and responsibility boundaries.
3. End-to-end control and data flow.
4. Feature-wide state and consistency model.
5. Trust and security boundaries.
6. Error, schema, template, and event versioning strategy.
<!-- for things that are across the entire feature if its only in a specific Slice im okay with that living in the TDD -->
7. Concurrency, locking, and recovery model.
8. Worker authority limits.
<!-- not sure what you have in mind here -->
9. Slice dependency graph and handoff states.
10. Requirement-to-slice ownership index.
<!-- how is this different than 9 -->

It would not own exact SQL columns, command flag lists, payload schemas, prompt contracts, or filesystem algorithms. Those remain in the owning slice TDD.

### Recommendation

Adopt this role. The existing overview is already the correct skeleton; it needs architectural views, not a second copy of slice details.

### Your comments / decision

Decision: Adopt the feature-level system design boundary described above.

Comments:

#### Response

Your description is the intended boundary: the system design stays high-level and owns architecture shared across slices plus the connections between slices. A concern that exists entirely inside one slice belongs in that slice's TDD.

Item 6 means only feature-wide compatibility rules belong in the system design; a slice-local event or schema detail remains in its TDD. “Worker authority limits” means the actions no model worker may perform anywhere in this feature: accept or waive for the developer, approve an export path, select billing/auth policy, or mutate product vision; provider-specific execution details remain in the Codex-worker TDD.

Items 9 and 10 answer different questions. The slice dependency graph records construction/runtime order and persisted handoffs—what must exist before another slice can operate—while the requirement ownership index maps product promises to accountable slices; they may sit beside each other but should not be merged into one ambiguous table.

## Decision 2: SDD filename

### Options

**Option A — Keep `sdd-overview.md`**

- Makes the document's high-level purpose explicit.
- Distinguishes it from slice TDDs.
- Slightly redundant once it is the only SDD in the feature directory.

**Option B — Rename it to `sdd.md`**

- Matches the stable-filename pattern used inside slice directories.
- The parent directory already supplies feature context.
- “SDD” must be understood as System Design Document.

**Option C — Rename it to `system-design.md`**

- Clearest to readers unfamiliar with the acronym.
- Breaks the short stable-filename convention.

### Recommendation

Use `system-design.md`; it is the clearest option and avoids another unexplained acronym.

### Your comments / decision

Decision: Use `system-design.md`.

Comments: earlier in a comment i said it should be sdd.md but i like the idea of clearest to readers. there are a lot of acronyms in what we do why not get rid of it. system-design is short and to the point.

#### Response

Accepted: `system-design.md` is clearer than either SDD filename and matches the goal of reducing acronym load. The document title will be “PRD convergence system design”; “SDD” disappears from both the filename and title.

## Decision 3: Rename slice SDDs to TDDs

### Proposal

Rename each slice `sdd.md` to `tdd.md` and title it as a Technical Design Document.

This makes the hierarchy explicit:

- system-level decisions belong to the feature SDD;
- concrete implementation decisions belong to slice TDDs.

Because TDD commonly also means test-driven development, each document's first heading should expand the term:

```text
# TDD 01: PRD convergence foundation

Technical Design Document
```

### Recommendation

Adopt the rename. The existing slice content already behaves like technical design, so this clarifies ownership without requiring a conceptual rewrite.

### Your comments / decision

Decision: Rename slice documents to `tdd.md`.

Comments:

#### Response

Accepted. The first heading will expand “Technical Design Document” so `tdd.md` is not mistaken for test-driven development.

## Decision 4: How Gherkin should be used

### Proposal

Use Gherkin only for externally observable slice behavior:

```gherkin
@PCW-001
Scenario: Start a run from a rough idea
  Given the repository has no existing Orch state
  When the developer starts the PRD convergence workflow with an idea
  Then Orch creates one active durable run
  And the idea is preserved as an immutable input artifact
  And the result identifies event sequence 1
```

A scenario describes:

- `Given`: persisted entry state or user-visible precondition;
- `When`: developer or system action;
- `Then`: observable output, state transition, artifact, or failure.

Gherkin should not describe private implementation choices such as a Rust module name, SQL index, serializer crate, or helper function.

### Recommendation

Make slice-boundary Gherkin normative: it replaces equivalent behavioral acceptance bullets rather than appearing beside duplicated prose.

Do not convert every technical criterion to Gherkin. Keep a separate `Technical verification` section for internal invariants.

### Your comments / decision

Decision: Adopt normative Gherkin for observable slice behavior.

Comments:

#### Response

Accepted. Normative Gherkin replaces equivalent behavioral bullets rather than being added beside them.

## Decision 5: Behavioral acceptance versus technical verification

### Proposed split

**Behavioral acceptance — Gherkin**

Examples:

- starting a run from an idea;
- starting from product vision only;
- rejecting missing primary input;
- blocking resume after an artifact hash mismatch;
- opening and answering a human gate;
- preventing export before acceptance.

**Technical verification — concise testable statements**

Examples:

- the frozen manifest produces its specified SHA-256 hash;
- grouped migrations roll back atomically;
- foreign keys reject cross-run references;
- RFC 8785 vectors pass;
- Unix artifact files use mode `0600`;
- a no-clobber publication primitive does not replace an existing file.

### Why not make everything Gherkin?

Forcing internal invariants into `Given/When/Then` adds ceremony but does not improve their meaning. It can also hide the distinction between user-observable behavior and implementation proof.

### Recommendation

Use the hybrid model: Gherkin for behavior and ordinary criteria for technical verification.

### Your comments / decision

Decision: Adopt Design by Contract structure with RFC 2119 obligation words as described below.

Comments: what do you think of doing a hybrid but for the Technical verification — concise testable statements we use RFC 2119 statements or DbC depending or the situation?

#### Response

Use RFC 2119 and Design by Contract together; they solve different problems rather than competing as alternatives.

- RFC 2119 words (`MUST`, `SHOULD`, `MAY`) express obligation and priority.
- Design by Contract structures an interface around preconditions, postconditions, invariants, and failure behavior.
- Gherkin describes behavior observable through the slice boundary.

Recommended technical format:

```text
Contract: Atomic run creation

Preconditions
- Every input MUST have passed size, encoding, and schema validation.

Postconditions on success
- One run, its artifact metadata, event 1, and checkpoint 1 MUST be committed.

Postconditions on failure
- No run metadata MAY be partially committed.

Invariants
- A committed artifact reference MUST identify a durable body with the recorded hash.

Verification
- Inject a failure at every write boundary and assert the applicable postcondition.
```

This makes the hybrid precise: use Design by Contract for interface and transactional invariants, with RFC 2119 keywords inside those contracts. Use concise RFC 2119 statements without a full contract block when no meaningful precondition/postcondition relationship exists, such as a fixed file mode or hash format.

## Decision 6: Stable requirement identifiers

### Problem

The PRD currently contains requirement bullets without stable identifiers. Slice documents can reference a heading and bullet position, but those references become ambiguous when requirements are reordered or edited.

Copying requirement text into the SDD, every TDD, Gherkin scenarios, and DAG tasks would create multiple sources of truth.

### Proposal

Give each PRD requirement a stable feature-scoped identifier, for example:

```text
PCW-001
PCW-002
PCW-003
PCW-004
PCW-005
PCW-006
```

Then use the identifiers as links:

- PRD owns the requirement text.
- SDD maps requirement IDs to components and slices.
- TDD declares the portion of each requirement it implements.
- Gherkin tags scenarios with requirement IDs.
- DAG tasks reference scenario tags or technical-verification identifiers.
- Tests may reuse IDs in test names without copying requirement prose.

### Recommendation

Add stable IDs before introducing Gherkin. This is the strongest protection against requirement restatement and traceability drift.

### Your comments / decision

Decision: Use permanent opaque identifiers in the form `PCW-001`.

Comments:

#### Response

Accepted. Requirement identifiers are added without rewriting requirement meaning and follow the permanent opaque taxonomy below.

Identifier rules:

- Each individual PRD requirement bullet receives one identifier.
- Existing identifiers never change when requirement text moves, is reordered, or is rewritten without changing meaning.
- Retired identifiers are never reused.
- A genuinely new requirement receives the next unused number.
- Documents reference the identifier rather than copying the requirement text.

## Decision 7: Name of the implementation DAG document

### Industry terms

- **Implementation plan** is the common software-engineering name for the document as a whole.
- **Dependency graph** describes the DAG inside the plan.
- **Work breakdown structure** is a project-management term, but usually emphasizes hierarchy rather than dependency edges.
- **Execution plan** is also common, but can imply deployment or runtime execution.

### Recommendation

Use `implementation-plan.md`. Give it a dependency-graph section and a task-list section; DAG is then the representation, not unexplained jargon in the filename.

### Your comments / decision

Decision: Use `implementation-plan.md`.

Comments:

## Proposed slice TDD structure

```text
# TDD 01: PRD convergence foundation

Technical Design Document

## Status
## Parent contracts
## Purpose and boundary
## Entry state
## Exit state
## Technical decisions
## Components and ownership
## Interfaces
## Data model
## Runtime flow
## Failure and recovery behavior
## Security and operational assumptions
## Behavioral acceptance
## Technical verification
## Handoff
```

`Parent contracts` should link rather than repeat:

```text
- Feature PRD: ../../prd.md
- System design: ../../system-design.md
- Owned requirements: PCW-001, PCW-002, ...
```

The exact sections may be omitted when they do not apply to a slice. This is a responsibility template, not a requirement to create empty headings.

### Your comments

Comments: how is this different from the previous just feels like an adendum to it.

#### Response

Agreed. This is not another independent decision; it is the concrete template produced by Decisions 3–5. In the next proposal revision it should move under the hybrid acceptance/verification decision or into a non-normative appendix, rather than read like an addendum requiring separate approval.

## Decision 8: Normalize slice directory names

### Proposal

Remove `.md` suffixes from slice directory names. A directory is a container, while `.md` identifies a Markdown file; mixing the two makes paths misleading and leaves the six slices inconsistent.

### Recommendation

Adopt the normalized directory names shown below if the documentation migration is approved.

### Your comments / decision

Decision: Adopted; slice directory names have been normalized.

Comments:

## Approved target directory shape

This is the approved migration target; the migration itself requires a separate implementation instruction.

```text
docs/features/prd-convergence-workflow/
  prd.md
  system-design.md
  documentation-structure-proposal.md
  slices/
    01-foundation/
      tdd.md
      implementation-plan.md
    02-runner-resume-gates/
      tdd.md
    03-input-drafting-loop/
      tdd.md
    04-checks-feedback-review/
      tdd.md
    05-accept-export-fork/
      tdd.md
    06-codex-worker/
      tdd.md
```

Four current slice directories end in `.md`: `02-runner-resume-gates.md/`, `04-checks-feedback-review.md/`, `05-accept-export-fork.md/`, and `06-codex-worker.md/`. Those directory names should be normalized if this proposal is adopted.

The existing documents also reference the old PRD path `docs/prd-prd-convergence-workflow.md`. The current source is `docs/features/prd-convergence-workflow/prd.md`; links should be updated as part of an approved migration rather than independently now.

### Your comments

Comments:

## Proposed migration order

All eight documentation-model decisions are resolved. Migration begins only on a separate implementation instruction.

When authorized:

1. Add stable requirement IDs to `prd.md` without changing requirement meaning.
2. Expand and rename the feature-level system design with shared architecture while replacing copied requirement text with ID references.
3. Verify the normalized slice directory names.
4. Rename slice `sdd.md` files to `tdd.md`.
5. Move shared architecture and invariants from TDDs to the feature system design, leaving references behind.
6. Convert behavioral acceptance bullets to Gherkin.
7. Express technical contracts with Design by Contract structure and RFC 2119 obligation words where appropriate.
8. Rename DAG task documents according to Decision 7 and reference TDD scenarios and technical-verification criteria.
9. Validate every internal link and requirement-to-slice mapping.

## Decision summary

| Decision | Approved choice | Status |
| --- | --- | --- |
| Feature system design owns complete high-level architecture | Adopt | Accepted |
| Root system-design filename | Use `system-design.md` | Accepted |
| Slice documents become TDDs | Use `tdd.md` | Accepted |
| Gherkin is normative for observable slice behavior | Adopt | Accepted |
| Technical verification combines Design by Contract with RFC 2119 | Adopt hybrid | Accepted |
| PRD receives stable requirement IDs | Use permanent `PCW-001` identifiers | Accepted |
| Implementation DAG document name | Use `implementation-plan.md` | Accepted |
| Normalize slice directory names | Adopt | Completed |

## Overall recommendation

Adopt the model with two guardrails:

1. Gherkin replaces duplicate behavioral acceptance prose; it does not accompany another restatement of the same behavior.
2. Technical invariants remain concise verification criteria rather than being forced into Gherkin.

This creates a clean progression from product intent to system architecture to slice implementation to executable work while preserving one authoritative location for each fact.
