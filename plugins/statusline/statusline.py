#!/usr/bin/env python3
"""Claude Code status line: folder and branch, model, context, rate limits.

Prints `folder(branch) · model · Context: N% · Limits: 5h:N% 7d:N%`. Every
segment comes from the JSON Claude Code sends on stdin and is skipped when
that field is missing, so the line adapts to the plan: rate limits show only
on plans that have them.

When running inside herdr (HERDR_ENV=1), it also renames the herdr pane to
the Claude session name.
"""
import json
import os
import subprocess
import sys

RED = "\033[31m"
YELLOW = "\033[33m"
RESET = "\033[0m"


def git_branch(cwd):
    try:
        out = subprocess.run(
            ["git", "-C", cwd, "rev-parse", "--abbrev-ref", "HEAD"],
            capture_output=True, text=True, timeout=2,
        )
        branch = out.stdout.strip()
        return branch if out.returncode == 0 and branch else None
    except (OSError, subprocess.SubprocessError):
        return None


def colored_percent(text, pct):
    if pct >= 80:
        return f"{RED}{text}{RESET}"
    if pct >= 50:
        return f"{YELLOW}{text}{RESET}"
    return text


def build_statusline(hook_input):
    parts = []

    cwd_full = hook_input.get("cwd") or os.environ.get("PWD", "")
    cwd_name = os.path.basename(cwd_full.rstrip("/")) if cwd_full else ""
    branch = git_branch(cwd_full) if cwd_full else None
    if cwd_name:
        parts.append(f"{cwd_name}({branch})" if branch else cwd_name)

    model = (hook_input.get("model") or {}).get("display_name")
    if model:
        parts.append(model)

    used_pct = (hook_input.get("context_window") or {}).get("used_percentage")
    if used_pct is not None:
        used_int = round(used_pct)
        parts.append(colored_percent(f"Context: {used_int}%", used_int))

    rate_limits = hook_input.get("rate_limits") or {}
    rate_parts = []
    for key, label in (("five_hour", "5h"), ("seven_day", "7d")):
        pct = (rate_limits.get(key) or {}).get("used_percentage")
        if pct is not None:
            rate_parts.append(f"{label}:{round(pct)}%")
    if rate_parts:
        parts.append(f"Limits: {' '.join(rate_parts)}")

    return " · ".join(parts)


def sync_herdr_pane_title(hook_input):
    """Rename the herdr pane to the Claude session name when it changes.

    `session_name` is the /rename (or --name) title when set, otherwise the
    generated title. The last synced name is remembered per pane so herdr is
    only called when the name actually changes.
    """
    pane_id = os.environ.get("HERDR_PANE_ID")
    name = (hook_input.get("session_name") or "").strip()
    if os.environ.get("HERDR_ENV") != "1" or not pane_id or not name:
        return
    state_dir = os.path.join(os.environ.get("TMPDIR", "/tmp"), "claude-herdr-pane-titles")
    state_file = os.path.join(state_dir, pane_id.replace(":", "_"))
    try:
        with open(state_file) as fh:
            if fh.read() == name:
                return
    except OSError:
        pass
    herdr = os.environ.get("HERDR_BIN_PATH") or "herdr"
    try:
        subprocess.Popen(
            [herdr, "pane", "rename", pane_id, name],
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
            start_new_session=True,
        )
        os.makedirs(state_dir, exist_ok=True)
        with open(state_file, "w") as fh:
            fh.write(name)
    except OSError:
        pass


def main():
    try:
        hook_input = json.load(sys.stdin)
    except (json.JSONDecodeError, ValueError):
        hook_input = {}
    sync_herdr_pane_title(hook_input)
    print(build_statusline(hook_input), end="")


if __name__ == "__main__":
    main()
