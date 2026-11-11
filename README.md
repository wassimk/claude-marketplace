# claude-marketplace

My Claude Code plugins and mods.

## Install

Add a plugin from a Claude Code terminal session:

```
/plugin install inline-media --marketplace wassimk/claude-marketplace
/plugin install quote-reply --marketplace wassimk/claude-marketplace
/plugin install statusline --marketplace wassimk/claude-marketplace
```

From a shell:

```
claude plugin install inline-media --marketplace wassimk/claude-marketplace
```

In the desktop app, click + next to the prompt box, then Plugins, Add marketplace with `wassimk/claude-marketplace`, then Add plugin.

## Plugins

### inline-media

Shows media inline in the transcript.

- **Images**: when Claude reads an image, it's drawn under the Read row, including inside collapsed "Read N files" lines. Click the file name to expand it to the full transcript width. JPEG, GIF and WebP are converted to PNG with `sips`.
- **Video**: Claude can call the `play_video` tool to show a poster frame with a button that plays the file in QuickTime Player.

Requires a terminal that draws kitty graphics (kitty, Ghostty, or another terminal with kitty graphics support), fullscreen rendering for some terminals, and macOS for `sips`, `ffmpeg`/`ffprobe` (video) and QuickTime.

If images show up as a dim `[image WxH]` label even though your terminal supports kitty graphics, Claude Code didn't recognize the terminal. Set `CLAUDE_CODE_FORCE_TERMINAL_IMAGES=1` in the `env` block of your `~/.claude/settings.json` and restart Claude Code:

```json
{
  "env": {
    "CLAUDE_CODE_FORCE_TERMINAL_IMAGES": "1"
  }
}
```

Only set it in a terminal that supports kitty graphics. The [environment variables docs](https://code.claude.com/docs/en/env-vars) link to the list of terminals where it doesn't belong.

### quote-reply

Highlight text in the transcript with the mouse, then press `c`. The text lands in your prompt as a `>` quote with the cursor below it, ready for your reply. Repeat for as many passages as you like, then press Return.

`c` only quotes when it's the first key after a new highlight, so typing normally is unaffected. Requires fullscreen rendering (`/tui fullscreen`).

### statusline

A simple status line:

```
claude-marketplace(main) · Opus 5.5 · Context: 61% · Limits: 5h:47% 7d:83%
```

Folder and git branch, model, context usage (yellow from 50%, red from 80%), and the 5-hour and 7-day rate limits on plans that have them. Each segment is skipped when Claude Code doesn't send it. Inside herdr it also renames the pane to the session name.

After installing, run `/statusline:install` to point your `statusLine` setting at the script. The setting uses the marketplace's own checkout, so it keeps working if you uninstall the plugin afterwards, and it stops working if you remove the marketplace. `/statusline:uninstall` removes the setting. Requires Python 3 and git.
