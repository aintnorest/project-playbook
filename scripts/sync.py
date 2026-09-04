#!/usr/bin/env python3
"""Install or verify a project-playbook snapshot in another project."""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import shutil
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CONTENT_DIRS = ("guides", "prompts")
INSTALL_DIR = ".project-playbook"


def source_files() -> dict[Path, bytes]:
    files: dict[Path, bytes] = {Path("VERSION"): (ROOT / "VERSION").read_bytes()}
    for directory in CONTENT_DIRS:
        for source in sorted((ROOT / directory).rglob("*")):
            if source.is_file():
                files[source.relative_to(ROOT)] = source.read_bytes()
    return files


def manifest(files: dict[Path, bytes]) -> bytes:
    payload = {
        "schema": 1,
        "version": (ROOT / "VERSION").read_text(encoding="utf-8").strip(),
        "files": {
            path.as_posix(): hashlib.sha256(content).hexdigest()
            for path, content in sorted(files.items(), key=lambda item: item[0].as_posix())
        },
    }
    return (json.dumps(payload, indent=2, sort_keys=True) + "\n").encode()


def expected_snapshot() -> dict[Path, bytes]:
    files = source_files()
    files[Path("manifest.json")] = manifest(files)
    return files


def verify(destination: Path, expected: dict[Path, bytes]) -> int:
    if not destination.is_dir():
        print(f"stale: {destination} does not exist", file=sys.stderr)
        return 1

    actual_paths = {
        path.relative_to(destination)
        for path in destination.rglob("*")
        if path.is_file()
    }
    expected_paths = set(expected)
    errors: list[str] = []

    for path in sorted(expected_paths - actual_paths):
        errors.append(f"missing {path.as_posix()}")
    for path in sorted(actual_paths - expected_paths):
        errors.append(f"unexpected {path.as_posix()}")
    for path in sorted(expected_paths & actual_paths):
        if (destination / path).read_bytes() != expected[path]:
            errors.append(f"changed {path.as_posix()}")

    if errors:
        for error in errors:
            print(f"stale: {error}", file=sys.stderr)
        return 1

    print(f"current: {destination}")
    return 0


def install(target_root: Path, destination: Path, expected: dict[Path, bytes]) -> int:
    if destination.is_symlink():
        print(f"refusing to replace symlink: {destination}", file=sys.stderr)
        return 2

    with tempfile.TemporaryDirectory(prefix=".project-playbook-sync-", dir=target_root) as temp:
        temp_root = Path(temp)
        staged = temp_root / INSTALL_DIR
        for path, content in expected.items():
            output = staged / path
            output.parent.mkdir(parents=True, exist_ok=True)
            output.write_bytes(content)

        previous = temp_root / "previous"
        if destination.exists():
            os.replace(destination, previous)
        try:
            os.replace(staged, destination)
        except BaseException:
            if previous.exists() and not destination.exists():
                os.replace(previous, destination)
            raise

    print(f"installed {len(expected)} files in {destination}")
    return 0


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Install project-playbook into .project-playbook in a target project."
    )
    parser.add_argument(
        "--check",
        action="store_true",
        help="report whether the target matches without changing files",
    )
    parser.add_argument(
        "target",
        nargs="?",
        default=".",
        help="target project root (default: current directory)",
    )
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    target_root = Path(args.target).expanduser().resolve()
    if not target_root.is_dir():
        print(f"target is not a directory: {target_root}", file=sys.stderr)
        return 2

    destination = target_root / INSTALL_DIR
    expected = expected_snapshot()
    if args.check:
        return verify(destination, expected)
    return install(target_root, destination, expected)


if __name__ == "__main__":
    raise SystemExit(main())
