// This repository is packaged as an OMP extension for one reason only: so that
// enabling it (via the `extensions:` setting) registers this directory as an
// extension package, which makes its sibling capability directories
// discoverable — `agents/` (task agents) and `skills/` (generated SKILL.md packs).
//
// It intentionally registers no tools, commands, or event handlers. The factory
// is a required, deliberate no-op; all payload lives in agents/ and skills/.
export default function projectPlaybook() {}
