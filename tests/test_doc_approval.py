"""Black-box contracts for content-bound document approvals."""

import datetime
import hashlib
import json
import os
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile
import unittest


ROOT = Path(__file__).resolve().parents[1]
PROGRAM = ROOT / "scripts" / "doc-approval.py"
SAMPLES = [
    ("docs/product-vision.md", "vision-r1", "read-in-full"),
    ("docs/architecture.md", "arch-r1", "explain-and-defend"),
    ("docs/features/example/prd.md", "prd-r1", "read-in-full"),
    ("docs/features/example/system-design.md", "sd-r1", "explain-and-defend"),
    ("docs/features/example/tdd.md", "tdd-r1", None),
    ("docs/features/example/implementation-plan.md", "plan-r1", None),
    ("docs/features/example/slices/first/tdd.md", "tdd-r1", None),
    ("docs/features/example/slices/first/implementation-plan.md", "plan-r1", None),
    ("guides/example.md", None, None),
    ("docs/roadmap.md", None, None),
]


class DocApprovalTests(unittest.TestCase):
    def setUp(self):
        temporary = tempfile.TemporaryDirectory(prefix="playbook approvals ")
        self.addCleanup(temporary.cleanup)
        self.root = Path(temporary.name)
        self.manifest = self.root / "docs" / "approvals.json"

    def document(self, relative, revision=None, body="# Document\n", state="draft"):
        path = self.root / relative
        path.parent.mkdir(parents=True, exist_ok=True)
        revision_line = "revision: " + revision + "\n" if revision else ""
        path.write_bytes(("---\nstate: " + state + "\n" + revision_line + "---\n").encode() + body.encode())
        return path

    def run_cli(self, mode, *args, cwd=None, program=PROGRAM):
        return subprocess.run([sys.executable, str(program), mode, "--repo", str(self.root), *args],
                              cwd=cwd, capture_output=True, text=True, check=False, timeout=10)

    def successful(self, mode, *args):
        result = self.run_cli(mode, *args)
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(result.stderr, "")
        return json.loads(result.stdout)

    def status(self, relative):
        return self.successful("--status", "--path", relative)[0]

    def accept(self, relative):
        return self.successful("--accept", "--path", relative, "--evidence",
                               "Review concluded with no open findings; checks passed.")

    def approve(self, relative, attestation):
        return self.successful("--developer-approve", "--path", relative,
                               "--attestation", attestation)

    def test_init_is_idempotent_and_stably_formatted(self):
        self.assertEqual(self.successful("--init"), {"status": "initialized"})
        before = (self.manifest.read_bytes(), self.manifest.stat().st_mtime_ns)
        self.assertEqual(before[0], b'{\n  "approvals": {},\n  "version": 1\n}\n')
        self.assertEqual(self.successful("--init"), {"status": "unchanged"})
        self.assertEqual((self.manifest.read_bytes(), self.manifest.stat().st_mtime_ns), before)
        self.assertEqual(sorted(path.name for path in self.manifest.parent.iterdir()), ["approvals.json"])

    def test_accept_refuses_every_developer_gate_without_writing(self):
        self.successful("--init")
        for relative, revision, attestation in SAMPLES:
            if not attestation:
                continue
            with self.subTest(path=relative):
                document = self.document(relative, revision)
                before = (document.read_bytes(), self.manifest.read_bytes(), self.manifest.stat().st_mtime_ns)
                result = self.run_cli("--accept", "--path", relative, "--evidence", "Checks passed.")
                self.assertEqual(result.returncode, 3, result.stderr)
                self.assertEqual(json.loads(result.stdout), {"status": "refused", "reason": "developer-gated"})
                self.assertEqual(result.stderr, "")
                self.assertEqual((document.read_bytes(), self.manifest.read_bytes(), self.manifest.stat().st_mtime_ns), before)

    def test_accept_refusal_does_not_initialize_repository(self):
        self.document("docs/product-vision.md", "vision-r1")
        result = self.run_cli("--accept", "--path", "docs/product-vision.md", "--evidence", "Checks passed.")
        self.assertEqual(result.returncode, 3)
        self.assertFalse(self.manifest.exists())

    def test_body_edit_invalidates_but_frontmatter_state_edit_does_not(self):
        relative = "docs/features/example/tdd.md"
        path = self.document(relative, "tdd-r1")
        original = path.read_bytes()
        self.accept(relative)
        entry = json.loads(self.manifest.read_text())["approvals"][relative]
        self.assertEqual(entry["bodySha256"], hashlib.sha256(b"# Document\n").hexdigest())
        self.assertEqual(entry["date"], datetime.date.today().isoformat())
        self.assertEqual(entry["by"], "agent")
        self.assertTrue(entry["evidence"])
        self.assertTrue(self.status(relative)["approved"])
        for state in (b"active", b"done", b"superseded"):
            path.write_bytes(original.replace(b"state: draft", b"state: " + state))
            self.assertTrue(self.status(relative)["approved"])
        path.write_bytes(path.read_bytes() + b"Changed body.\n")
        self.assertEqual(self.status(relative)["reason"], "hash mismatch")
        self.assertFalse(self.status(relative)["approved"])

    def test_exact_body_bytes_include_line_endings_and_trailing_whitespace(self):
        relative = "docs/features/example/tdd.md"
        path = self.document(relative, "tdd-r1")
        path.write_bytes(path.read_bytes().replace(b"\n", b"\r\n"))
        self.accept(relative)
        entry = json.loads(self.manifest.read_text())["approvals"][relative]
        self.assertEqual(entry["bodySha256"], hashlib.sha256(b"# Document\r\n").hexdigest())
        path.write_bytes(path.read_bytes().replace(b"# Document\r\n", b"# Document \r\n"))
        self.assertEqual(self.status(relative)["reason"], "hash mismatch")

    def test_revision_bump_invalidates(self):
        relative = "docs/features/example/tdd.md"
        path = self.document(relative, "tdd-r1")
        self.accept(relative)
        path.write_bytes(path.read_bytes().replace(b"tdd-r1", b"tdd-r2"))
        self.assertEqual(self.status(relative)["reason"], "revision mismatch")
        self.assertFalse(self.status(relative)["approved"])

    def test_plan_assignment_lines_match_checker_plain_label_grammar(self):
        relative = "docs/features/example/implementation-plan.md"
        body = "### T1 — Implement\n- Depends on: none\n- Targets: none\n- Change: Implement.\n- Done when: Complete.\n- Verify: true\n"
        path = self.document(relative, "plan-r1", body)
        self.accept(relative)
        original = path.read_bytes()
        for ending in (b"\n", b"\r\n"):
            path.write_bytes(original + b"- Assigned worktree: /tmp/worktree" + ending
                             + b"- Assigned branch: impl/T1" + ending)
            self.assertTrue(self.status(relative)["approved"])
        path.write_bytes(path.read_bytes().replace(b"impl/T1", b"impl/changed"))
        self.assertTrue(self.status(relative)["approved"])
        path.write_bytes(original + b"- **Assigned branch:** impl/T1\n")
        self.assertEqual(self.status(relative)["reason"], "hash mismatch")
        path.write_bytes(original.replace(b"Implement.", b"Change behavior."))
        self.assertEqual(self.status(relative)["reason"], "hash mismatch")

    def test_developer_approval_attestations_and_documents_are_unchanged(self):
        for relative, revision, attestation in SAMPLES:
            if not attestation:
                continue
            with self.subTest(path=relative):
                path = self.document(relative, revision)
                before = path.read_bytes()
                self.approve(relative, attestation)
                entry = json.loads(self.manifest.read_text())["approvals"][relative]
                self.assertEqual(entry["attestation"], attestation)
                self.assertEqual(entry["by"], "developer")
                self.assertEqual(path.read_bytes(), before)
                self.assertTrue(self.status(relative)["approved"])
                incorrect = "explain-and-defend" if attestation == "read-in-full" else "read-in-full"
                manifest_before = self.manifest.read_bytes()
                result = self.run_cli("--developer-approve", "--path", relative, "--attestation", incorrect)
                self.assertEqual(result.returncode, 1, result.stderr)
                self.assertEqual(result.stdout, "")
                self.assertIn("requires attestation", result.stderr)
                self.assertEqual(self.manifest.read_bytes(), manifest_before)

    def test_guides_and_roadmap_are_ungated_without_revisions(self):
        for relative in ("guides/example.md", "docs/roadmap.md", "templates/roadmap.md"):
            with self.subTest(path=relative):
                path = self.document(relative, state="active")
                if relative.startswith("guides/"):
                    path.write_bytes(path.read_bytes().replace(b"state: active\n", b"state: active\napproved: 2026-10-02\n"))
                row = self.status(relative)
                self.assertEqual(row["gate"], "none")
                self.assertFalse(row["approved"])
                self.assertIsNone(row["by"])
                result = self.run_cli("--accept", "--path", relative, "--evidence", "Checks passed.")
                self.assertEqual(result.returncode, 3)
                self.assertEqual(json.loads(result.stdout), {"status": "refused", "reason": "ungated"})
                self.assertFalse(self.manifest.exists())

    def test_revoke_works_for_every_type_and_is_idempotent(self):
        for relative, revision, attestation in SAMPLES:
            with self.subTest(path=relative):
                path = self.document(relative, revision)
                original = path.read_bytes()
                if attestation:
                    self.approve(relative, attestation)
                elif revision:
                    self.accept(relative)
                for _ in range(2):
                    result = self.successful("--revoke", "--path", relative, "--reason", "Review reopened.")
                    self.assertEqual(result, {"status": "revoked", "path": relative})
                    self.assertFalse(self.status(relative)["approved"])
                self.assertEqual(path.read_bytes(), original)
                self.assertNotIn(relative, json.loads(self.manifest.read_text())["approvals"])

    def test_malformed_approvals_fail_closed_and_preserve_bytes(self):
        relative = "docs/features/example/tdd.md"
        self.document(relative, "tdd-r1")
        invalid = ['{', '[]', '{"version": 2, "approvals": {}}',
                   '{"version": 1, "approvals": []}',
                   '{"version": 1, "version": 1, "approvals": {}}',
                   '{"version": 1, "approvals": {"docs/features/example/tdd.md": {}}}']
        for text in invalid:
            self.manifest.write_text(text, encoding="utf-8")
            for mode, extra in (("--status", []), ("--init", []),
                                ("--accept", ["--path", relative, "--evidence", "Checks passed."]),
                                ("--revoke", ["--path", relative, "--reason", "Review reopened."])):
                with self.subTest(text=text, mode=mode):
                    result = self.run_cli(mode, *extra)
                    self.assertEqual(result.returncode, 1, result.stderr)
                    self.assertEqual(result.stdout, "")
                    self.assertIn("approval", result.stderr)
                    self.assertEqual(self.manifest.read_text(), text)

    def test_status_lists_documents_and_uses_repo_not_caller_cwd(self):
        for relative, revision, _ in SAMPLES:
            self.document(relative, revision)
        result = self.run_cli("--status", cwd=ROOT)
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual([row["path"] for row in json.loads(result.stdout)], sorted(s[0] for s in SAMPLES))
        result = self.run_cli("--accept", "--path", "docs/features/example/tdd.md", "--evidence", "Checks passed.", cwd=ROOT)
        self.assertEqual(result.returncode, 0, result.stderr)
        result = self.run_cli("--status", "--path", str(self.root / "docs/features/example/tdd.md"), cwd=ROOT)
        self.assertTrue(json.loads(result.stdout)[0]["approved"])

    def test_path_escape_and_missing_evidence_are_rejected_without_writes(self):
        self.document("docs/features/example/tdd.md", "tdd-r1")
        for args in (("--path", "../docs/features/example/tdd.md", "--evidence", "Checks passed."),
                     ("--path", "docs/features/example/tdd.md", "--evidence", " "),
                     ("--path", "docs/features/example/tdd.md")):
            result = self.run_cli("--accept", *args)
            self.assertNotEqual(result.returncode, 0)
            self.assertEqual(result.stdout, "")
            self.assertFalse(self.manifest.exists())

    def test_status_creates_no_project_or_install_files_including_bytecode(self):
        install = self.root / "install" / "scripts"
        install.mkdir(parents=True)
        for name in ("doc-approval.py", "doc_approvals.py"):
            shutil.copyfile(ROOT / "scripts" / name, install / name)
        self.document("docs/features/example/tdd.md", "tdd-r1")

        def snapshot():
            return {str(path.relative_to(self.root)): (
                        path.read_bytes() if path.is_file() else None, path.stat().st_mtime_ns)
                    for path in [self.root, *self.root.rglob("*")]}

        before = snapshot()
        environment = os.environ.copy()
        environment.pop("PYTHONDONTWRITEBYTECODE", None)
        environment.pop("PYTHONPYCACHEPREFIX", None)
        for args in ([], ["--path", "docs/features/example/tdd.md"]):
            result = subprocess.run([sys.executable, str(install / "doc-approval.py"), "--status",
                                     "--repo", str(self.root), *args], capture_output=True,
                                    text=True, check=False, env=environment, timeout=10)
            self.assertEqual(result.returncode, 0, result.stderr)
            self.assertEqual(snapshot(), before)
            self.assertFalse((install / "__pycache__").exists())
            self.assertFalse(self.manifest.exists())


if __name__ == "__main__":
    unittest.main()
