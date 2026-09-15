# Code assurance workflow

This workflow evaluates a repository, branch, commit range, or stable workspace with deterministic tools and independent model-assisted reviews, turns the resulting evidence into a bounded set of findings, and verifies accepted remediations without starting an endless review loop.

## Status

**Work in progress. Do not use.** This document is unfinished and is not active shared guidance. It does not authorize changes to integrations, prompts, consumer repositories, or enforcement policy, and it is not ready to drive an assessment in any repository.

It is incomplete in a way that blocks use: it makes an external runner mandatory but no runner exists, its assurance methods name no tools, commands, or thresholds, and no repository has run it once. See [open direction notes](#open-direction-notes) for the intended way forward before extending or adopting it.

The playbook README lists the active guides and this file is not among them, while a consumer installation copies `guides/` recursively. An installed copy may therefore contain this draft. Its `MUST` and `MUST NOT` obligations use the [RFC 2119 vocabulary](product-documentation-process.md#rfc-2119-vocabulary) and bind a consuming repository only after the README links this guide as active and a release note names its consumer impact.

## Scope

Use this workflow for a deliberate code-health assessment after a bounded implementation, before a release, at a material architecture milestone, or on an explicitly scheduled audit. It covers:

- externally controlled execution of machine checks and model-assisted reviews;
- exact assessment identity and reproducible evidence;
- parallel execution and failure handling;
- finding triage, disposition, and remediation planning;
- targeted verification and explicit closure;
- the boundaries among a runner, mise, Git hooks, continuous integration (CI), and model providers.

This is not the ordinary inner development loop. Repository-required builds, tests, formatting, and other acceptance checks still run at the cadence defined by the consuming project. A minor change does not need a deep assurance assessment merely because this workflow exists.

The [communication policy](communication-policy.md) applies to reports and developer-facing output. Existing code-review prompts remain governed by the [code review contract](../prompts/README.md#code-review-contract).

## Governing principles

The list below summarizes the reasoning behind the sections that follow. It is context, not a second source of obligations; each requirement lives in the linked section.

1. **The model is a reviewer, not the enforcement boundary.** An external runner decides what must run, invokes it, records its result, and detects missing work — see [trust and enforcement boundary](#trust-and-enforcement-boundary).
2. **Required execution is not required agreement.** Requiring a check to execute does not turn every warning, mutation survivor, metric, or model suggestion into a defect — see [check classes and acceptance semantics](#check-classes-and-acceptance-semantics).
3. **Assess an exact candidate.** A path or branch name alone is not a stable revision — see [assessment identity](#assessment-identity).
4. **Freeze discovery before remediation.** A broad assessment produces a bounded finding set that remediation verifies — see [findings and discovery freeze](#findings-and-discovery-freeze) and [verification without rediscovery](#verification-without-rediscovery).
5. **Evidence remains inspectable.** Prioritization never replaces, edits, or hides raw check and review results — see [synthesis](#synthesis).
6. **The developer ends the cycle.** Completion depends on disposition, verification, and explicit approval rather than a zero-finding report — see [closure](#closure).
7. **Keep shared policy tool-neutral.** Each consuming repository owns its tools, commands, thresholds, provider adapters, and justified exceptions — see [integration responsibilities](#integration-responsibilities).

## Trust and enforcement boundary

A prompt can request a command or review, but it cannot guarantee that the request was followed. A repository-owned process outside the model must control the assessment.

### External runner

The external runner MUST:

1. establish the candidate and comparison baseline before starting work;
2. resolve the configured assessment profile without model judgment;
3. invoke every required check and reviewer itself;
4. limit concurrency according to declared dependencies and shared resources;
5. capture commands, prompt identities, outputs, exit states, failures, and coverage limits;
6. reject a required result that is absent, timed out, malformed, or produced for the wrong candidate;
7. preserve raw results and write a complete run manifest;
8. leave acceptance to the configured gate policy and explicit developer decisions.

The runner MUST NOT accept a model statement such as “tests passed” in place of the captured result of the test process. It MUST NOT allow a synthesis model to decide that an omitted required check was unnecessary.

A runner may be a repository script or a dedicated application. A task runner such as mise may expose it, but a collection of task aliases without run identity, result capture, and failure accounting does not satisfy this contract.

### Model-assisted reviewer

A model-assisted reviewer examines the assigned candidate and returns findings. It is untrusted for enforcement: the runner guarantees invocation and captures its output, while the review remains probabilistic and evidence must be judged on its merits.

A provider adapter MUST define:

- the executable and non-interactive invocation mode;
- authentication expectations without recording credentials;
- the exact prompt source and revision;
- repository, baseline, candidate, technology, and scope inputs;
- filesystem, network, tool, and mutation permissions;
- timeout, cancellation, and concurrency limits;
- the required output shape and artifact destination;
- failure behavior for rate limits, unavailable subscriptions, invalid output, or provider errors.

Provider-specific commands belong in the consuming repository. Shared guidance must not assume that a Claude, Codex, or other subscription permits unattended execution, parallel sessions, a particular sandbox, or stable command-line flags.

### Synthesis

Synthesis reconciles raw results into a candidate finding set. It may be performed by a model, a developer, or both. A synthesis model MUST receive the run manifest and all in-scope results, retain source finding identifiers, distinguish evidence from recommendation, and report coverage limits.

Synthesis MUST NOT delete raw artifacts, silently omit a source finding, convert every diagnostic into a requirement, or approve the assessment. When it merges duplicates, it retains every source identifier and any distinct evidence or consequence.

## Assessment identity

Before execution, identify:

- repository identity and assessment profile;
- baseline revision, when assessing a change;
- candidate revision or immutable snapshot;
- included paths, components, languages, and generated-code policy;
- governing requirements, designs, decisions, and local exceptions;
- tool and reviewer configuration revisions;
- required, advisory, and unavailable checks.

For a committed branch, prefer immutable commit identifiers and a concrete base-to-candidate range. A branch assessment ordinarily reports issues introduced or materially worsened by that range while reading affected unchanged code when needed to judge the change.

A dirty workspace is not immutable. The runner MUST either create an isolated snapshot or record a content identity and fail the run if assessed files change before completion. It MUST NOT present results from a moving workspace as if they cover its final state.

Changing the candidate after discovery does not invalidate the original evidence; it creates a remediation candidate that must be related back to the assessed baseline and frozen findings.

## Assessment profiles and triggers

A consuming repository should define the smallest profiles that match its risk and feedback needs. The following names are illustrative rather than required:

| Profile | Typical trigger | Intended contents | Expected duration |
| --- | --- | --- | --- |
| `verify:fast` | Local coherent edit or pre-commit | Formatting check, lint, type check, narrow tests, secrets | Short enough for frequent use |
| `verify:branch` | Returned task, checkpoint, or pre-push | Required tests, architecture rules, change-focused static analysis | Bounded developer feedback |
| `assess:deep` | Completed branch, release candidate, milestone, or scheduled audit | Branch verification plus selected metrics, mutation, fuzzing, and model reviews | Deliberate assessment |

A conceptual statement such as “implementation is done” is not an enforceable trigger. Use an observable lifecycle event:

- a controlled coding process exits;
- a task worktree is returned for acceptance;
- a checkpoint commit is created;
- a push occurs;
- a pull request enters review or a merge queue;
- a release candidate is cut;
- a developer starts a named assessment;
- a scheduled audit begins.

A local process wrapper can run an assessment after Claude, Codex, or another coding process exits. This is effective only when work starts through that wrapper. Git hooks provide local feedback but remain bypassable. CI and protected-branch required checks provide the authoritative merge boundary when the hosting environment supports them.

## Check classes and acceptance semantics

Classify every configured activity before running it. The class determines whether a result blocks, informs, or proposes work.

### Hard gates

A hard gate expresses an adopted repository obligation with an objective outcome. Examples include:

- required build and test commands;
- compiler and type errors;
- explicitly selected static-analysis rules;
- machine-enforced architectural boundaries;
- forbidden dependency, license, or secret findings;
- sanitizer failures or reproducible fuzz crashes;
- adopted coverage or quality regression limits.

A required hard gate MUST complete successfully for closure unless the developer explicitly waives that result with its scope and reason. Tool failure, unavailable infrastructure, and an actual negative result are distinct states; absence of a result is not a pass.

### Comparative diagnostics

A comparative diagnostic measures risk or test strength without proving a defect by itself. Examples include:

- Change Risk Anti-Patterns (CRAP) scores;
- cyclomatic or cognitive complexity;
- line, branch, or condition coverage;
- mutation score and surviving mutations;
- warning counts;
- fuzzing corpus growth and exercised paths.

Define the intended comparison before execution: absolute threshold, no regression from baseline, changed-code limit, selected target improvement, or informational baseline. Do not retroactively choose whichever interpretation makes the candidate pass or fail.

A metric becoming numerically better does not prove that behavior or design improved. A metric becoming worse is not automatically a defect when the accepted change justifies the cost. Record the evidence and evaluate the affected contract.

### Open-ended reviews

Model-assisted code, architecture, security, and maintainability reviews are open-ended. Their execution and coverage report may be required, but their finding count is not a hard gate.

A supported finding identifies the candidate, exact location, evidence or violated contract, practical consequence, severity, and smallest useful correction or decision. Style preference, an equally sound alternative, or the possibility of additional abstraction is not sufficient.

Independent reviews may run concurrently when they receive the same candidate and governing context. Do not expose one reviewer's verdict to another reviewer claimed to be independent. Agreement is not proof, and disagreement is resolved through evidence and governing decisions rather than provider reputation or vote count.

## Assurance methods

The consuming repository selects methods that apply to its language, architecture, risk, and available infrastructure. Do not configure a method solely to make the assessment appear comprehensive.

### Static analysis

Use static analysis for language- or framework-specific defects that can be identified without executing the complete application. Separate fast adopted rules from expensive or experimental analyzers. Pin applicable configuration and tool versions, record exclusions, and distinguish warnings introduced by the assessed change from existing repository debt.

Auto-fix modes MUST NOT run during a read-only assessment. A proposed remediation may use them only under the repository's normal change and review process.

### Architectural boundary checks

Prefer executable boundary rules when the architecture contains meaningful forbidden dependencies, ownership restrictions, layering, module visibility, or interface constraints. Each rule should reference the design or repository policy it enforces and report the actual dependency path or boundary violation.

Directory shape alone is not architecture. Do not introduce a boundary checker until the intended boundary and allowed exceptions are defined.

### CRAP and related complexity measures

The CRAP metric combines method complexity with test coverage to identify code that may be risky to change. It is a prioritization signal, not a complete measure of code quality.

A CRAP assessment records:

- the complexity definition and coverage source;
- the unit being scored, such as function or method;
- treatment of generated, unreachable, platform-specific, and test code;
- baseline and candidate scores when a change comparison is intended;
- changed units and high-risk unchanged dependencies in scope;
- the threshold or selection policy established before the run.

Prefer change-focused regression limits or named improvement targets over an unexplained repository-wide demand for uniformly low scores. Added tests that execute lines without defending observable behavior may lower the score without reducing real risk.

### Mutation testing

Mutation testing evaluates whether tests fail when controlled changes are introduced into the program. A surviving mutation is evidence that the test suite did not distinguish that mutation; it is not automatically a product defect or a requirement for another test.

Record the mutation operators, target paths, baseline, time budget, excluded code, killed and surviving mutations, timeouts, and tool errors. For branch assessment, prefer changed modules, critical contracts, or selected survivors over an unbounded whole-repository run. Full mutation campaigns may be scheduled separately.

Remediation acceptance should name the survivors or behavior boundaries it intends to address, or use a predeclared non-regression threshold. Do not require a perfect mutation score without a project-specific reason.

### Fuzzing

A branch assessment may run existing fuzz targets for a fixed duration, input count, or resource budget. Preserve reproducible crashing inputs, sanitizer output, target identity, seed corpus identity, and execution limits.

A bounded run provides evidence only for the exercised budget; absence of a crash is not proof that no defect exists. A reproducible crash affecting an adopted contract may be a hard-gate failure.

Hosted continuous services such as OSS-Fuzz are ongoing integrations rather than one-off branch scanners. A project using such a service should separately define onboarding, default-branch cadence, issue handling, and whether a local or CI fuzz smoke run applies to a candidate branch.

### Model-assisted code reviews

Select reviews by actual technology and boundary. The [TypeScript](../prompts/review-code-typescript.md), [Rust](../prompts/review-code-rust.md), and [Tauri](../prompts/review-code-tauri.md) review prompts are separate perspectives; run only those applicable to the assessed scope. A change review receives the exact base and candidate. A repository health audit receives an explicitly broader scope and must not imply complete coverage of unread code.

Record the provider, model identifier when available, interface, prompt revision, permissions, reviewed candidate, actual inspected scope, and output. Model output is advisory until its evidence is validated and the finding is dispositioned.

## Execution graph

The runner constructs an explicit acyclic graph from configured prerequisites and resource constraints. It may run independent checks and reviewers concurrently; it must not infer safety from their names.

Typical dependencies include:

- coverage generation before a CRAP calculation that consumes it;
- build or instrumentation before mutation and fuzz execution;
- generated schemas before an architecture checker that reads them;
- all source reports before synthesis;
- frozen findings before remediation planning;
- implemented remediation before targeted verification.

Serialize activities that mutate shared state or compete for an exclusive database, port, cache, worktree, device, or provider limit. Prefer isolated output directories and read-only checks. An assessment MUST report any command that modified source or configuration unexpectedly and invalidate affected downstream results until the candidate is restored or re-established.

A failure in one independent check need not cancel unrelated checks when their results remain useful. The final manifest still marks the run incomplete when a required activity failed or never ran.

## Run artifacts

Each run writes a durable manifest and preserves its source results at least until the closure record for that candidate is published and every waiver, accepted risk, and coverage limit it cites is recorded. The consuming repository owns retention and access beyond that boundary. The storage mechanism may be a local ignored directory, CI artifacts, or a dedicated application. Do not commit transient reports by default.

An illustrative layout is:

```text
.verification/<run-id>/
  manifest.json
  machine/
    static-analysis.sarif
    architecture.json
    coverage.json
    crap.json
    mutation.json
    fuzzing/
  reviews/
    typescript-codex.md
    rust-claude.md
    tauri-codex.md
  synthesis.md
  findings.json
  closure.md
```

Names and formats are repository-specific. The manifest is authoritative for what executed, not for whether every reported concern is valid.

For every activity, record:

- stable activity identifier and class;
- required or advisory status;
- command or prompt identity;
- tool, provider, and version information available at execution;
- baseline, candidate, scope, and configuration identity;
- start, finish, exit state, and timeout;
- artifact paths and content hashes when supported;
- observed pass, negative result, infrastructure failure, malformed result, or skip;
- coverage limitations and skip authorization.

A synthesis report links to these artifacts rather than copying every raw warning. Generated output MUST NOT become a competing source of truth for product behavior or architecture.

## Findings and discovery freeze

After required discovery activities finish, synthesize their results into a candidate finding set. Each finding has:

- stable finding identifier;
- source activity and source finding identifiers;
- assessed baseline and candidate;
- precise location and affected contract or behavior;
- evidence and practical consequence;
- severity, using the `Blocker`, `Major`, and `Minor` definitions in the [code review contract](../prompts/README.md#report), plus confidence or evidence limit;
- proposed correction or decision;
- initial status.

Severity records demonstrated impact on the assessed candidate, not tool confidence or the class of the reporting activity. A tool-native level such as a Static Analysis Results Interchange Format (SARIF) `error` or `warning`, a lint category, a complexity score, or a surviving-mutation count is evidence for that judgment rather than the severity itself; retain the original level beside the assigned severity so the mapping stays inspectable.

The developer reviews this set, resolves unsupported or duplicate items, and declares the accepted set frozen for the remediation cycle. Freezing prevents later verification from silently expanding the work.

Use these dispositions:

| Disposition | Meaning |
| --- | --- |
| `fix` | The finding is accepted into the current remediation scope. |
| `already satisfied` | Current evidence shows the required behavior or contract is already met. |
| `false positive` | The alleged defect does not hold for the assessed candidate. |
| `accepted risk` | The finding is valid and intentionally retained with its reason and scope. |
| `deferred` | The finding is valid but belongs to a named future decision or work item. |
| `duplicate` | Another finding owns the same defect; retain the source identifier and distinct evidence. |
| `superseded` | Another accepted decision or remediation makes this proposal obsolete. |

Rejecting a proposed remedy does not automatically reject the underlying defect. Deferring a finding removes it from the current remediation scope only when its risk is nonblocking or the developer explicitly accepts the consequence.

The frozen set identifies its source run and exact assessed candidate. New evidence may change a disposition through an explicit developer decision; a model cannot expand the frozen set by emitting another report.

## Remediation planning

Create an implementation plan only from findings dispositioned `fix` and any prerequisites explicitly accepted with them. The plan references finding identifiers, applicable governing contracts, observable acceptance, and specific verification. It does not include every diagnostic or model suggestion merely because it was recorded.

Group corrections by coherent behavior or boundary rather than by tool. Several analyzers may identify one defect, while one model report may contain unrelated defects requiring separate tasks.

A remediation plan follows the [implementation plan contract](product-documentation-process.md#implementation-plan) for task identity, direct prerequisites, observable acceptance, per-task verification, shared-file ownership, and the repository's required final verification. Assessment adds only these inputs to that contract:

- the bounded accepted finding set as the plan's authorized scope;
- the finding identifiers each task closes, with their original evidence and disposition;
- the predeclared diagnostic comparisons a finding depends on;
- the targeted review needed to validate semantic corrections.

A finding that requires changing an approved requirement, architecture, or technical contract is not remediation work. That contract already requires returning the precise question to the owning document and developer decision instead of hiding it inside a task; plan implementation from the revised contract afterward. Assessment evidence does not authorize a design change.

Implementation follows the consuming repository's normal design, review, test, and integration process. Assessment artifacts do not authorize code changes by themselves.

## Verification without rediscovery

After remediation, establish the final candidate and run verification against the frozen finding set. Verification MUST:

1. prove the acceptance criteria for each implemented finding;
2. rerun affected tests and applicable hard gates against the final candidate;
3. compare predeclared diagnostic targets when a finding depends on them;
4. confirm accepted risks and deferred findings were not misrepresented as fixed;
5. record failures, skips, and infrastructure limits;
6. avoid launching an unrequested broad assessment.

Use targeted model review when semantic judgment is needed. A targeted reviewer receives the remediation diff, named finding identifiers, original evidence, disposition, governing contracts, and acceptance criteria. Its task is to decide whether those corrections hold and whether the remediation introduced a concrete correctness or contract regression. It must not perform a fresh general code-quality review or add unrelated improvements to the current cycle.

Deterministic checks may report a new violation introduced by remediation. Handle newly observed concerns as follows:

- a regression introduced by the remediation enters the current cycle;
- a newly exposed critical correctness, security, privacy, or data-loss defect is presented for an explicit developer decision;
- an unrelated pre-existing issue or nonblocking improvement is recorded for a future assessment and does not reopen the frozen set;
- a style preference or equally sound alternative does not block closure unless it violates an adopted contract.

Do not repeatedly run broad model reviews until they return no findings. Open-ended review has no stable zero-finding convergence criterion.

## Closure

An assessment is ready to close when:

- every configured discovery activity has a recorded result or explicit authorized skip;
- every frozen finding has a disposition;
- every `fix` finding has implementation and verification evidence;
- required hard gates pass against the final candidate, or an explicit waiver identifies the failed gate, scope, consequence, and reason;
- accepted risks, deferred work, unresolved coverage limits, and newly observed nonblocking concerns remain visible;
- the final candidate has not changed since its verification;
- the developer explicitly approves closure for that candidate and finding set.

The closure record identifies:

- source run and assessed baseline/candidate;
- frozen finding-set revision;
- final disposition of every finding;
- remediation commits or equivalent content identity;
- commands, prompts, artifacts, and results used for verification;
- final accepted candidate;
- waivers, accepted risks, deferred work, and coverage limits;
- developer approval tied to that state.

Required execution proves that configured activities ran. Closure proves that the frozen findings were dispositioned, accepted remediation was verified, hard gates were satisfied or explicitly waived, and the developer approved the resulting state. Closure does not require zero diagnostic or model-generated findings.

A closed assessment remains closed for its identified candidate. Start a new broad assessment only on a configured trigger such as a material new change, architecture milestone, release boundary, scheduled audit, or explicit developer request. Remediation itself is not an automatic trigger.

## Integration responsibilities

### Consuming repository

The consuming repository owns:

- assessment profiles and triggers;
- actual commands, tool versions, configuration, thresholds, and exclusions;
- provider adapters and subscription constraints;
- hard-gate versus advisory classification;
- concurrency and resource limits;
- artifact retention and access control;
- CI enforcement and branch protection;
- project-specific exceptions to this guide.

### Mise

Mise may provide stable entry points, install or select tool versions, and call the external runner. For example, a consumer might expose `verify:fast`, `verify:branch`, and `assess:deep`; these names are illustrative.

Mise task definitions should delegate to the same underlying commands used by local workflows and CI rather than maintain parallel implementations. Complex run state, process supervision, artifact validation, and finding lifecycle belong in the external runner or an established workflow system, not in duplicated shell fragments.

### Git hooks

A hook manager — such as prek, a Rust reimplementation of pre-commit that reads the same hook configuration files — may invoke cheap checks before commit, a branch profile before push, or named profiles on demand. Hooks are a local feedback mechanism, not the sole enforcement boundary. Installation is not guaranteed, hooks may be skipped, and some deep checks are too slow or resource-intensive for frequent Git operations.

Keep the policy and canonical commands outside the hook configuration. A hook calls the selected stable entry point; it does not redefine the assessment.

### Continuous integration

CI should call the same canonical machine-facing entry points and retain the same manifest contract. Required CI checks and protected branches are the authoritative merge gate when available.

Do not require personal interactive model subscriptions in unattended CI unless the project has explicitly provisioned and governed that use. Model reviews may remain a locally triggered required assessment activity while deterministic hard gates run in CI; the closure record makes that split visible.

### Project Playbook

This guide owns the shared assurance lifecycle and convergence rules. Review prompts own their review instructions.

Adoption requires a matching change to the [mise integration](../integrations/mise.md) explaining how a consumer exposes the workflow without duplicating this policy. That section does not exist yet; it is a prerequisite of adopting this guide, not a description of the current integration.

Adding this guide alone does not install a runner, register a mise task, configure a hook manager, alter CI, or cause an assessment to execute.

## Open direction notes

Working notes for the author, not guidance. They record why this draft is paused and what would make it usable.

### What this document is and is not

It is a governance contract: it defines what must be true for an assessment to be trustworthy. It is not an implementation guide and cannot become one here, because [principle 7](#governing-principles) and the playbook's [source-of-truth rules](../README.md#source-of-truth-rules) place commands, tool versions, thresholds, and exclusions in the consuming repository. Anyone arriving with "help me set up these checks" needs the consuming-repository material that does not exist yet.

### Keep, compress, relocate

- **Keep** the parts that are hard to rediscover and independent of any tool: the enforcement split in [trust and enforcement boundary](#trust-and-enforcement-boundary), [assessment identity](#assessment-identity), hard gate versus diagnostic classification in [check classes and acceptance semantics](#check-classes-and-acceptance-semantics), the discovery freeze and dispositions in [findings and discovery freeze](#findings-and-discovery-freeze), and [closure](#closure). The rule that absence of a result is not a pass, and that open-ended review has no zero-finding convergence criterion, are the highest-value statements in the document.
- **Compress** [assurance methods](#assurance-methods). Each method currently spends a section to say "record these fields and do not over-interpret the number" without naming a tool or threshold. One table — method, class, what to record, what it does not prove — preserves the judgment and removes most of the length.
- **Relocate** executable recipes to each consuming repository, such as `docs/assurance/`, holding real tool versions, commands, thresholds, exclusions, and local exceptions. A Tauri application and a TypeScript library do not share those choices, so a shared document cannot own them.

### Do not split by assurance method

Separate static-analysis, CRAP, mutation, and fuzzing guides would each carry a few hundred words of judgment while duplicating the shared spine they depend on: assessment identity, check classification, artifact and manifest fields, the freeze, and closure. That produces either five copies of the spine or a sixth core document every reader must load anyway, which is the competing-authority failure [decision 0001](../decisions/0001-guidance-authority.md) and the playbook's one-authoritative-home rule exist to prevent. Split by genre instead: this contract, per-repository recipes, and an executable prompt.

### Missing executable surface

The playbook's executable surface is `prompts/`. Without an assessment task there, this guide can only be applied by hand-reading a long policy on every run. A task would own profile selection, invocation, artifact writing, and the synthesis handoff, while remaining outside the enforcement boundary as [the model-assisted reviewer section](#model-assisted-reviewer) requires.

### Runner scope for one developer

The mandatory runner obligations are not equally load-bearing. Candidate identity, captured commands with their exit state and output, and refusing to treat a missing result as a pass deliver most of the trust for a small script. Content hashing, provider permission matrices, malformed-result rejection, and the concurrency graph are later work that protects against failure modes a single developer rarely has. Sequencing the cheap obligations first would let one repository run this workflow before the full runner exists.

### Prove it in one repository first

Nothing here has been executed once, which inverts the playbook's own advice to try an uncertain practice in a consuming project before promoting it. The next step is a single real assessment in one repository: classify the commands that repository already runs, define one profile, write one run directory, freeze one finding set, and produce one closure record. Generalize back into this guide only what turns out to be repository-independent, then decide adoption, the README entry, and the mise section together.