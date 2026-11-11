---
description: Point Claude Code's status line at this plugin's statusline.py. Use when the user asks to install or enable the wassimk status line.
user-invocable: true
disable-model-invocation: true
allowed-tools:
  - Bash(which:*)
  - Bash(python3:*)
  - Read
  - Write
  - Edit
  - AskUserQuestion
---

# Install the status line

1. Check that `python3` and `git` are available with `which`. If either is missing, say what is needed and stop.
2. Resolve the Claude Code config directory from `CLAUDE_CONFIG_DIR`, falling back to `~/.claude`, and expand it to an absolute path. Read `<config>/plugins/known_marketplaces.json` and use the `wassimk` entry's `installLocation` when present; otherwise use `<config>/plugins/marketplaces/wassimk`. The script path is `<installLocation>/plugins/statusline/statusline.py`. This marketplace checkout keeps the same path across plugin updates. Never use `${CLAUDE_PLUGIN_ROOT}` or the plugin's versioned cache path, which change with each version.
3. Confirm the script exists at that path. If it does not, say the `wassimk` marketplace needs to be added or updated (`/plugin marketplace update wassimk`) and stop.
4. Read `<config>/settings.json` if it exists. It must be a JSON object; if it is invalid JSON, stop without changing it. If `statusLine` is already set, show its current value and ask before replacing it. Leave it alone unless the user agrees.
5. Set only the `statusLine` key, keeping every other setting, and write valid JSON with a trailing newline:

   ```json
   {
     "statusLine": {
       "type": "command",
       "command": "python3 <script path>"
     }
   }
   ```

   Quote the path if it contains spaces. Create the file if it does not exist.
6. Read the file back to confirm the other settings are intact and `statusLine.command` points at the marketplace checkout. Claude Code reloads user settings when they are saved.
7. Tell the user the status line now runs from the marketplace checkout, so it keeps working if they uninstall this plugin, and stops working if they remove the `wassimk` marketplace. `/statusline:uninstall` removes the setting.
