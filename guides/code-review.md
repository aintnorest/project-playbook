# Code review contract

This contract governs the TypeScript, Rust, and Tauri review prompts. Assess good, maintainable code in its actual context, not idealized architecture or only executable bugs.

## Scope and evidence

1. Establish the requested technology, paths/component, and candidate identity. An explicit diff/base-target request is a change review: report issues introduced or materially worsened by that change, including affected unchanged callers, not unrelated existing debt; otherwise review the supplied current snapshot without inventing a baseline.
2. If no paths are supplied, map the repository and review its first-party code for the selected technology, excluding unrelated languages, vendored dependencies, and generated output as independent review targets. State the actual files/components and revision or working-tree state covered; do not claim comprehensive coverage of unread code or turn a language review into a repository-wide audit.
3. Read applicable instructions, relevant configuration, enclosing code, direct callers, existing tests, and contracts before judging a candidate issue. Cross into another language only through an actual API, serialization, foreign-function, IPC, lifecycle, or build connection needed to assess the target; stop when that contract is understood, and report a connected mismatch as one boundary finding rather than unrelated findings about foreign internals.
4. Ground version-sensitive claims in the installed toolchain/dependencies and applicable documentation. With missing source or configuration, finish supported checks and name the precise coverage limit or question; absence of supplied evidence is not a defect or proof of safety.

## Review standard

Prioritize correct behavior, explicit ownership, cohesive responsibilities, understandable control/data flow, stable boundaries, localized changes, and useful failure contracts. Look for duplicated authoritative decisions, leaked implementation details, hidden ordering obligations, misleading contracts/names, and abstractions that add more coupling than they remove; similarity, function length, or a preferred pattern alone is not evidence.

A maintainability finding need not demonstrate a current runtime failure or violate a written rule. Show a concrete present burden in understanding, changing, testing, or owning the inspected code—such as one policy requiring synchronized edits—and explain why the proposed correction improves it at an acceptable cost.

Check existing guarantees and accepted tradeoffs before alleging missing validation, error handling, cleanup, or tests. Prefer the smallest useful correction; do not demand new frameworks, libraries, schemas, traits, generic layers, retries, immutability, or migrations merely because they are possible, and do not weaken requirements to simplify the code.

**Assess test effectiveness.** Review tests as evidence of observable behavior, failure paths, invariants, and boundaries, not by count or coverage percentage; identify tests that would still pass under a concrete, plausible violation of the behavior they claim to protect. Look for weak or circular assertions, mocks that replace the behavior under review, ineffective asynchronous/error checks, and assertions that pin implementation details without a contractual reason; explain the missed defect or concrete maintenance burden and the smallest useful correction, which may be strengthening, replacing, or removing a test.

A legitimate smoke test need not prove full functionality, and mocks or interaction assertions can protect real contracts; judge the test's intended scope and other coverage before alleging a gap. Ask what plausible regression the test would catch, but do not mutate code, introduce a mutation-testing framework, or execute checks without authorization; distinguish reasoned failure sensitivity from an observed test failure.

**Check for unused and obsolete code.** Look for unused declarations, exports, modules, unreachable branches, and superseded paths within the requested review scope. Establish reachability through supported entry points, consumers, registration, generated code, and configurations before recommending removal; no local references or a tool warning alone is not proof, and uncertain external use is a coverage limit rather than proven dead code.

Performance concerns need an actual unnecessary cost or applicable workload, not hypothetical scale; distinguish correctness defects from contextual design recommendations and leave equally sound alternatives alone.

## Read-only operation

Do not edit files, apply fixes, generate code, install/update dependencies, mutate Git state, or launch an implementation workflow. Static review is the default; run only requested or already authorized narrow checks after inspecting the commands and their effects, never automatic fix modes or unrelated suites, and distinguish execution evidence from reasoning or proposed verification.

## Report

Open with the target technology, candidate identity, change/snapshot mode, and supported finding count. Give concise coverage of target code and connected context inspected, then findings in impact order; zero findings is valid and is not certification or approval.

Each finding includes a stable ID such as `R1-F1`, precise path/line or symbol, category (`correctness` or `maintainability`), observed evidence and contract or engineering rationale, concrete consequence, and the smallest corrective direction with any meaningful tradeoff. Do not fabricate line numbers, reproductions, approvals, or commands; retain supplied IDs on follow-up and merge only the same underlying issue and correction.

For code reviews, use `Blocker` for a demonstrated issue preventing safe use or integration, `Major` for a material behavior risk or substantial maintenance burden, and `Minor` for a bounded actionable defect without those consequences. Judge by impact, not confidence, keyword presence, or review category; optional polish and unsupported concerns do not become Minor findings.

Finish with checks actually run or not run and specific questions or coverage limits when needed. No praise padding, scores, issue quotas, exhaustive checklist recitals, speculative rewrites, or claims of whole-application safety; separate uncertainty from supported findings.
