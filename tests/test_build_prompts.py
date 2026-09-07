"""Consumer-visible safety and inclusion contracts for the optional publisher."""

import shutil
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path


PUBLISHER = Path(__file__).resolve().parents[1] / "scripts" / "build-prompts.py"


class BuildPromptsTests(unittest.TestCase):
    def setUp(self):
        temporary = tempfile.TemporaryDirectory(prefix="playbook publisher ")
        self.addCleanup(temporary.cleanup)
        self.root = Path(temporary.name).resolve()
        for directory in ("scripts", "guides", "prompts"):
            (self.root / directory).mkdir()
        shutil.copy2(PUBLISHER, self.root / "scripts" / PUBLISHER.name)
        self.rules = self.root / "guides" / "rules.md"
        self.rules.write_text(
            "# Guide\n\n## Parent\nPreserve the parent obligation.\n\n"
            "### Child\nPreserve the child obligation.\n\n"
            "### Sibling\nPreserve the sibling obligation.\n",
            encoding="utf-8",
        )
        (self.root / "prompts" / "task.md").write_text(
            "# Task\n\n## Required guidance\n\n"
            "- [Child](../guides/rules.md#child)\n"
            "- [Parent](../guides/rules.md#parent)\n"
            "- [Child again](../guides/rules.md#child)\n\n"
            "## Instructions\nApply the supplied obligations.\n",
            encoding="utf-8",
        )
        self.output = self.root / "prompts" / "chat" / "task.md"

    def publish(self, *arguments):
        return subprocess.run(
            [sys.executable, str(self.root / "scripts" / PUBLISHER.name), *arguments],
            cwd=self.root.parent,
            text=True,
            capture_output=True,
            check=False,
        )

    def test_parent_after_child_preserves_all_rules_once(self):
        result = self.publish()
        self.assertEqual(result.returncode, 0, result.stderr)
        content = self.output.read_text(encoding="utf-8")
        for obligation in ("parent", "child", "sibling"):
            self.assertEqual(content.count("Preserve the " + obligation + " obligation."), 1)

    def test_freshness_check_detects_changed_guidance_without_writing(self):
        result = self.publish()
        self.assertEqual(result.returncode, 0, result.stderr)
        previous = self.output.read_bytes()
        self.rules.write_text(self.rules.read_text(encoding="utf-8") + "\nA new obligation.\n", encoding="utf-8")
        result = self.publish("--check")
        self.assertEqual(result.returncode, 1)
        self.assertEqual(self.output.read_bytes(), previous)
        result = self.publish()
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertIn("A new obligation.", self.output.read_text(encoding="utf-8"))
        self.assertEqual(self.publish("--check").returncode, 0)

    def test_unrecognized_output_is_not_overwritten(self):
        self.output.parent.mkdir()
        user_content = "These are independently maintained user instructions.\n"
        self.output.write_text(user_content, encoding="utf-8")
        result = self.publish()
        self.assertEqual(result.returncode, 1)
        self.assertEqual(self.output.read_text(encoding="utf-8"), user_content)


if __name__ == "__main__":
    unittest.main()
