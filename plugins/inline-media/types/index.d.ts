export type ConvertedPaths = Record<string, string>
export type ExpandedIds = string[]
export type VideoInfo = { source: string; poster: string; width: number; height: number; name: string; seconds: number }
export type Videos = Record<string, VideoInfo>

declare module 'claude-code' {
  interface PluginState {
    'inline-media': { converted: ConvertedPaths; expanded: ExpandedIds; videos: Videos }
  }
}
