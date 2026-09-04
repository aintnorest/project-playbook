#!/usr/bin/env python3
"""Validate repository structure and relative Markdown links."""

from __future__ import annotations

import re
import sys
from pathlib import Path
from urllib.parse import unquote

ROOT = Path(__file__).resolve().parents[1]
REQUIRED = (
    "README.md",
    "LICENSE",
    "VERSION",
    "mise.toml",
    "guides/product-documentation-process.md",
    "decisions/documentation-structure-proposal.md",
    "prompts/communication-rules.md",
    "prompts/sdd-review.md",
    "prompts/sdd-tdd-communication-rules.md",
)
LINK = re.compile(r"!?\[[^\]]*\]\(([^)]+)\)")


def main() -> int:
    errors: list[str] = []

    for relative in REQUIRED:
        if not (ROOT / relative).is_file():
            errors.append(f"missing required file: {relative}")

    for document in sorted(ROOT.rglob("*.md")):
        text = document.read_text(encoding="utf-8")
        if "/Users/" in text:
            errors.append(f"local absolute path in {document.relative_to(ROOT)}")

        for raw_target in LINK.findall(text):
            target = raw_target.strip().split(maxsplit=1)[0].strip("<>")
            if not target or target.startswith(("#", "http://", "https://", "mailto:")):
                continue
            path_text = unquote(target.split("#", 1)[0].split("?", 1)[0])
            if path_text and not (document.parent / path_text).resolve().exists():
                errors.append(
                    f"broken link in {document.relative_to(ROOT)}: {raw_target}"
                )

    if errors:
        for error in errors:
            print(f"error: {error}", file=sys.stderr)
        return 1

    print(f"validated {len(list(ROOT.rglob('*.md')))} Markdown files")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
