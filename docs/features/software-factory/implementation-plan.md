---
state: draft
revision: plan-r2
---

# Implementation plan: Software factory

This plan lists what has to change in the Playbook to meet the [software factory PRD](prd.md). It does not follow the Playbook's own plan format: this is Playbook work, not a project built with the Playbook. Tasks name their target files, the change, what "done" looks like, their dependencies, and the PRD requirements they cover.

## Decisions this plan makes

Veto any of these before execution; each one changes several tasks.

1. **Approvals file and opt-in.** Approvals move out of frontmatter into `docs/approvals.json`. JSON, because the architecture keeps machine-readable contracts in JSON. Frontmatter keeps `state` and `revision`; the `approved` key is removed. A repository opts into factory enforcement by having this file. `doc_approval init` creates it, and the orchestrator skill runs that at the start of a new project.
2. **Content binding.** An approval is valid only while the document's body still hashes to the recorded SHA-256 and its frontmatter revision still matches.
   - The body is everything after the frontmatter, so a lifecycle edit such as `state: active` → `done` does not void an approval.
   - For implementation plans, the hash skips task `Assigned worktree:` and `Assigned branch:` lines, because the implementation orchestrator writes them at task pickup.
   - Any other content change voids the approval.
3. **Who approves what.**
   - **Developer:** the product vision, architecture, PRDs, and system designs.
   - **Agents:** technical designs and implementation plans, through `doc_approval`, with evidence attached.
   - **Nobody:** the roadmap is not gated, so recording an issue or trimming an item never reopens a gate. Playbook guides are Playbook internals, not product documents: they stay outside the approvals scheme and keep their current frontmatter rules.
   - **Revoking:** any agent that writes documents can revoke any approval; review agents stay read-only.
4. **One refusal text.** The hook blocks through OMP's native blocked-call result, with the shared message as its reason. `doc_approval` returns the same text as an ordinary result when it refuses. The text is defined once in `omp-extension.ts`.
5. **Inert unless opted in.** Every hook does nothing in a repository without `docs/approvals.json`, so the Playbook adds no friction to projects that do not use its documents.
6. **Revision limit.**
   - **What counts:** the extension counts `draft-*` spawns. A spawn whose session creates a new document file is a first draft and does not count.
   - **The limit:** the sixth revision is refused.
   - **What resets it:**
     - a developer message typed in the main session's prompt;
     - an explicit answer to a main-session `ask` (not a timeout, a cancellation, or a redirect to chat);
     - any recorded acceptance or approval, which ends that document's process.
   - **Where it lives:** in memory, keyed to the main session's agent tree, and lost when the session restarts.

   Any developer message counts as a response: that approximation keeps agents free of bookkeeping.
7. **Current work.** Factory status finds unfinished work in two places:
   - a PRD that is not `done`;
   - an unfinished system design, TDD, or plan beneath a `done` PRD, which covers fix slices.

   The current slice is the first unfinished slice in the system design's order, or the feature's single TDD. When more than one feature has unfinished work, the hooks do not block; the status line reports the ambiguity.
8. **Main-session skill.** The orchestrator is a skill, `orchestrate-factory`, loaded in the interactive session. It has no agent, because the session that talks to the developer must be the top session. It is listed in `agents/checks.json` `skillsWithoutAgents`.
9. **Run state lives with the orchestrator.** Documents cannot show the execution phase (implementing, reviewing, awaiting validation) or the review round. Factory status reports only what the documents and approvals show, plus the revision count. The skill keeps the phase and round and shows the full status on request.
10. **Version.** Moving approval out of frontmatter breaks existing documents, so `VERSION` goes from `0.1.0` to `1.0.0` and ships a guided migration.

## Shared contracts

Every task uses these as written. A task that needs a different shape stops and reports instead of diverging.

### `docs/approvals.json`

```json
{
  "version": 1,
  "approvals": {
    "docs/product-vision.md": {
      "revision": "vision-r7",
      "bodySha256": "<64 lowercase hex>",
      "by": "developer",
      "attestation": "read-in-full",
      "date": "2026-10-02"
    },
    "docs/features/example/tdd.md": {
      "revision": "tdd-r2",
      "bodySha256": "<64 lowercase hex>",
      "by": "agent",
      "evidence": "Review rounds concluded with no open findings; check_doc_status passed.",
      "date": "2026-10-02"
    }
  }
}
```

- **Keys:** repository-relative paths with forward slashes, one entry per document.
- **`by`:** `developer` or `agent`.
  - `developer` requires `attestation`: `read-in-full` for the product vision and PRDs; `explain-and-defend` for architecture and system designs.
  - `agent` requires `evidence`.
- **`revision`:** omitted for documents without one.
- **Body bytes:** everything after the line that closes the frontmatter, hashed exactly as stored. For implementation plans, lines matching `^- \*\*Assigned (worktree|branch):\*\*` are removed first; T3 confirms the exact pattern against `scripts/check-implementation-plans.py`.
- **Gates by type** (type comes from the path, as in `check-doc-status.py` `document_type`):
  - developer: product vision, architecture, PRD, system design;
  - agent: technical design, implementation plan;
  - none: roadmap, guide (guides keep their existing frontmatter rules).
- **Validity:** an approval is valid when its entry exists, its revision matches the frontmatter, and its hash matches the body. `active` and `done` require a valid approval for gated types; `draft` and `superseded` never do.

### `scripts/doc-approval.py`

A standard-library program in the style of the existing checkers: JSON on stdout, diagnostics on stderr, nonzero exit on failure. Helpers it shares with `check-doc-status.py` must not write `__pycache__` into a read-only install.

- `--init --repo <root>`: creates an empty approvals file; does nothing if one exists.
- `--status --repo <root> [--path <doc>]`: approval state per document, `{path, type, gate: "developer"|"agent"|"none", approved: bool, by, reason}`. `reason` explains an invalid approval: missing, hash mismatch, or revision mismatch.
- `--revoke --repo <root> --path <doc> --reason <text>`: removes the entry. Allowed for any document.
- `--accept --repo <root> --path <doc> --evidence <text>`: records an agent acceptance. It refuses developer-gated documents with exit status 3 and no file change.
- `--developer-approve --repo <root> --path <doc> --attestation <value>`: records a developer approval. Only the developer command calls this mode; the hook blocks agents from calling it through `bash` or `eval`.

`doc_approval` writes the approvals file. That is a new exception to the architecture's rule that contract tools only read (task T2). All writes go into the consumer repository named by `--repo`, never into the Playbook install.

### `scripts/factory-status.py`

`--repo <root>` prints:

```text
{feature, currentSlice, documents: [{path, type, state, approved, gate}], openGates: [path], nextStep: <sentence>, ambiguity: <sentence|null>}
```

- `nextStep` covers the document-derivable steps of the PRD's sequence (SF-001 to SF-009, SF-054). With an accepted TDD and plan that are not `done`, it says "implementation, review, or developer validation in progress".
- It prints `{feature: null, ...}` when there is no unfinished work.
- It prints `optedIn: false` and nothing else when `docs/approvals.json` is absent.

### Refusal message

Draft text; T6 owns the final wording:

> This file records approvals, and agents don't change it directly by any route. To mark a document not approved, or to accept a technical design or implementation plan after its review loop and checks pass, use `doc_approval`. Product vision, architecture, PRD, and system design approvals belong to the developer: stop, render a developer request, and ask. Stopping here is the correct way to finish this turn, not a failure.

### Order-refusal message

Built from `factory-status.py`:

> `<document>` is waiting for `<developer|agent>` approval. Next expected step: `<nextStep>`. Discussion, research, and edits to existing documents are still open.

## Tasks

### Phase 1: governing documents and contract programs (parallel)

- **T1 — Product vision constraint.** Target: `docs/product-vision.md`.
  - Change: revise "Only the developer accepts" (L71) so it covers developer-gated documents. State that agents accept technical designs and implementation plans on evidence, never on a default or a timeout. Bump to `vision-r7`.
  - Done when the constraint no longer forbids agent acceptance of TDDs and plans, and no other vision text contradicts SF-024.
  - Covers SF-024, SF-028–SF-030. Gate: developer approval.
- **T2 — Architecture.** Target: `docs/architecture.md`.
  - Change:
    - a trust-boundary exception for `doc_approval` writing `docs/approvals.json` in the consumer repository (L58);
    - a "contract hooks" rule: hooks that enforce Playbook contracts live in `omp-extension.ts`, next to contract tools;
    - under "no persistence or service" (L59), record the in-memory revision counter as session state that is not persisted;
    - consumer-contract entries for the approvals file, `doc_approval`, `factory_status`, and the hooks, each naming its readers;
    - replace the `approved`-date wording at L65;
    - mark migrations `[EXISTS]` once T13a lands;
    - add the technology index rows.

    Bump to `arch-r9`.
  - Done when every new contract has one owner and named readers.
  - Covers SF-041. Gate: developer approval.
- **T3 — `scripts/doc-approval.py` and tests.** Targets: `scripts/doc-approval.py`, `tests/test_doc_approval.py`.
  - Change: implement the program contract above.
  - Tests:
    - developer-gated `--accept` is refused and leaves the file byte-identical;
    - a body edit invalidates an approval; a frontmatter-only edit does not;
    - writing a plan task's assignment lines does not invalidate the plan; any other plan edit does;
    - a revision bump invalidates;
    - the roadmap reports `gate: "none"`;
    - revoke works on every type;
    - malformed approvals JSON fails closed;
    - `--init` is idempotent.
  - Done when the tests pass.
  - Covers SF-029–SF-032.
- **T4 — `check-doc-status.py` reads approvals.** Targets: `scripts/check-doc-status.py`, `tests/test_check_doc_status.py`, `tests/test_checker_no_write.py`, `tests/test_git_environment.py`. Depends on T3's hashing; share one helper module, or deliberately duplicate the few lines.
  - Change:
    - reject the `approved` frontmatter key, pointing to the migration guide;
    - for gated types, `active` and `done` require a valid approval; the roadmap needs none;
    - the `--json` row becomes `{path, type, state, revision, approval: {gate, by, date, valid}}`;
    - frozen-diff compares body and revision, requires a `done` document's approval entry to remain, and allows changes that only touch `docs/approvals.json`.
  - Done when the existing and updated tests pass, including a migrated active process-guide fixture.
  - Covers SF-024, SF-031, SF-056.
- **T5 — `scripts/factory-status.py` and tests.** Targets: `scripts/factory-status.py`, `tests/test_factory_status.py`. Depends on T3's helpers.
  - Change: implement the status contract above.
  - Tests:
    - an empty opted-in project yields the vision step, then architecture, then the PRD;
    - every document step for single-slice and multi-slice features yields the right `nextStep`;
    - a fix slice under a `done` PRD, single-slice and multi-slice, is found and becomes `currentSlice`;
    - an open developer gate appears in `openGates`;
    - two features with unfinished work produce `ambiguity`;
    - a repository without the approvals file yields `optedIn: false`.
  - Done when the tests pass.
  - Covers SF-002–SF-009, SF-034–SF-038.

### Phase 2: extension (one owner; depends on T3–T5)

- **T6 — Tools, hooks, and command.** Targets: `omp-extension.ts`, `tests/omp-extension.test.js`, `tests/optional-arguments.test.js`, `tests/run-check.test.js`, new `tests/hooks.test.js`.
  - **Tools:**
    - `doc_approval` (`init`, `status`, `revoke`, `accept`) wraps T3, and returns the shared refusal message as an ordinary result when it refuses;
    - `factory_status` wraps T5.
  - **Approvals-file guard** (`tool_call`, all sessions): block with the shared refusal message when
    - an `edit` or `write` path, or an `ast_edit` path or glob, resolves to `docs/approvals.json`; edit paths come from the edit input's file sections;
    - a `bash` or `eval` text names `approvals.json` together with a write pattern (redirection, `tee`, `sed -i`, `mv`, `cp`, `rm`, `truncate`, write-mode `open(`, `writeFile`, `Bun.write`);
    - a `bash` or `eval` text contains `--developer-approve`.

    Reads such as `cat`, `jq` without in-place flags, and `git diff`, `log`, or `show` stay allowed.
  - **Creation guard** (`tool_call`, all sessions, including drafters): block a `write`, or an `edit` that creates a file, when it would create a document whose type is downstream of an open gate. Use the order-refusal message. Edits to existing documents always pass.
  - **Implementation gate** (`before_subagent_spawn`): block `orchestrate-implementation-plan-agent` unless the current slice's TDD and plan have valid approvals and every developer gate above them is approved. Worker, reviewer, and fix-agent spawns are not gated.
  - **Revision limit** (`before_subagent_spawn` and the creation guard): count and refuse `draft-*` spawns per decision 6, with an instruction to stop and summarize for the developer (SF-016).
    - Reset on main-session `input`.
    - Reset on a main-session `tool_result` for `ask` that carries an explicit answer; ignore `details.timedOut`, `details.chatRedirect`, and cancellation.
    - Reset on any `doc_approval` acceptance or developer approval.
  - **Status line** (`before_agent_start`, main session only, `ctx.agent.kind === "main"`): append one status line from T5 and a pointer to `skill://orchestrate-factory`, keeping the base prompt intact.
  - **`/playbook-approve <path>`:** show the attestation for that document type through `ctx.ui.confirm`, then call T3 `--developer-approve`. Refuse when `ctx.hasUI` is false or the developer declines.
  - **General:** every hook is inert per decision 5, and the test fakes gain `on` and `registerCommand`.
  - **Done when** Bun tests prove each case below, and `scripts/check-omp-load.py` passes with the new tool names.

    | Area | Must block | Must allow |
    | --- | --- | --- |
    | Approvals file | Edit, AST-glob, and shell writes; `--developer-approve` through `bash` | Shell reads |
    | Refusal text | — | Identical text from the hook and the tool |
    | Document order | Creating a downstream document while a gate is open | Revising an existing downstream document while a gate is open |
    | Implementation start | `orchestrate-implementation-plan-agent` without accepted TDD and plan | Nested worker and reviewer spawns |
    | Revision limit | The sixth revision | Resets after an `ask` answer; no reset on an `ask` timeout |
    | Developer approval | The command after the developer declines, and without a UI | The command after the developer confirms |
    | Opt-in | — | Every hook silent without the approvals file |

  - Covers SF-016, SF-017, SF-021, SF-022, SF-027–SF-032, SF-034–SF-038.

### Phase 3: guidance (parallel, disjoint files; depends on the shared contracts only)

- **T7 — Process guide.** Target: `guides/product-documentation-process.md`.
  - **Document state and revision** (L102–L123): the approvals file, content binding, developer, agent, and no gate by type, and `done` set only after the developer validates.
  - **Full-feature workflow** (L521–L571):
    - order: vision, then architecture once before the first PRD, then PRD, then a system design only for multi-slice features, then per slice TDD, plan, implementation, code review, and developer validation;
    - the review loop and its 5-revision limit, linking T8;
    - coherence review after the system design and after each TDD, with re-review of changed and downstream documents;
    - the gates by type;
    - failed validation: the developer chooses an in-slice correction, a document correction with replanning, or a new slice, then review and validation repeat;
    - after validation: deviations go to the main session, the TDD is revised, reviewed, and re-accepted, then the plan and TDD become `done`.
  - **Implementation execution** (L573–L652): every direct developer instruction becomes a report to the caller. That covers `.worktrees` (L365, L591), missing base prerequisites (L587), unavailable commands (L624), and the significant-issue procedure (L636–L646).
    - Small issues are fixed in-run through workers, with TDD deviations recorded in the ledger.
    - A large issue or repeated failure means stop, preserve work, report, and end.
    - Replan only the unfinished part, then resume from the ledger.
    - The post-integration review cycle links T10.
    - No `done` transitions.
  - **Lightweight path** (L82–L86) and **frozen-document rule** (L119–L121) become the post-delivery fix path:
    - known issues go to Beads when the repository has `.beads/`, otherwise to the roadmap's Known issues section;
    - a standalone fix restores documented behavior, adds a regression test, and goes through the review cycle and developer validation;
    - wrong documented behavior needs a new slice;
    - a fix-only slice adds a TDD and plan without a system design.
  - **Roadmap contract** (L210–L235): add Known issues, and state that the roadmap is not gated.
  - Done when no section requires developer acceptance of a TDD or plan, frontmatter approval, a direct developer ask from the implementation orchestrator, or `done` before developer validation.
  - Covers SF-002–SF-009, SF-018–SF-024, SF-042–SF-048, SF-053–SF-063.
- **T8 — Review rules.** Targets: `guides/document-review.md`, `guides/agents.md`.
  - Change:
    - the caller decides each finding, with a reason for every rejection;
    - the drafter applies only the findings it is given and does not triage;
    - the orchestrator may apply small, precise edits itself;
    - a rejected finding is not accepted later without new evidence, and the orchestrator keeps rejection reasons for the run;
    - after each round, the caller states whether another is needed and why;
    - the 5-revision limit and the developer summary when it is reached;
    - the coherence review triggers, replacing L9's optional "can follow".
  - Done when the triage/apply split has one home and the drafters can link to it.
  - Covers SF-010–SF-020.
- **T9 — Developer gates in communication.** Target: `guides/communication-policy.md`.
  - Change:
    - approval requests name the attestation: read in full for the vision and PRD, explain and defend for architecture and system design;
    - a re-approval request shows what changed and which decisions changed since the last approval;
    - stopping at a developer gate or a limit is a correct finish to the turn.
  - Done when the rules attach to Developer requests (L31–L40).
  - Covers SF-021–SF-023, SF-025–SF-027.
- **T10 — Code review cycle.** Target: `guides/code-review.md`.
  - Change: add a review cycle section.
    - Pick reviewers by the languages in the changed files (TypeScript, Python, Rust, Tauri), plus design, invariants, tests, and unused-code reviews every time.
    - The orchestrator triages findings, delegates fixes, and revalidates the application and the slice.
    - At most four cycles, then stop and report what happened, the open issues, and the proposed fix.
    - After a clean cycle, state whether another round is worthwhile and which reviews it needs.
  - Done when the implementation and fix orchestrators can both link one section.
  - Covers SF-049–SF-052, SF-060.
- **T11 — Roadmap template.** Target: `templates/roadmap.md`.
  - Change: add the Known issues section and remove the frontmatter approval instruction.
  - Covers SF-057.
- **T12 — Integration notes.** Targets: `integrations/omp.md`, `README.md`.
  - Change:
    - list every tool, including `check_doc_status` and `run_check`, which `integrations/omp.md` omits today;
    - list the hooks and `/playbook-approve`;
    - explain loading `/skill:orchestrate-factory` in the main session;
    - explain the opt-in file;
    - state the enforcement goal: forgotten steps, not deliberate circumvention.
  - Covers SF-039, SF-041.
- **T13a — Migration guide and version.** Targets: `guides/migrations/0.1.0-to-1.0.0.md`, `VERSION`.
  - Change: guided steps to create `docs/approvals.json` from existing `approved:` dates:
    - recorded as developer approvals for developer-gated types, and as agent acceptances for TDDs and plans;
    - the roadmap's date is simply dropped;
    - then the frontmatter key is removed.

    Bump `VERSION` to `1.0.0`.
  - Covers SF-024.

### Phase 4: skills and agents (parallel; depends on T7–T10 for link targets)

- **T14 — Main-session orchestrator skill.** Targets: `skill-sources/orchestrate-factory.md`, `agents/checks.json`.
  - **Starting:** initialize the approvals file for a new project, then ask the developer for the next feature, offering roadmap Now and Next items.
  - **Sequence:** vision, then architecture once, then PRD, then a system design only for multiple slices. Per slice: TDD, plan, implementation through the implementation orchestrator, the review cycle, and developer validation.
  - **Document loop:** triage findings, have the drafter apply them, and respect the revision limit; run coherence reviews and cascade re-reviews.
  - **Approvals:** developer gates through `request_developer` and `/playbook-approve`; agent acceptance through `doc_approval`.
  - **Run state:** keep the execution phase, review round, and rejected-finding reasons, and show them with `factory_status` on request. Offer the next step itself.
  - **Implementation reports:** on a large-issue report, pick the wrong document, run its loop and gate, re-review below it, replan the unfinished part, and resume the implementation orchestrator.
  - **After validation:** collect deviations, then revise, review, and re-accept the TDD, then mark the plan and TDD `done`.
  - **Failed validation:** follow the branches from T7.
  - **Known issues:** record them, and offer the choice between a standalone fix and a new slice.
  - Every subagent report returns here; only this session asks the developer.
  - Add `skillsWithoutAgents.orchestrate-factory` with its reason.
  - Done when `scripts/build-skills.py --check` passes, the generated skill stays within 500 lines and 3,800 words, and each branch named above has a numbered step with its completion condition.
  - Covers SF-001–SF-027, SF-038–SF-040, SF-045, SF-047, SF-048, SF-053–SF-058.
- **T15 — Implementation orchestrator.** Targets: `skill-sources/orchestrate-implementation-plan.md`, `agents/orchestrate-implementation-plan-agent.md`.
  - **Gates** (L30, L47, L55): valid approvals for the plan and TDD replace execution authorization and `approved` dates.
  - **Escalation:** every developer ask (skill L37–L38, L89, L98; agent body L19, "return to the developer") becomes a report to the caller. Stop and end on a large issue.
  - **Small issues:** fixed in-run through workers. The delegate-only boundary (agent body L20, skill L51) stays.
  - **Workers** get execute-only handoffs.
  - **Deviations:** record TDD deviations and return them in the completion report.
  - **Review:** run the T10 review cycle after integration.
  - **Completion report:** keeps "Your validation steps" (L95) and drops the `done` transitions (L83).
  - **Agent:** add `doc_approval` to its tools, and update its description to say it reports to its caller.
  - Done when no step asks the developer directly.
  - Covers SF-040, SF-042–SF-046, SF-048–SF-054.
- **T16 — Fix orchestrator.** Targets: `skill-sources/orchestrate-fix.md`, `agents/orchestrate-fix-agent.md`, `agents/routing-cases.json`, `tests/test_build_skills.py` (the L585–L613 list of agents that must have `request_developer`).
  - Change:
    - it takes one known issue, with expected and actual behavior;
    - workers fix it and add a regression test;
    - then it runs the T10 cycle and returns a validation-steps report;
    - it refuses work that changes documented behavior and reports that a new slice is needed.

    Agent frontmatter mirrors the implementation orchestrator: `spawns: "*"`, `run_check`, `request_developer`, `doc_approval`. Routing cases: at least three positive and two negative.
  - Covers SF-059–SF-061.
- **T17 — Drafters.** Targets:
  - `skill-sources/draft-product-vision.md`
  - `skill-sources/draft-system-architecture.md`
  - `skill-sources/draft-prd.md`
  - `skill-sources/draft-system-design.md`
  - `skill-sources/draft-technical-design.md`
  - `skill-sources/draft-implementation-plan.md`
  - the matching six `agents/draft-*-agent.md`

  Change:
  - replace each reviewer-report hook with "apply the accepted findings and reasons you are given; do not decide which findings to accept" (vision L34, architecture L38, PRD L38, system design L40 and L51, TDD L42, plan L31);
  - the plan drafter requires an agent-accepted TDD instead of developer acceptance (L24, L34);
  - remove the system-design exception that allows a single-slice system design (draft-system-design L44);
  - add `doc_approval` to the six drafter agents' tools.

  One task, because the edit is the same in each file. Covers SF-007, SF-012, SF-013, SF-024, SF-029.
- **T18 — Reviewers.** Targets: `skill-sources/review-doc-implementation-plan.md` (L39), `skill-sources/review-doc-coherence.md` (L50–L51, L65).
  - Change: approval state comes from the approvals file through `check_doc_status`. The plan reviewer confirms the TDD's agent acceptance, not developer acceptance. Reviewer tools stay read-only.
  - Covers SF-024.

### Phase 5: developer environment

This repository is not a factory project and is not migrated: its own documents keep their current frontmatter. The migration guide (T13a) is for consumer repositories only.

- **T19 — Beads rule.** Target: `~/.omp/agent/AGENTS.md`, outside the repository.
  - Change: remove the rule that limits Beads to explicit requests, keeping the `bd where` and `bd prime` discovery steps.
  - Done when the file no longer forbids agents from recording issues in Beads.
  - Covers SF-057.

### Phase 6: verification

- **T20 — Gates.** Run:

  ```sh
  python3 scripts/build-skills.py
  python3 scripts/build-skills.py --check
  python3 -m unittest discover -s tests
  bun test
  python3 scripts/check-omp-load.py
  mise run lint-markdown
  ```

- **T21 — Smoke run in a scratch repository.** Create a throwaway Git repository. Load the extension in a real interactive OMP session; the existing load check has no UI and cannot exercise approvals or `ask`. Observe:
  1. **Starting from nothing:** an empty repository after `doc_approval init` shows the vision step, and creating a PRD before the vision and architecture are approved is refused.
  2. **Protecting the approvals file:**
     - editing `docs/approvals.json` with `edit` is blocked, and so is a write through `bash`;
     - a `cat` of the file is allowed;
     - `doc_approval accept` on the PRD returns the same message as the hook.
  3. **Developer approval:** `/playbook-approve` records an approval, and a later body edit voids it.
  4. **Agent gates and document order:**
     - `doc_approval accept` on a TDD records an acceptance;
     - a drafter revising an existing TDD while the PRD gate is open is allowed;
     - creating a new TDD while that gate is open is refused.
  5. **Revision limit:** the sixth revision is refused; answering the summary through `ask` resets the count.
  6. **Status line:** it appears in the main session and not in subagents.
  7. **Opt-in:** the hooks are silent in a repository without `docs/approvals.json`.

  Then delete the scratch repository.

## Out of scope

General improvements to the implementation orchestrator beyond what the PRD requires, and the feature record idea in the [roadmap](../../roadmap.md).
