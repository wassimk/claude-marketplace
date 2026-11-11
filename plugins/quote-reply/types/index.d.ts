export type QuotedText = string

declare module 'claude-code' {
  interface PluginState {
    'quote-reply': { lastQuoted: QuotedText }
  }
}
