import { atom, read, update } from 'claude-code'
import type { Elements, Register, RenderViewport } from 'claude-code'

import type { VideoInfo } from '../types'

// tool_use_id -> PNG path made by sips, or FAILED.
const converted = atom({ plugin: 'inline-media', key: 'converted' } as const, {})
// tool_use_ids drawn at full transcript width.
const expanded = atom({ plugin: 'inline-media', key: 'expanded' } as const, [])
const FAILED = 'failed'
// tool_use_id -> poster frame and details of a play_video call.
// Entries from the earlier frame-player version have no poster; the render hook skips them.
const videos = atom({ plugin: 'inline-media', key: 'videos' } as const, {})

const VIDEO_TOOL = 'mcp__inline-media__play_video'
const POSTER_WIDTH = 960

// After `open -a` hands QuickTime the file (AppleScript's own `open` cannot reach it
// through the sandbox), press play once the document has loaded. The name arrives as argv.
const QUICKTIME_PLAY = [
  'on run argv',
  'tell application "QuickTime Player"',
  'repeat 40 times',
  'try',
  'play (first document whose name is (item 1 of argv))',
  'return',
  'end try',
  'delay 0.25',
  'end repeat',
  'end tell',
  'end run',
]

const COMPACT_COLUMNS = 60
const COMPACT_ROWS = 24

type ImageOutput = {
  type: 'image'
  file: {
    base64: string
    type: string
    dimensions?: { displayWidth?: number; displayHeight?: number; originalWidth?: number; originalHeight?: number }
  }
}

type Source = { png: string } | { file: string; format: 'png' }

type Call = {
  tool_use_id?: string
  tool: string
  input: unknown
  isRunning: boolean
  isErrored: boolean
  output?: unknown
}

type Picture = { id: string; name: string; source: Source | null; width: number; height: number }

type Terminal = Elements['terminal']

function isImageOutput(output: unknown): output is ImageOutput {
  return typeof output === 'object' && output !== null && (output as { type?: unknown }).type === 'image'
}

// Terminal cells are roughly twice as tall as they are wide.
function cellSize(width: number, height: number, maxColumns: number, maxRows: number) {
  let columns = maxColumns
  let rows = Math.round((columns * height) / width / 2)
  if (rows > maxRows) {
    rows = maxRows
    columns = Math.round((rows * 2 * width) / height)
  }
  return { columns: Math.max(1, Math.min(255, columns)), rows: Math.max(1, Math.min(255, rows)) }
}

function pictureFor(map: Record<string, string>, call: Call): Picture | null {
  const { tool, output, isRunning, isErrored, tool_use_id, input } = call
  if (tool !== 'Read' || isRunning || isErrored || !tool_use_id || !isImageOutput(output)) {
    return null
  }

  const filePath = (input as { file_path?: string }).file_path ?? ''
  const { file } = output
  const path = map[tool_use_id]
  let source: Source | null = null
  if (file.type === 'image/png') {
    source = { png: file.base64 }
  } else if (path && path !== FAILED) {
    source = { file: path, format: 'png' }
  }

  const d = file.dimensions ?? {}
  return {
    id: tool_use_id,
    name: filePath.split('/').pop() || 'image',
    source,
    width: d.displayWidth ?? d.originalWidth ?? 16,
    height: d.displayHeight ?? d.originalHeight ?? 9,
  }
}

export const register: Register = on => {
  // Convert non-PNG reads once, when the Read finishes; drawing never starts a process,
  // since a redraw can cancel it.
  on('tool.call', { tool: 'Read' }, async ($, e, next) => {
    const ran = await next(e)
    try {
      if (ran.deny === undefined && ran.isError !== true && isImageOutput(ran.result) && ran.result.file.type !== 'image/png') {
        const out = `/tmp/claude-inline-media-${e.tool_use_id}.png`
        const { exitCode } = await $.process.run(['sips', '-s', 'format', 'png', e.file_path, '--out', out])
        await update($, converted, map => ({ ...map, [e.tool_use_id]: exitCode === 0 ? out : FAILED }))
      }
    } catch {
      // Leave the row as it is; the label still shows there is an image.
    }
    return ran
  }).catch(($, e, next) => next(e))

  type Ctx = { E: Terminal; viewport?: RenderViewport; open: readonly string[]; toggle: (id: string) => void }

  function drawPicture({ E, viewport, open, toggle }: Ctx, p: Picture) {
    const isOpen = open.includes(p.id)
    const size = isOpen
      ? cellSize(p.width, p.height, (viewport?.columns ?? 120) - 6, Math.max(COMPACT_ROWS, (viewport?.rows ?? 50) - 6))
      : cellSize(p.width, p.height, COMPACT_COLUMNS, COMPACT_ROWS)

    return (
      <E.Box key={`pic-${p.id}`} flexDirection="column" paddingLeft={2}>
        <E.Button key={`btn-${p.id}`} onPress={() => toggle(p.id)}>
          ⎿ {p.name} ({p.width}x{p.height}) <E.Text dimColor>{isOpen ? '[collapse]' : '[expand]'}</E.Text>
        </E.Button>
        {p.source ? (
          <E.Image key={`img-${p.id}-${isOpen ? 'l' : 's'}`} source={p.source} columns={size.columns} rows={size.rows} alt={`[image ${p.width}x${p.height}]`} />
        ) : (
          <E.Text dimColor>[image {p.width}x{p.height}]</E.Text>
        )}
      </E.Box>
    )
  }

  on('ui.render', { component: 'ToolUse' }, async ($, e, next) => {
    const row = await next(e)
    if (e.surface !== 'terminal') {
      return row
    }

    const picture = pictureFor(await read($, converted), e.props)
    if (!picture) {
      return row
    }

    const E = $.ui.resolve({ ...e, surface: 'terminal' as const })
    const ctx: Ctx = {
      E,
      viewport: e.viewport,
      open: await read($, expanded),
      toggle: id => void update($, expanded, ids => (ids.includes(id) ? ids.filter(x => x !== id) : [...ids, id])),
    }
    return (
      <E.Box flexDirection="column">
        {row}
        {drawPicture(ctx, picture)}
      </E.Box>
    )
  })

  // Collapsed "Read N files" lines hide their ToolUse rows, so draw the images under the line.
  on('ui.render', { component: 'ToolGroup' }, async ($, e, next) => {
    const line = await next(e)
    if (e.surface !== 'terminal' || e.props.isExpanded) {
      return line
    }

    const map = await read($, converted)
    const pictures = e.props.calls.map(call => pictureFor(map, call)).filter((p): p is Picture => p !== null)
    if (pictures.length === 0) {
      return line
    }

    const E = $.ui.resolve({ ...e, surface: 'terminal' as const })
    const ctx: Ctx = {
      E,
      viewport: e.viewport,
      open: await read($, expanded),
      toggle: id => void update($, expanded, ids => (ids.includes(id) ? ids.filter(x => x !== id) : [...ids, id])),
    }
    return (
      <E.Box flexDirection="column">
        {line}
        {pictures.map(p => drawPicture(ctx, p))}
      </E.Box>
    )
  })

  // ---- Video: an inline poster frame; the button plays the file in QuickTime Player.

  on('session.start', async ($, e, next) => {
    await $.tool.register({
      name: 'play_video',
      description:
        'Show a video file inline in the transcript as a poster frame with a button that plays it in QuickTime Player (with sound). ' +
        'Use when the user wants to see a video.',
      inputSchema: {
        type: 'object',
        properties: { file_path: { type: 'string', description: 'Absolute path to the video file' } },
        required: ['file_path'],
      },
      isDeferred: false,
    })
    return next(e)
  })

  on('tool.call', { tool: VIDEO_TOOL }, async ($, e) => {
    const file = typeof e.file_path === 'string' ? e.file_path : ''
    if (!file.startsWith('/')) {
      return { result: 'file_path must be an absolute path.', isError: true as const }
    }

    const probe = await $.process.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', file])
    if (probe.exitCode !== 0) {
      return { result: `ffprobe could not read ${file}: ${probe.stderr.slice(0, 400)}`, isError: true as const }
    }
    const seconds = Math.round(Number(probe.stdout.trim()) * 10) / 10

    // A frame a little way in avoids a black opening frame.
    const poster = `/tmp/claude-inline-media-video-${e.tool_use_id}.png`
    const at = Math.min(1, seconds / 10).toFixed(2)
    const grab = await $.process.run([
      'ffmpeg', '-v', 'error', '-y', '-ss', at, '-i', file, '-frames:v', '1', '-vf', `scale=${POSTER_WIDTH}:-2`, poster,
    ])
    if (grab.exitCode !== 0) {
      return { result: `ffmpeg could not grab a frame from ${file}: ${grab.stderr.slice(0, 400)}`, isError: true as const }
    }

    const dims = await $.process.run(['sips', '-g', 'pixelWidth', '-g', 'pixelHeight', poster])
    const info: VideoInfo = {
      source: file,
      poster,
      width: Number(/pixelWidth: (\d+)/.exec(dims.stdout)?.[1] ?? POSTER_WIDTH),
      height: Number(/pixelHeight: (\d+)/.exec(dims.stdout)?.[1] ?? 540),
      name: file.split('/').pop() || 'video',
      seconds,
    }
    await update($, videos, map => ({ ...map, [e.tool_use_id]: info }))

    return { result: `Showing ${info.name} inline (${seconds}s). The user can press the button to play it in QuickTime Player.` }
  }).catch(($, e, next) => ({ result: `The video player failed: ${JSON.stringify(next.error)}`, isError: true as const }))

  on('ui.render', { component: 'ToolUse' }, async ($, e, next) => {
    const row = await next(e)
    if (e.surface !== 'terminal' || e.props.tool !== VIDEO_TOOL || e.props.isRunning || e.props.isErrored) {
      return row
    }

    const id = e.props.tool_use_id
    const v = (await read($, videos))[id]
    if (!v || typeof v.poster !== 'string') {
      return row
    }

    const size = cellSize(v.width, v.height, COMPACT_COLUMNS, COMPACT_ROWS)
    const E = $.ui.resolve({ ...e, surface: 'terminal' as const })
    const playInQuickTime = async () => {
      await $.process.run(['open', '-a', 'QuickTime Player', v.source])
      await $.process.run(['osascript', ...QUICKTIME_PLAY.flatMap(line => ['-e', line]), v.name])
    }

    return (
      <E.Box flexDirection="column">
        {row}
        <E.Box flexDirection="column" paddingLeft={2}>
          <E.Image key={`poster-${id}`} source={{ file: v.poster, format: 'png' }} columns={size.columns} rows={size.rows} alt={`[video ${v.name}]`} />
          <E.Box>
            <E.Button key={`qt-${id}`} onPress={() => void playInQuickTime()}>
              ▶ Play in QuickTime
            </E.Button>
            <E.Text dimColor>
              {'  '}
              {v.name} · {v.seconds}s
            </E.Text>
          </E.Box>
        </E.Box>
      </E.Box>
    )
  })
}
