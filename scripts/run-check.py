#!/usr/bin/env python3
"""Run a project command with pipefail, bounded time, and an external full log."""
import argparse
from collections import deque
import json
import math
import os
from pathlib import Path
import signal
import subprocess
import tempfile
import time


def run(command, cwd, timeout=120, tail_lines=40):
    started = time.monotonic()
    # A caller can redirect TMPDIR into its repository; do not trust that setting.
    log_root = Path('/tmp' if os.name == 'posix' else tempfile.gettempdir()).resolve()
    with tempfile.NamedTemporaryFile(prefix='playbook-check-', suffix='.log', dir=log_root, delete=False) as log:
        log_path = log.name
        exit_code = None
        status = 'failed'
        message = ''
        try:
            child = subprocess.Popen(['bash', '-o', 'pipefail', '-c', command], cwd=cwd,
                                     stdout=log, stderr=subprocess.STDOUT, start_new_session=True)
            try:
                exit_code = child.wait(timeout=timeout)
                status = 'passed' if exit_code == 0 else 'unavailable' if exit_code == 127 else 'failed'
                if status == 'unavailable':
                    message = 'Command program unavailable (exit 127); not verified, not a task-code failure.'
            except subprocess.TimeoutExpired:
                os.killpg(child.pid, signal.SIGKILL)
                exit_code = child.wait()
                status = 'timed-out'
                message = f'Command exceeded {timeout:g}-second timeout.'
        except FileNotFoundError as error:
            status = 'unavailable' if Path(cwd).is_dir() else 'failed'
            message = str(error)
            log.write((message + '\n').encode())
        except OSError as error:
            message = str(error)
            log.write((message + '\n').encode())
    with open(log_path, encoding='utf-8', errors='replace') as stream:
        tail = ''.join(deque(stream, maxlen=tail_lines))
    return dict(status=status, exitCode=exit_code, duration=time.monotonic() - started,
                tail=tail, logPath=log_path, message=message)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--command', required=True)
    parser.add_argument('--cwd', required=True)
    parser.add_argument('--timeout', type=float, default=120)
    parser.add_argument('--tail-lines', type=int, default=40)
    args = parser.parse_args()
    if not args.command.strip() or not math.isfinite(args.timeout) or not 0 < args.timeout <= 3600 or not 0 <= args.tail_lines <= 1000:
        parser.error('command must be non-empty, timeout in (0, 3600], and tail-lines between 0 and 1000')
    print(json.dumps(run(args.command, args.cwd, args.timeout, args.tail_lines)))


if __name__ == '__main__':
    main()
