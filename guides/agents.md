# Agents and skills

An agent and its skill have separate jobs. Keep their instructions distinct so they cannot compete or drift.

## Agent contract

Agent frontmatter holds routing and runtime configuration: the name, description, model, tools, optional `spawns`, and `autoloadSkills`.

The body contains only these elements, in this order:

1. One sentence that defines the agent's scope.
2. The standard pointer to the skill.
3. Boundaries that the tool list cannot enforce, such as write scope, authority, and trust.
4. The standard completion pointer.
5. The standard fallback for an unreadable skill.

Do not restate restrictions already enforced by the tool list. An agent may repeat a statement from its skill only when that statement is true in every branch of the skill.

### Description contract

Write the agent frontmatter `description` as one double-quoted physical line of at most 400 characters. Use third person: say what the agent produces, then `Use when` in the developer's phrasing and `Not for` with its nearest sibling task or agents; a family reference such as “the other review-doc-* agents” is acceptable. Follow the prompt's Purpose, rather than describing only a first draft. Add `Read-only.` for a read-only agent. Do not use `MUST`, `ALWAYS`, `NEVER`, or `CRITICAL` as whole words in the description; soft routing language avoids over-triggering.

For example: `"Reviews one feature PRD's requirements, acceptance intent, and scope against the playbook contract. Use when a developer asks to review or check a PRD before technical design. Not for drafting (draft-prd-agent) or reviewing other document types (the other review-doc-* agents). Read-only."`

### Routing cases

Keep developer-phrased routing examples in `agents/routing-cases.json`, keyed by agent name. Each entry has `positive` request strings and `negative` objects whose `expected` value names another agent or is `null` when no playbook agent should handle the request. For example:

```json
{
  "review-doc-prd-agent": {
    "positive": [
      "Review the PRD in docs/features/export/prd.md",
      "Check whether the export feature's requirements doc is ready for technical design",
      "Independent review of our PRD before we start the TDD"
    ],
    "negative": [
      {"request": "Review the product vision doc", "expected": "review-doc-product-vision-agent"},
      {"request": "Write a PRD for document export", "expected": "draft-prd-agent"},
      {"request": "Fix the failing export test", "expected": null}
    ]
  }
}
```

Each agent needs at least three positives and two negatives. A negative must not expect its own agent; all non-null expectations name an existing agent. No request contains an agent name, and positive requests are unique across agents. Use the guides' `EXPORT` example when an illustrative feature is needed.

Each `review-doc-*` agent needs a negative routed to another `review-doc-*` document type and, where one exists, its matching `draft-*` agent; `review-doc-dry` instead uses any draft agent. Each `draft-*` agent needs a negative for its reviewer, each `review-code-*` agent needs negatives for the other two languages, `orchestrate-*` needs `draft-implementation-plan-agent`, and draft-prompt and review-prompt need each other. Treat a description change as a routing behavior change and update its cases with the source.

## Skill contract

The skill owns everything else: the procedure, every conditional instruction, the output contract, and the definition of done. Conditional decisions belong only in the skill, including when to research, delegate, write, or stop early.

## Build check

`scripts/build-prompts.py --check` validates the agent-to-skill relationship, matching names, the standard body lines, obsolete completion wording, reviewer tool restrictions, `description-contract`, and `routing-cases`. The exact standard sentences are defined in `scripts/build-prompts.py`; do not copy their wording into this guide.

All rules apply by default. To make an exception, add the affected skill to `skillsWithoutAgents` or add the rule under the affected agent in `exemptions` in `agents/checks.json`. Every exception must have a non-empty reason. The check rejects exceptions that name an unknown skill, agent, or rule.
