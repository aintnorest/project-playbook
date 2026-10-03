#!/usr/bin/env python3
"""Initialize, inspect, revoke, or record content-bound document approvals."""

import argparse
import datetime
import json
import re
import sys
from pathlib import Path
from typing import Optional, Sequence

sys.dont_write_bytecode = True
sys.path.insert(0, str(Path(__file__).resolve().parent))
from doc_approvals import (ATTESTATIONS, ApprovalError, approval_status, body_sha256,
                           document_type, gate_for_type, load_approvals, relative_path,
                           save_approvals, split_frontmatter)


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
    for name in ("init", "status", "revoke", "accept", "developer-approve"):
        mode.add_argument("--" + name, action="store_true")
    parser.add_argument("--repo", required=True, type=Path)
    parser.add_argument("--path", type=Path)
    parser.add_argument("--reason")
    parser.add_argument("--evidence")
    parser.add_argument("--attestation", choices=sorted(set(ATTESTATIONS.values())))
    args = parser.parse_args(arguments)
    required_text = "reason" if args.revoke else "evidence" if args.accept else "attestation" if args.developer_approve else None
    if args.init and args.path is not None:
        parser.error("--init does not accept --path")
    if not (args.init or args.status) and args.path is None:
        parser.error("this mode requires --path")
    for field in ("reason", "evidence", "attestation"):
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
        if name is not None and kind is None:
            raise ApprovalError("unknown document path/type: " + name)
        # Refuse before inspecting or writing either document or approvals file.
        if args.accept and gate_for_type(kind) != "agent":
            emit({"status": "refused", "reason": "developer-gated" if gate_for_type(kind) == "developer" else "ungated"})
            return 3
        if args.developer_approve and gate_for_type(kind) != "developer":
            raise ApprovalError("--developer-approve requires a developer-gated document")
        data = load_approvals(repo)
        if args.init:
            exists = (repo / "docs" / "approvals.json").exists()
            if not exists:
                save_approvals(repo, data)
            emit({"status": "unchanged" if exists else "initialized"})
        elif args.status:
            paths = [name] if name is not None else document_paths(repo)
            emit([approval_status(repo, Path(path), data) for path in paths])
        elif args.revoke:
            if name in data["approvals"]:
                del data["approvals"][name]
                save_approvals(repo, data)
            emit({"status": "revoked", "path": name})
        else:
            if args.developer_approve and args.attestation != ATTESTATIONS[kind]:
                raise ApprovalError("this document requires attestation: " + ATTESTATIONS[kind])
            content = (repo / name).read_bytes()
            fields, _ = split_frontmatter(content)
            prefixes = {"vision": "vision", "architecture": "arch", "prd": "prd",
                        "system-design": "sd", "tdd": "tdd", "implementation-plan": "plan"}
            if not re.fullmatch(prefixes[kind] + r"-r[1-9][0-9]*", fields.get("revision", "")):
                raise ApprovalError("missing or invalid document revision")
            entry = {"bodySha256": body_sha256(content, kind), "date": datetime.date.today().isoformat(),
                     "revision": fields["revision"], "by": "agent" if args.accept else "developer"}
            if args.accept:
                entry["evidence"] = args.evidence
            else:
                entry["attestation"] = args.attestation
            data["approvals"][name] = entry
            save_approvals(repo, data)
            emit({"status": "accepted" if args.accept else "approved", "path": name})
    except (ApprovalError, OSError, UnicodeError) as error:
        print("doc-approval: " + str(error), file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
