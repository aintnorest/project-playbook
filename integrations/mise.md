# Keep the playbook current with mise

Mise belongs in each repository that consumes the playbook. This repository publishes versioned documents and ready-made chat prompts; consumers do not need Python or a prompt build step. The optional publisher runs only when maintaining the playbook's sources.

## Consumer repository configuration

Add the playbook release and update task to the consuming repository's `mise.toml`:

The reference below is an example, not a promise that an older release contains every path shown in the current working documentation. When adopting new guidance, select a published release that contains it; do not move an existing tag to include unreleased changes.

```toml
[vars]
project_playbook_ref = "v0.1.0"

[tasks."playbook:update"]
description = "Install the pinned project-playbook release"
run = '''
set -eu

target="$MISE_PROJECT_ROOT/.project-playbook"
staging="$(mktemp -d)"
trap 'rm -rf "$staging"' EXIT

git clone --quiet --depth 1 --branch "{{vars.project_playbook_ref}}" \
  https://github.com/aintnorest/project-playbook.git \
  "$staging/source"

mkdir -p "$staging/next"
cp "$staging/source/VERSION" "$staging/next/VERSION"
printf '%s\n' "{{vars.project_playbook_ref}}" > "$staging/next/SOURCE_REF"
cp -R "$staging/source/guides" "$staging/next/guides"
cp -R "$staging/source/prompts" "$staging/next/prompts"
cp "$staging/source/README.md" "$staging/next/README.md"
cp -R "$staging/source/decisions" "$staging/next/decisions"
cp -R "$staging/source/integrations" "$staging/next/integrations"

rm -rf "$target"
mv "$staging/next" "$target"
'''

[tasks."playbook:check"]
description = "Fail when the recorded installed playbook reference differs from the configured release"
run = '''
set -eu
expected="{{vars.project_playbook_ref}}"
actual="$(cat "$MISE_PROJECT_ROOT/.project-playbook/SOURCE_REF" 2>/dev/null || true)"
if [ "$actual" != "$expected" ]; then
  printf 'project-playbook is stale: expected %s, found %s\n' "$expected" "${actual:-nothing}" >&2
  exit 1
fi
'''
```

Run the tasks from the consuming repository:

```sh
mise run playbook:update
mise run playbook:check
```

## What `playbook:check` verifies

`playbook:check` compares only the configured `project_playbook_ref` with the reference recorded in `.project-playbook/SOURCE_REF` by the update task. It does not inspect the installed files, confirm that installation completed, compare their contents with the referenced release, verify that the reference names a published tag, or establish that a tag has not moved.

Commit `.project-playbook/` when contributors, continuous integration, or coding agents need local access to the documents. Treat that directory as generated content. Keep consumer-project facts, additions, and overrides outside it.

## Adopting the installed guidance

Point the consumer README or agent instructions at the installed catalog, the applicable local facts and exceptions, and the requested task. The task's `Required guidance` list identifies the shared sections to read; a concise README entry point can be:

```md
## Project playbook

Choose the requested action from `.project-playbook/prompts/README.md`.
For a repository agent, read that task source and its Required guidance,
then retrieve the relevant project documents and explicit local exceptions.
For chat, paste the matching `.project-playbook/prompts/chat/` file and
attach the actual project documents; shared task guidance is already embedded.
Follow `.project-playbook/guides/document-convergence.md` for the review loop.
```

The recursive `guides/` and `prompts/` copies install the workflow, catalog, task sources, and generated chat prompts. The README, decisions, and integration notes are also copied so their local reference links work; the publishing script is intentionally not installed. For tools without repository access, use the chat-ready version rather than manually collecting its guide dependencies. Project inputs still need actual attachments or pasted content, including raw Markdown for HTML comments; if required material is unavailable, identify the affected work rather than claiming it was read.

Keep the consumer's project-specific facts and exceptions outside the generated `.project-playbook/` directory. Apply the exception requirements owned by the [product documentation process](../guides/product-documentation-process.md): as a summary, identify the affected shared rule, scope, reason, and replacement rather than silently overriding it. Point the consumer's README or agent instructions to the actual local document containing those facts and exceptions, and load it alongside the shared guides.

## Updating a consumer

1. Deliberately change `project_playbook_ref` to the release tag to adopt.
2. Run `mise run playbook:update`.
3. Update task entry points if the release changes paths, then try the relevant task with its current project inputs. Review consumer-facing migration notes before relying on the new guidance.
4. Review the changed documents in `.project-playbook/`.
5. Commit the reference change and generated documents together.

Version pinning means upgrades happen through that deliberate reference change; it does not make a Git tag immutable. Tags can technically be moved, so follow the [playbook's publication rules](../README.md#publish-a-version). `playbook:check` verifies neither that discipline nor the referenced content.

A dependency bot can propose reference updates later. Until then, consumers select upgrades manually; preserving published tags is necessary for a pin to continue identifying the same release.
