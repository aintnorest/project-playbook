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

## Skill contract

The skill owns everything else: the procedure, every conditional instruction, the output contract, and the definition of done. Conditional decisions belong only in the skill, including when to research, delegate, write, or stop early.

## Build check

`scripts/build-prompts.py --check` validates the agent-to-skill relationship, matching names, the standard body lines, obsolete completion wording, and reviewer tool restrictions. The exact standard sentences are defined in `scripts/build-prompts.py`; do not copy their wording into this guide.

All rules apply by default. To make an exception, add the affected skill to `skillsWithoutAgents` or add the rule under the affected agent in `exemptions` in `agents/checks.json`. Every exception must have a non-empty reason. The check rejects exceptions that name an unknown skill, agent, or rule.
