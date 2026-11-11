import { atom, read, update } from 'claude-code'
import type { Register } from 'claude-code'

// The text last quoted, so c types normally until something new is highlighted.
const lastQuoted = atom({ plugin: 'quote-reply', key: 'lastQuoted' } as const, '')

// Off while testing the terminal's own highlight behavior; true turns the c shortcut back on.
const ENABLED = true

function asQuote(text: string) {
  return text
    .trim()
    .split('\n')
    .map(line => (line.trim() === '' ? '>' : `> ${line}`))
    .join('\n')
}

// Draft plus a quote of `text`, one blank line from what is already there.
function withQuote(draft: string, text: string) {
  const gap = draft === '' ? '' : draft.endsWith('\n\n') ? '' : draft.endsWith('\n') ? '\n' : '\n\n'
  return `${draft}${gap}${asQuote(text)}\n\n`
}

export const register: Register = on => {
  if (!ENABLED) {
    return
  }

  // The selection the last keystroke saw, so `c` only quotes as the first key after a new highlight.
  let seenAtLastKey = ''

  on('prompt.edit', async ($, e, next) => {
    if (!e.key) {
      return next(e)
    }

    const sel = (await $.ui.selection())?.text.trim() ?? ''
    const isFresh = sel !== '' && sel !== seenAtLastKey && sel !== (await read($, lastQuoted))
    seenAtLastKey = sel

    const isBareC = e.inputText === 'c' && !e.key.ctrl && !e.key.meta
    if (!isFresh || !isBareC) {
      return next(e)
    }

    await update($, lastQuoted, () => sel)
    const text = withQuote(e.text, sel)
    return { text, cursor: text.length }
  }).catch(($, e, next) => next(e))
}
