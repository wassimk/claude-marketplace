---
description: Remove the wassimk status line from Claude Code's settings. Use when the user asks to disable or uninstall this status line.
user-invocable: true
disable-model-invocation: true
allowed-tools:
  - Read
  - Write
  - Edit
  - AskUserQuestion
---

# Uninstall the status line

1. Resolve the Claude Code config directory from `CLAUDE_CONFIG_DIR`, falling back to `~/.claude`, and read `<config>/settings.json`. If the file is missing or has no `statusLine`, say there is nothing to remove. If the JSON is invalid, stop without changing it.
2. Check that `statusLine.command` runs `plugins/statusline/statusline.py` from the `wassimk` marketplace checkout (the `installLocation` in `<config>/plugins/known_marketplaces.json`, else `<config>/plugins/marketplaces/wassimk`). If it points anywhere else, show the current value and leave it alone.
3. Show the current `statusLine` value and ask the user to confirm removing it.
4. After they confirm, remove only the `statusLine` key, keep every other setting, write valid JSON with a trailing newline, and read the file back to confirm the key is gone.
