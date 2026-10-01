#!/usr/bin/env python3
"""Load every Playbook tool in installed OMP, without a model turn."""
import json
import os
from pathlib import Path
import re
import shutil
import subprocess
import sys
import tempfile

ROOT = Path(__file__).resolve().parents[1]


def main():
    omp = shutil.which('omp')
    if not omp:
        sys.exit('OMP load check unavailable: omp is not installed or not on PATH.')
    extension = ROOT / 'omp-extension.ts'
    expected = re.findall(r'^\s+name: "([^"]+)",', extension.read_text(), re.MULTILINE)
    env = {key: value for key, value in os.environ.items()
           if not key.endswith(('_API_KEY', '_TOKEN'))}
    env.update(PI_CODING_AGENT_DIR='/Users/cjalatorre/development/scratch/orch-terminal-spike/.omp-sandbox/agent',
               PI_PROXY='http://127.0.0.1:9', PI_NO_TITLE='1')
    with tempfile.TemporaryDirectory(prefix='playbook-omp-load-') as directory:
        probe = Path(directory) / 'probe.ts'
        probe.write_text('import playbook from ' + json.dumps(str(extension)) + ';\n'
                         'export default function(pi) { const names = [];\n'
                         'playbook(new Proxy(pi, {get(target, key) {\n'
                         'if (key === "registerTool") return tool => {target.registerTool(tool); names.push(tool.name)};\n'
                         'const value = target[key]; return typeof value === "function" ? value.bind(target) : value;\n'
                         '}}));\n'
                         'console.log("PLAYBOOK_LOADED=" + JSON.stringify(names)); process.exit(0); }\n')
        try:
            result = subprocess.run([omp, '--no-session', '--model', 'sandbox-dead/sandbox-null',
                                     '--no-extensions', '--no-skills', '--no-rules', '--no-lsp',
                                     '--extension', str(probe), '--mode', 'rpc', '--no-ui'],
                                    cwd=directory, env=env, capture_output=True, text=True, timeout=30)
        except subprocess.TimeoutExpired:
            sys.exit('OMP load check failed: exceeded 30-second deadline; no model prompt was sent.')
        match = re.search(r'PLAYBOOK_LOADED=(\[[^\n]+\])', result.stdout)
        if result.returncode != 0 or not match or sorted(json.loads(match[1])) != sorted(expected) or not expected:
            sys.exit('OMP load check failed: not all declared tools registered.\n' + result.stdout + result.stderr)
        print('OMP load check passed: ' + ', '.join(expected) + ' (no model turn).')


if __name__ == '__main__':
    main()
