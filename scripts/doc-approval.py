#!/usr/bin/env python3
"""Inspect hashes and record or revoke agent document acceptances."""

import argparse
import json
import sys
from pathlib import Path
from typing import Optional, Sequence

sys.dont_write_bytecode = True
sys.path.insert(0, str(Path(__file__).resolve().parent))
from doc_approvals import (ApprovalError, approval_status, body_sha256,
                           document_type, gate_for_type, load_approval_files, relative_path,
                           save_agent_approvals)


def emit(payload) -> None:
    print(json.dumps(payload, indent=2, sort_keys=True, ensure_ascii=True))


def document_paths(repo: Path):
    candidates = list((repo / "docs").rglob("*.md"))
    candidates.extend((repo / "guides").glob("*.md"))
    roadmap = repo / "templates" / "roadmap.md"
    if roadmap.is_file():
        candidates.append(roadmap)
    return sorted(path.relative_to(repo).as_posix() for path in candidates
                  if document_type(path) is not None)


def main(arguments: Optional[Sequence[str]] = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    mode = parser.add_mutually_exclusive_group(required=True)
    for name in ("status", "revoke", "accept", "hash"):
        mode.add_argument("--" + name, action="store_true")
    parser.add_argument("--repo", required=True, type=Path)
    parser.add_argument("--path", type=Path)
    parser.add_argument("--reason")
    parser.add_argument("--evidence")
    args = parser.parse_args(arguments)
    required_text = "reason" if args.revoke else "evidence" if args.accept else None
    if not args.status and args.path is None:
        parser.error("this mode requires --path")
    for field in ("reason", "evidence"):
        value = getattr(args, field)
        if field == required_text:
            if value is None or not value.strip():
                parser.error("this mode requires non-empty --" + field)
        elif value is not None:
            parser.error("this mode does not accept --" + field)
    repo = args.repo.resolve()
    try:
        if not repo.is_dir():
            raise ApprovalError("--repo must name an existing directory")
        name = relative_path(repo, args.path) if args.path is not None else None
        kind = document_type(Path(name)) if name is not None else None
        if args.hash:
            digest = body_sha256((repo / name).read_bytes(), kind)
            emit({"status": "hash", "path": name, "hash": digest,
                  "line": json.dumps(name) + ": " + json.dumps(digest) + ","})
            return 0
        if name is not None and kind is None:
            raise ApprovalError("unknown document path/type: " + name)
        if (args.accept or args.revoke) and gate_for_type(kind) != "agent":
            emit({"status": "refused", "reason": "developer-gated" if gate_for_type(kind) == "developer" else "ungated"})
            return 3
        data = load_approval_files(repo)
        if args.status:
            paths = [name] if name is not None else document_paths(repo)
            emit([approval_status(repo, Path(path), data) for path in paths])
        elif args.revoke:
            changed = name in data["agent"]
            if changed:
                del data["agent"][name]
                save_agent_approvals(repo, data["agent"])
            emit({"status": "revoked" if changed else "unchanged", "path": name})
        else:
            data["agent"][name] = {"hash": body_sha256((repo / name).read_bytes(), kind),
                                   "evidence": args.evidence}
            save_agent_approvals(repo, data["agent"])
            emit({"status": "accepted", "path": name})
    except (ApprovalError, OSError, UnicodeError) as error:
        print("doc-approval: " + str(error), file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
