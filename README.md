# claude-marketplace

My Claude Code plugins and mods.

## Install

Add a plugin from a Claude Code terminal session:

```
/plugin install inline-media --marketplace wassimk/claude-marketplace
/plugin install quote-reply --marketplace wassimk/claude-marketplace
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

### quote-reply

Highlight text in the transcript with the mouse, then press `c`. The text lands in your prompt as a `>` quote with the cursor below it, ready for your reply. Repeat for as many passages as you like, then press Return.

`c` only quotes when it's the first key after a new highlight, so typing normally is unaffected. Requires fullscreen rendering (`/tui fullscreen`).
