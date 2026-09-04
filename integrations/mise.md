# Keep the playbook current with mise

Mise belongs in each repository that consumes the playbook. This repository publishes versioned documents and does not need a `mise.toml`, a language runtime, or a lockfile.

## Consumer repository configuration

Add the playbook release and update task to the consuming repository's `mise.toml`:

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

rm -rf "$target"
mv "$staging/next" "$target"
'''

[tasks."playbook:check"]
description = "Fail when the installed playbook differs from the configured release"
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

Commit `.project-playbook/` when contributors, continuous integration, or coding agents need local access to the documents. Treat that directory as generated content; project-specific additions and overrides belong elsewhere.

## Updating a consumer

1. Change `project_playbook_ref` to the new immutable release tag.
2. Run `mise run playbook:update`.
3. Review the changed documents in `.project-playbook/`.
4. Commit the reference change and generated documents together.

A dependency bot can update `project_playbook_ref` later. Until that automation exists, the explicit version change prevents projects from receiving unreviewed process changes.
