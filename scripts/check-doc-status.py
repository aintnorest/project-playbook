#!/usr/bin/env python3
"""Validate Playbook document status frontmatter and emit machine-readable metadata."""

import argparse
import datetime
import json
import re
import sys
from pathlib import Path
from typing import Dict, List, Optional, Sequence, Tuple


STATES = {
    "vision": {"draft", "approved", "active", "superseded"},
    "architecture": {"draft", "approved", "active", "superseded"},
    "roadmap": {"draft", "active", "superseded"},
    "prd": {"draft", "approved", "superseded"},
    "system-design": {"draft", "approved", "superseded"},
    "tdd": {"draft", "approved", "superseded"},
    "implementation-plan": {"draft", "approved", "active", "done", "superseded"},
    "guide": {"active", "superseded"},
}
PREFIX = {"vision": "vision", "architecture": "arch", "prd": "prd",
          "system-design": "sd", "tdd": "tdd", "implementation-plan": "plan"}
FIELD = re.compile(r"^([a-z][a-z-]*): ([^\s].*)$")
FENCE = re.compile(r"^ {0,3}(`{3,}|~{3,})")
HEADING = re.compile(r"^ {0,3}(#{1,6})[ \t]+(.+?)[ \t]*#*[ \t]*$")
RESTATEMENT = re.compile(
    r"^(?:[-*] )?(?:state\s*:\s*|(?:the |this document(?:'s)? )?state is\s+)?"
    r"(draft|approved|active|done|superseded)(?:\.|\s+status\.?|\s+state\.?)?$",
    re.IGNORECASE,
)


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


def visible_lines(lines: List[str], start: int) -> List[Tuple[int, str]]:
    """Hide fenced examples without losing original source line numbers."""
    visible = []
    marker = ""
    length = 0
    for index in range(start, len(lines)):
        line = lines[index]
        if marker:
            if re.fullmatch(r" {0,3}" + re.escape(marker) +
                            "{" + str(length) + r",}[ \t]*", line):
                marker = ""
            continue
        opening = FENCE.match(line)
        if opening:
            marker = opening[1][0]
            length = len(opening[1])
        else:
            visible.append((index + 1, line))
    return visible


def check_document(path: Path, kind: str, text: str) -> Tuple[Optional[dict], List[dict]]:
    lines = text.splitlines()
    errors: List[dict] = []

    def fail(line: int, message: str) -> None:
        errors.append({"path": str(path), "line": line, "message": message})

    frontmatter_end = 0
    fields: Dict[str, str] = {}
    positions: Dict[str, int] = {}
    if lines and lines[0] == "---":
        try:
            closing = lines.index("---", 1)
        except ValueError:
            fail(1, "frontmatter is not closed; add a closing --- line")
            closing = len(lines)
        frontmatter_end = min(closing + 1, len(lines))
        last_order = -1
        for index in range(1, closing):
            line = lines[index]
            match = FIELD.fullmatch(line)
            if not match:
                fail(index + 1, "invalid frontmatter; use flat 'state: value' scalar lines")
                continue
            key, value = match.groups()
            if key not in ("state", "revision", "approved"):
                fail(index + 1, "unknown frontmatter key: " + key)
                continue
            if key in fields:
                fail(index + 1, "duplicate frontmatter key: " + key)
                continue
            fields[key] = value
            positions[key] = index + 1
            order = ("state", "revision", "approved").index(key)
            if order < last_order:
                fail(index + 1, "frontmatter keys out of order; use state, revision, approved")
            last_order = max(last_order, order)
    else:
        fail(1, "missing status frontmatter; start with --- then state: <state> then ---")

    visible = visible_lines(lines, frontmatter_end)
    status = [(i, line_number) for i, (line_number, line) in enumerate(visible)
              if (heading := HEADING.fullmatch(line)) and len(heading[1]) == 2
              and heading[2] == "Status"]
    # A leading thematic break followed by a heading is not status frontmatter.
    thematic_break = (lines and lines[0] == "---" and
                      next((line for line in lines[1:] if line.strip()), "").startswith("#"))
    if kind == "guide" and not status and (not lines or lines[0] != "---" or thematic_break):
        return None, []
    for index, _ in status:
        for line, body in visible[index + 1:]:
            match = HEADING.fullmatch(body)
            if match and len(match[1]) <= 2:
                break
            if RESTATEMENT.fullmatch(body.strip()):
                fail(line, "Status prose restates state; keep state only in frontmatter")
            if re.match(r"^\s*-\s*(?:State|Revision|Approved):", body, re.IGNORECASE):
                fail(line, "legacy Status key line; move status metadata to frontmatter")

    state = fields.get("state")
    revision = fields.get("revision")
    approved = fields.get("approved")
    if state is None:
        fail(1, "missing state; add state: <allowed lowercase state> to frontmatter")
    elif state not in STATES[kind]:
        fail(positions["state"], "invalid state for " + kind + ": " + state +
             "; allowed: " + ", ".join(sorted(STATES[kind])))
    if kind in PREFIX:
        if revision is None:
            fail(1, "missing revision; add revision: " + PREFIX[kind] + "-r<N>")
        elif not re.fullmatch(re.escape(PREFIX[kind]) + r"-r[1-9][0-9]*", revision):
            fail(positions["revision"], "invalid revision; expected " + PREFIX[kind] + "-r<N>")
    elif revision is not None:
        fail(positions["revision"], "revision is forbidden for " + kind)
    if state in ("approved", "active"):
        if approved is None:
            fail(1, "missing approved; add approved: YYYY-MM-DD for " + state)
    elif approved is not None:
        fail(positions["approved"], "approved is forbidden unless state is approved or active")
    if approved is not None:
        if not re.fullmatch(r"[0-9]{4}-[0-9]{2}-[0-9]{2}", approved):
            fail(positions["approved"], "invalid approved date; expected YYYY-MM-DD")
        else:
            try:
                datetime.date.fromisoformat(approved)
            except ValueError:
                fail(positions["approved"], "invalid approved date; expected a real calendar date")
    return {"path": str(path), "type": kind, "state": state,
            "revision": revision, "approved": approved}, errors


def main(arguments: Optional[Sequence[str]] = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    mode = parser.add_mutually_exclusive_group(required=True)
    mode.add_argument("--check", action="store_true", help="report status errors")
    mode.add_argument("--json", action="store_true", help="emit JSON status records and errors")
    parser.add_argument("paths", nargs="+", type=Path, help="document paths")
    args = parser.parse_args(arguments)
    rows: List[dict] = []
    errors: List[dict] = []
    for path in args.paths:
        kind = document_type(path)
        if kind is None:
            errors.append({"path": str(path), "line": 1, "message": "unknown document path/type"})
            continue
        try:
            text = path.read_text(encoding="utf-8")
        except (OSError, UnicodeError) as error:
            errors.append({"path": str(path), "line": 1, "message": "cannot read document: " + str(error)})
            continue
        row, problems = check_document(path, kind, text)
        if row is not None:
            rows.append(row)
        errors.extend(problems)
    if args.json:
        print(json.dumps({"rows": rows, "errors": errors} if errors else rows,
                         indent=2, ensure_ascii=True))
    for error in errors:
        print("{path}:{line}: {message}".format(**error), file=sys.stderr)
    return int(bool(errors))


if __name__ == "__main__":
    sys.exit(main())
