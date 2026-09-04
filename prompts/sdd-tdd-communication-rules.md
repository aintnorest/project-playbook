# Guidelines for Slop-Free SDDs and TDDs

> Technical specs fail through **abstract architecture speak, fake rigor, and implicit assumptions** — not conversational fluff. These rules keep them grounded.

---

## 1. Ban "Hand-Wave" Verbs and Vague Connectors

Slop hides inside soft verbs that sound architectural but specify no mechanism.

- **Banned words:** `handles`, `processes`, `manages`, `orchestrates`, `coordinates`, `facilitates`, `integrates with`, `communicates with`
- **The rule:** Replace vague connectors with the exact mechanism, protocol, or state change.

| Bad | Good |
|-----|------|
| "The worker service handles incoming webhooks." | "The worker service parses JSON payloads from POST requests to `/webhooks` and writes valid events to the `queue_jobs` table." |

---

## 2. Define Boundaries by Failure Modes and Rejection Criteria

Rigor comes from defining what happens when things break — not just the happy path.

- **The rule:** Every component, endpoint, or interface must explicitly state:
  1. What inputs it rejects (validation failure).
  2. How it behaves when dependencies time out or crash (resilience / fallback).
  3. What state it leaves behind on partial failure (atomicity / cleanup).

---

## 3. No Abstract Components Without Concrete Interfaces

A box labeled "Manager" or "Processor" is slop unless tied to real software primitives.

- **The rule:** Every named box, module, or service must be accompanied by:
  - Exact API contract (gRPC proto, OpenAPI path, or function signature).
  - Exact data schema or DDL (SQL table layout, JSON schema, or struct).
  - Primary storage engine and persistence guarantee (e.g., "PostgreSQL with ACID transaction boundaries," not "Database layer").

---

## 4. Replace Noun-Stack Architecture with Data-Flow Traces

Complex systems are obscured behind long noun phrases (e.g., "the async distributed event processing pipeline dispatch engine").

- **The rule:** Trace a single unit of data from entry to storage instead of naming static hierarchy.
- **Structure technical sections as:** `Input Event → Transformation → State Change → Output / Side Effect`

---

## 5. Explicitly State "What We Are NOT Building"

TDD slop occurs when engineers design for hypothetical future scale or abstract generalization.

- **The rule:** Include a mandatory **"Explicit Non-Goals"** section. State what edge cases, scale targets, or optimizations are intentionally omitted in this implementation.

---

## 6. Convert Architectural "Justifications" into Concrete Tradeoffs

Technical slop presents a design choice as the single "best" or "modern" solution without acknowledging cost.

- **The rule:** Express every choice as an explicit tradeoff:

> *"We choose [Option A] over [Option B] because we prioritize [Advantage X] at the accepted cost of [Disadvantage Y]."*

---

## Rule Adaptation Matrix (PRD → SDD / TDD)

| Your PRD Rule | SDD / TDD Adaptation |
|---------------|----------------------|
| **Rule 4** — Unpack noun stacks | **Enforce Concrete Mechanisms:** Unpack noun stacks, but also require exact signatures, types, and file paths. Replace abstract verbs (`handles`) with state changes (`writes to DB`). |
| **Rule 5** — Point at things concretely | **Enforce Interface Contracts:** Require literal code symbols, SQL schemas, API routes, error codes, and configuration keys. No pseudo-code where concrete types exist. |
| **Rule 6** — Caveats & tradeoffs | **Enforce Failure Modes & Non-Goals:** Every technical section must explicitly state its operational assumptions, scale limits, and failure recovery path. |

---

## Confidence Annotation (AI-Generated Specs)

Every concrete interface in an AI-written spec must be labeled:

| Tag | Meaning |
|-----|---------|
| `[EXISTS]` | Already present in the codebase |
| `[PROPOSED]` | New in this design |
| `[ASSUMED]` | Needs verification |

---

## Recommended Section Order

1. **Explicit Non-Goals** — Bound the problem before solving it.
2. **Rejection Criteria & Failure Modes** — Define the edges.
3. **Data-Flow Traces** — Show how data moves through the system.
4. **Concrete Interfaces** — Attach exact contracts, schemas, and guarantees.
5. **Tradeoff Decisions** — Label each as `[DECIDED]` or `[NEEDS YOUR CALL]`.
