# Project Playbook

Project Playbook provides reusable guidance and task instructions for planning, documenting, reviewing, and implementing software projects with Oh My Pi (OMP).

## Use the playbook

[Install the playbook in OMP](integrations/omp.md), then dispatch a playbook agent by name or describe the task and let OMP choose one.

Guides define the shared rules for the work. Agents route tasks and enforce their boundaries. Generated skill directories (`SKILL.md` plus `references/`) give each agent the task-specific instructions and guidance it needs. Templates in `templates/` give documents you maintain by hand, such as the roadmap, their starting structure.

## Changing the playbook

Edit task sources in `prompts/` or shared rules in `guides/`; never edit generated files in `skills/`. A git pre-commit hook regenerates the skills, stages them, and runs the build check, so a commit can never carry a stale skill. Install the hook once per clone:

```sh
brew install lefthook
lefthook install
```

Regenerate by hand when you want to inspect the result before committing:

```sh
python3 scripts/build-prompts.py
```

Before pushing, run the tests:

```sh
python3 -m unittest discover -s tests
```
