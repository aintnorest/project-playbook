# Beads task-management policy

## Purpose and authority

This guide records durable decisions for using Beads across local projects:
storage boundaries, agent activation, issue quality, collaboration, backup, and
recovery safety.

The private `beads-workbench` repository is the authoritative operational
runbook. Its `README.md`, `projects.json`, scripts, and mise tasks own current
commands and implementation details. Do not duplicate those mechanics here.

Command compatibility baseline:

- Beads (`bd`) 1.2.2
- Dolt 2.2.0

Both projects evolve quickly. Recheck the versions pinned by
`beads-workbench` before upgrading either executable.

## Architecture and boundaries

Use one Beads database per project, hosted by one local shared Dolt server.
Initialize personal workspaces in stealth mode so Beads files do not enter code
commits. Register the separate databases in one local user interface rather
than merging them.

```text
Project checkout ──bd──> local shared Dolt server
                             │
                             ├── project-a database
                             ├── project-b database
                             └── project-c database
```

The boundaries are intentional:

| Concern | Policy |
| --- | --- |
| Project ownership | One database per project |
| Concurrent local agents | One shared local Dolt server |
| Code repository cleanliness | Stealth mode and local Git exclusions |
| Portfolio visualization | Scotty over registered project workspaces |
| Collaboration | An explicit Dolt remote only for the projects being shared |
| Recovery | Dolt-native backups managed by `beads-workbench` |

Do not use one global issue database for unrelated projects. That would couple
ownership, access, retention, and recovery.

Stealth mode is repository hygiene, not access control. It does not encrypt
data, prevent `git add -f`, untrack previously committed files, or configure a
new clone.

## Oh My Pi activation policy

User-level OMP guidance lives at:

- `~/.omp/agent/AGENTS.md`
- `~/.omp/agent/skills/beads/SKILL.md`

When OMP enters a repository, it runs `bd where --json`. If a workspace is
detected, it runs `bd prime` to load current workspace context.

Detection and `bd prime` are read-only discovery. They do not authorize Beads
task tracking. OMP uses Beads only when the user explicitly requests it or
directs work through a specific Beads issue ID. Until then, it must not create,
select, claim, update, close, defer, supersede, or link Beads issues.

The reusable skill owns detailed command usage. Project-local agent guidance
should contain only project-specific taxonomy, completion criteria,
collaboration policy, or exceptions.

## Issue contract

Use Beads' built-in fields before inventing custom schema.

| Field | Contract |
| --- | --- |
| Title | Imperative, specific outcome |
| Type | `epic` for a multi-task outcome; `feature` for new behavior; `bug` for broken behavior; `task` for bounded delivery; `chore` for maintenance |
| Priority | P0 data loss, security, or outage; P1 important current work; P2 normal planned work; P3 low-value polish; P4 uncommitted idea |
| Description | Context, scope, and constraints; bugs also include reproduction steps |
| Acceptance criteria | Observable results another person or agent can verify |
| Design | Decisions or implementation constraints that must survive handoff |
| Notes | Durable progress, failed approaches, verification evidence, and handoff state |
| Dependencies | `blocks` only for real prerequisites; parent-child for structure; `discovered-from` for work found during execution |
| Labels | Begin with `area:<subsystem>`; add namespaces only for recurring filters |

Do not duplicate built-in status, priority, or type fields in labels. Do not add
execution metadata until an actual query, integration, or automated decision
consumes it.

Beads' lint contract expects:

- bugs: **Steps to Reproduce** and **Acceptance Criteria**;
- tasks and features: **Acceptance Criteria**;
- epics: **Success Criteria**.

Lifecycle validation remains in warning mode while conventions settle. A close
reason records the verified outcome, not merely “done.” Do not close an issue
until its acceptance criteria and relevant checks pass.

## Collaboration policy

Shared-server mode is local process sharing. It does not expose a database to
another computer.

Add a Dolt remote only when a project deliberately adopts cross-machine or
team synchronization. Keep local-only projects without a sync remote. A remote
grants its authorized users potential access to the task data even when the
data uses a Git ref separate from normal code branches.

For a shared project:

1. choose one remote and access policy for that collaboration boundary;
2. distribute URLs and credentials through a private channel;
3. pull before selecting or claiming shared work;
4. push after verified updates;
5. keep push and pull explicit until concurrent-writer behavior is understood.

Remote synchronization is a collaboration mechanism, not an independent
backup.

## Operations

Run operational commands from:

```text
~/development/projects/beads-workbench
```

The supported entry points are:

```bash
mise run project:list
mise run project:add -- <path> <prefix> --name <name>
mise run project:remove -- <name>
mise run check
mise run doctor
mise run server:status
mise run ui
mise run backup:status
mise run backup
mise run restore -- <name> --yes
```

`projects.json` is the project and prefix registry. Use these tasks rather than
repeating initialization, backup configuration, Scotty registration, or
restore procedures in this guide.

## Backup and recovery policy

`bd backup` is the recovery format because it preserves Dolt tables, branches,
commit history, and working-set data. JSONL exports are interchange artifacts,
not full backups.

`beads-workbench` stores every project backup under `backups/<project>/`,
commits the complete batch only after all project syncs succeed, and pushes the
snapshot to its private GitHub repository. The repository must remain private
because its history contains issue content and database history.

Backups are manual by design. Run `mise run backup`:

- after important Beads changes;
- before upgrading Beads or Dolt;
- before destructive database maintenance;
- before changing machines.

Restore overwrites database state and therefore requires explicit user
authorization. After restore, run `mise run check` and `mise run doctor`, then
inspect representative open, closed, and dependent issues before resuming
writes.

## Failure boundaries

- A stopped shared server temporarily makes all shared-server workspaces
  unavailable; it does not merge or erase their databases.
- A local-only database is not protected until its workbench backup has been
  pushed successfully.
- A failed batch backup must not be represented as current; investigate it
  before relying on the previous snapshot.
- A collaboration remote does not replace the private workbench backup.
- A private repository can expose historical task content if later made public,
  even after deleting backup files from the current branch.
- Do not run raw `dolt` commands against a database while Beads' Dolt server is
  running. Use `bd dolt`, `bd backup`, and other `bd` commands so Beads preserves
  its storage invariants.

## References

- [Beads initialization](https://beads.gascity.com/cli-reference/init)
- [Dolt backend](https://beads.gascity.com/architecture/dolt)
- [Synchronization](https://beads.gascity.com/getting-started/sync-setup)
- [Worktrees](https://beads.gascity.com/reference/worktrees)
- [Issues and dependencies](https://beads.gascity.com/core-concepts/issues)
- [Issue linting](https://beads.gascity.com/cli-reference/lint)
