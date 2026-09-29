"""CLI contracts for Playbook document status frontmatter."""

import json
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path


CHECKER = Path(__file__).resolve().parents[1] / "scripts" / "check-doc-status.py"


class CheckDocStatusTests(unittest.TestCase):
    def setUp(self):
        temporary = tempfile.TemporaryDirectory(prefix="playbook status ")
        self.addCleanup(temporary.cleanup)
        self.root = Path(temporary.name)

    def path(self, relative, body):
        path = self.root / relative
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(body, encoding="utf-8")
        return path

    def run_checker(self, mode, *paths):
        return subprocess.run([sys.executable, str(CHECKER), mode, *(str(path) for path in paths)],
                              capture_output=True, text=True, check=False)

    def assert_error(self, path, body, message):
        result = self.run_checker("--check", self.path(path, body))
        self.assertEqual(result.returncode, 1, result.stderr)
        self.assertIn(message, result.stderr)

    def test_valid_document_types_and_json_rows(self):
        samples = [
            ("docs/product-vision.md", "vision", "vision", "approved"),
            ("docs/architecture.md", "architecture", "arch", "active"),
            ("docs/features/search/prd.md", "prd", "prd", "draft"),
            ("docs/features/search/system-design.md", "system-design", "sd", "approved"),
            ("docs/features/search/tdd.md", "tdd", "tdd", "draft"),
            ("docs/features/search/implementation-plan.md", "implementation-plan", "plan", "done"),
            ("docs/features/search/slices/browse/tdd.md", "tdd", "tdd", "approved"),
            ("docs/features/search/slices/browse/implementation-plan.md", "implementation-plan", "plan", "active"),
        ]
        paths = []
        for relative, kind, prefix, state in samples:
            date = "approved: 2024-02-29\n" if state in ("approved", "active") else ""
            paths.append(self.path(relative, f"---\nstate: {state}\nrevision: {prefix}-r12\n{date}---\n"
                                   "# Document\n\n## Status\n\nDetails about the document.\n"))
        paths.extend([
            self.path("docs/roadmap.md", "---\nstate: draft\n---\n# Roadmap\n"),
            self.path("templates/roadmap.md", "---\nstate: draft\n---\n# Roadmap\n"),
            self.path("guides/example.md", "---\nstate: active\napproved: 2025-01-01\n---\n"
                      "## Status\nUsage notes.\n"),
        ])
        checked = self.run_checker("--check", *paths)
        self.assertEqual((checked.returncode, checked.stdout, checked.stderr), (0, "", ""))
        result = self.run_checker("--json", *paths)
        self.assertEqual(result.returncode, 0, result.stderr)
        rows = json.loads(result.stdout)
        self.assertEqual([row["type"] for row in rows],
                         [s[1] for s in samples] + ["roadmap", "roadmap", "guide"])
        self.assertEqual(rows[5], {"path": str(paths[5]), "type": "implementation-plan",
                                   "state": "done", "revision": "plan-r12", "approved": None})
        self.assertIsNone(rows[-1]["revision"])

    def test_missing_state_unknown_state_and_missing_revision(self):
        self.assert_error("docs/product-vision.md", "---\nrevision: vision-r1\n---\n", "missing state")
        self.assert_error("docs/features/a/prd.md", "---\nstate: active\nrevision: prd-r1\n---\n",
                          "invalid state for prd")
        self.assert_error("docs/architecture.md", "---\nstate: draft\n---\n", "missing revision")

    def test_approval_date_state_rules_and_calendar(self):
        self.assert_error("docs/features/a/tdd.md", "---\nstate: draft\nrevision: tdd-r1\n"
                          "approved: 2024-01-01\n---\n", "approved is forbidden")
        self.assert_error("docs/features/a/implementation-plan.md", "---\nstate: done\n"
                          "revision: plan-r1\napproved: 2024-01-01\n---\n", "approved is forbidden")
        self.assert_error("docs/product-vision.md", "---\nstate: approved\n"
                          "revision: vision-r1\n---\n", "missing approved")
        self.assert_error("guides/help.md", "---\nstate: active\napproved: 2023-02-29\n---\n"
                          "## Status\nDetails.\n", "real calendar date")
        self.assert_error("docs/roadmap.md", "---\nstate: active\n---\n", "missing approved")

    def test_revision_and_path_boundaries(self):
        self.assert_error("docs/features/a/slices/b/prd.md", "---\nstate: draft\nrevision: prd-r1\n---\n",
                          "unknown document path/type")
        self.assert_error("docs/features/a/tdd.md", "---\nstate: draft\nrevision: plan-r1\n---\n",
                          "expected tdd-r<N>")
        self.assert_error("docs/features/a/tdd.md", "---\nstate: draft\nrevision: tdd-r0\n---\n",
                          "expected tdd-r<N>")
        self.assert_error("docs/roadmap.md", "---\nstate: draft\nrevision: roadmap-r1\n---\n",
                          "revision is forbidden")
        self.assert_error("guides/help.md", "---\nstate: draft\n---\n## Status\nDetails.\n",
                          "invalid state for guide")

    def test_legacy_status_is_actionable_and_fenced_fake_headings_are_skipped(self):
        body = "# Title\n\n```markdown\n## Status\n- State: Approved\n```\n"
        path = self.path("guides/no-status.md", body)
        self.assertEqual(self.run_checker("--check", path).returncode, 0)
        self.assertEqual(json.loads(self.run_checker("--json", path).stdout), [])
        self.assert_error("guides/old.md", body + "## Status\n- State: Active\n",
                          "legacy Status key line")
        self.assert_error("docs/features/a/prd.md", "# PRD\n## Status\nApproved.\n",
                          "missing status frontmatter")
        self.assert_error("guides/restated.md", "---\nstate: active\napproved: 2025-01-01\n"
                          "---\n## Status\nActive.\n", "Status prose restates state")
        self.assertEqual(self.run_checker("--check", self.path("guides/fenced.md", "---\n"
                          "state: active\napproved: 2025-01-01\n---\n## Status\n"
                          "```md\n- State: Active\n```\nPurpose and history.\n")).returncode, 0)

    def test_unclosed_guide_frontmatter_without_status_is_reported(self):
        self.assert_error("guides/process.md", "---\nstate: active\napproved: 2025-01-01\n",
                          "frontmatter is not closed")
        self.assertEqual(self.run_checker("--check", self.path(
            "guides/thematic-break.md", "---\n# Unrelated guide\n\nSome prose.\n"
        )).returncode, 0)

    def test_malformed_frontmatter_duplicate_unknown_nested_and_order(self):
        for body, expected in [
            ("---\nstate: draft\nstate: draft\nrevision: tdd-r1\n---\n", "duplicate frontmatter key"),
            ("---\nstate: draft\nrevision: tdd-r1\nowner: team\n---\n", "unknown frontmatter key"),
            ("---\nstate: draft\nrevision:\n  value: tdd-r1\n---\n", "invalid frontmatter"),
            ("---\nrevision: tdd-r1\nstate: draft\n---\n", "out of order"),
            ("---\nstate: draft\nrevision: tdd-r1\n", "frontmatter is not closed"),
        ]:
            with self.subTest(expected=expected):
                self.assert_error("docs/features/a/tdd.md", body, expected)

    def test_multiple_paths_read_error_and_json_error_shape(self):
        valid = self.path("docs/roadmap.md", "---\nstate: draft\n---\n")
        invalid = self.path("docs/architecture.md", "---\nstate: active\nrevision: arch-r2\n---\n")
        missing = self.root / "docs" / "product-vision.md"
        result = self.run_checker("--json", valid, invalid, missing)
        self.assertEqual(result.returncode, 1)
        self.assertIn("cannot read document", result.stderr)
        payload = json.loads(result.stdout)
        self.assertEqual([row["path"] for row in payload["rows"]], [str(valid), str(invalid)])
        self.assertEqual([error["path"] for error in payload["errors"]], [str(invalid), str(missing)])
        self.assertIn("cannot read document", payload["errors"][-1]["message"])


if __name__ == "__main__":
    unittest.main()
