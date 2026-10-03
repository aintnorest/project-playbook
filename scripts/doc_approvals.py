"""Content-bound approval records shared by Playbook contract programs."""

import datetime
import hashlib
import json
import os
import re
import tempfile
from pathlib import Path
from typing import Optional


ASSIGNMENT = re.compile(rb"^- Assigned (?:worktree|branch):[^\r\n]*(?:\r?\n)?$")
ATTESTATIONS = {"vision": "read-in-full", "architecture": "explain-and-defend",
                "prd": "read-in-full", "system-design": "explain-and-defend"}


class ApprovalError(ValueError):
    """A document or approval record cannot be inspected safely."""


def document_type(path: Path) -> Optional[str]:
    parts = path.parts
    if len(parts) >= 2 and parts[-2:] == ("templates", "roadmap.md"):
        return "roadmap"
    if len(parts) >= 2 and parts[-2] == "guides" and path.suffix == ".md":
        return "guide"
    if len(parts) >= 2 and parts[-2] == "docs":
        return {"product-vision.md": "vision", "architecture.md": "architecture",
                "roadmap.md": "roadmap"}.get(parts[-1])
    if len(parts) >= 4 and parts[-4] == "docs" and parts[-3] == "features" and parts[-2]:
        return {"prd.md": "prd", "system-design.md": "system-design",
                "tdd.md": "tdd", "implementation-plan.md": "implementation-plan"}.get(parts[-1])
    if (len(parts) >= 6 and parts[-6] == "docs" and parts[-5] == "features"
            and parts[-4] and parts[-3] == "slices" and parts[-2]):
        return {"tdd.md": "tdd", "implementation-plan.md": "implementation-plan"}.get(parts[-1])
    return None


def gate_for_type(kind: Optional[str]) -> str:
    if kind in ATTESTATIONS:
        return "developer"
    if kind in ("tdd", "implementation-plan"):
        return "agent"
    return "none"


def split_frontmatter(content: bytes) -> tuple:
    """Split flat frontmatter from the exact stored body bytes."""
    lines = content.splitlines(keepends=True)
    if not lines or lines[0].rstrip(b"\r\n") != b"---":
        raise ApprovalError("missing status frontmatter")
    fields = {}
    for index, line in enumerate(lines[1:], 1):
        if line.rstrip(b"\r\n") == b"---":
            return fields, b"".join(lines[index + 1:])
        try:
            match = re.fullmatch(r"([a-z][a-z-]*): ([^\s].*)", line.decode("utf-8").rstrip("\r\n"))
        except UnicodeError as error:
            raise ApprovalError("frontmatter is not UTF-8") from error
        if not match or match[1] in fields:
            raise ApprovalError("invalid or duplicate frontmatter field")
        fields[match[1]] = match[2]
    raise ApprovalError("frontmatter is not closed")


def normalize_plan_assignments(body: bytes) -> bytes:
    """Ignore the plain assignment labels parsed by check-implementation-plans."""
    return b"".join(line for line in body.splitlines(keepends=True)
                    if not ASSIGNMENT.fullmatch(line))


def body_bytes(content: bytes, kind: Optional[str] = None) -> bytes:
    body = split_frontmatter(content)[1]
    return normalize_plan_assignments(body) if kind == "implementation-plan" else body


def body_sha256(content: bytes, kind: Optional[str] = None) -> str:
    return hashlib.sha256(body_bytes(content, kind)).hexdigest()


def relative_path(repo: Path, path: Path) -> str:
    root = Path(repo).resolve()
    candidate = Path(path)
    candidate = (candidate if candidate.is_absolute() else root / candidate).resolve()
    try:
        return candidate.relative_to(root).as_posix()
    except ValueError as error:
        raise ApprovalError("document path must be inside --repo") from error


def _unique_object(pairs):
    result = {}
    for key, value in pairs:
        if key in result:
            raise ApprovalError("duplicate approvals JSON key: " + key)
        result[key] = value
    return result


def _validate_approvals(data: dict) -> None:
    if (not isinstance(data, dict) or set(data) != {"version", "approvals"}
            or type(data["version"]) is not int or data["version"] != 1
            or not isinstance(data["approvals"], dict)):
        raise ApprovalError("invalid approvals JSON; expected version 1 and approvals object")
    for name, entry in data["approvals"].items():
        path = Path(name)
        kind = document_type(path)
        if (path.is_absolute() or path.as_posix() != name or ".." in path.parts
                or "\\" in name or kind is None or not isinstance(entry, dict)):
            raise ApprovalError("invalid approval path or entry: " + name)
        digest = entry.get("bodySha256")
        if not isinstance(digest, str) or not re.fullmatch(r"[0-9a-f]{64}", digest):
            raise ApprovalError("invalid approval hash: " + name)
        by = entry.get("by")
        if by not in ("developer", "agent"):
            raise ApprovalError("invalid approval author: " + name)
        if by == "developer" and (gate_for_type(kind) != "developer"
                                  or entry.get("attestation") != ATTESTATIONS.get(kind)):
            raise ApprovalError("invalid developer attestation or gate: " + name)
        if gate_for_type(kind) == "none":
            raise ApprovalError("ungated document cannot have an approval: " + name)
        if by == "agent" and (gate_for_type(kind) != "agent"
                              or not isinstance(entry.get("evidence"), str)
                              or not entry["evidence"].strip()):
            raise ApprovalError("invalid agent acceptance evidence or gate: " + name)
        if not isinstance(entry.get("revision"), str) or not entry["revision"].strip():
            raise ApprovalError("approval requires revision: " + name)
        date = entry.get("date")
        try:
            if not isinstance(date, str) or not re.fullmatch(r"[0-9]{4}-[0-9]{2}-[0-9]{2}", date):
                raise ValueError()
            datetime.date.fromisoformat(date)
        except ValueError as error:
            raise ApprovalError("invalid approval date: " + name) from error


def load_approvals(repo: Path) -> dict:
    path = Path(repo) / "docs" / "approvals.json"
    try:
        text = path.read_text(encoding="utf-8")
    except FileNotFoundError:
        return {"version": 1, "approvals": {}}
    except (OSError, UnicodeError) as error:
        raise ApprovalError("cannot read approvals: " + str(error)) from error
    try:
        data = json.loads(text, object_pairs_hook=_unique_object)
    except (ValueError, TypeError) as error:
        raise ApprovalError("malformed approvals JSON: " + str(error)) from error
    _validate_approvals(data)
    return data


def save_approvals(repo: Path, data: dict) -> None:
    _validate_approvals(data)
    path = Path(repo) / "docs" / "approvals.json"
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = None
    try:
        with tempfile.NamedTemporaryFile(mode="w", encoding="utf-8", newline="\n",
                                         dir=path.parent, prefix=".approvals-", delete=False) as stream:
            temporary = stream.name
            stream.write(json.dumps(data, indent=2, sort_keys=True, ensure_ascii=True) + "\n")
        os.replace(temporary, path)
        temporary = None
    finally:
        if temporary is not None:
            os.unlink(temporary)


def approval_status(repo: Path, path: Path, approvals: Optional[dict] = None) -> dict:
    name = relative_path(repo, path)
    kind = document_type(Path(name))
    if kind is None:
        raise ApprovalError("unknown document path/type: " + name)
    data = load_approvals(repo) if approvals is None else approvals
    entry = data["approvals"].get(name)
    row = {"path": name, "type": kind, "gate": gate_for_type(kind),
           "approved": False, "by": entry.get("by") if entry else None, "reason": "missing"}
    if row["gate"] == "none":
        row["reason"] = "ungated"
        return row
    if entry is None:
        return row
    content = (Path(repo) / name).read_bytes()
    fields, _ = split_frontmatter(content)
    if entry.get("revision") != fields.get("revision"):
        row["reason"] = "revision mismatch"
    elif entry["bodySha256"] != body_sha256(content, kind):
        row["reason"] = "hash mismatch"
    else:
        row.update(approved=True, reason=None)
    return row


def validity(repo: Path, path: Path) -> dict:
    row = approval_status(repo, path)
    return {"approved": row["approved"], "reason": row["reason"]}
