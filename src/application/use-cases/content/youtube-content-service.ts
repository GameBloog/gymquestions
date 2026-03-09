import { env } from "@/env"

const DEFAULT_YOUTUBE_HANDLE = "gforce.oficialbr"
const YOUTUBE_API_BASE_URL = "https://www.googleapis.com/youtube/v3"
const EXTERNAL_FETCH_TIMEOUT_MS = 3500

interface YoutubeChannelListResponse {
  items?: Array<{
    id?: string
    snippet?: {
      title?: string
    }
  }>
}

interface YoutubeSearchResponse {
  items?: Array<{
    id?: {
      videoId?: string
    }
    snippet?: {
      title?: string
      publishedAt?: string
      channelTitle?: string
      thumbnails?: {
        maxres?: { url?: string }
        standard?: { url?: string }
        high?: { url?: string }
        medium?: { url?: string }
        default?: { url?: string }
      }
    }
  }>
}

export interface YoutubeLatestVideo {
  videoId: string
  title: string
  publishedAt: string
  thumbnailUrl: string
  watchUrl: string
  embedUrl: string
  channelTitle: string
}

export interface YoutubeLatestContent {
  video: YoutubeLatestVideo | null
  channelUrl: string
  cached: boolean
  fetchedAt: string | null
  stale: boolean
}

interface YoutubeCacheEntry {
  video: YoutubeLatestVideo | null
  channelUrl: string
  fetchedAt: string | null
  expiresAt: number
}

const parseHandleFromUrl = (raw: string): string | null => {
  const value = raw.trim()

  if (!value.includes("youtube.com")) {
    return null
  }

  const withProtocol =
    value.startsWith("http://") || value.startsWith("https://")
      ? value
      : `https://${value}`

  try {
    const url = new URL(withProtocol)
    const handleMatch = url.pathname.match(/\/@([^/?#]+)/)
    return handleMatch?.[1] || null
  } catch {
    return null
  }
}

const normalizeHandle = (raw: string | undefined): string => {
  const base = raw?.trim() || DEFAULT_YOUTUBE_HANDLE
  const fromUrl = parseHandleFromUrl(base)
  const handleRaw = fromUrl || base

  return handleRaw
    .replace(/^@/, "")
    .trim()
    .replace(/\/+$/g, "")
}

const buildChannelUrl = (handle: string, channelId?: string): string => {
  if (handle) {
    return `https://www.youtube.com/@${handle}`
  }

  if (channelId) {
    return `https://www.youtube.com/channel/${channelId}`
  }

  return "https://www.youtube.com"
}

const pickThumbnailUrl = (
  thumbnails: YoutubeSearchResponse["items"] extends Array<infer T>
    ? T extends { snippet?: infer S }
      ? S extends { thumbnails?: infer U }
        ? U
        : never
      : never
    : never,
): string | null => {
  if (!thumbnails) {
    return null
  }

  return (
    thumbnails.maxres?.url ||
    thumbnails.standard?.url ||
    thumbnails.high?.url ||
    thumbnails.medium?.url ||
    thumbnails.default?.url ||
    null
  )
}

export class YoutubeContentService {
  private cache: YoutubeCacheEntry | null = null

  async getLatestVideo(): Promise<YoutubeLatestContent> {
    const handle = normalizeHandle(env.YOUTUBE_CHANNEL_HANDLE)
    const fallbackChannelUrl = buildChannelUrl(handle)

    const now = Date.now()
    if (this.cache && this.cache.expiresAt > now) {
      return {
        video: this.cache.video,
        channelUrl: this.cache.channelUrl,
        cached: true,
        fetchedAt: this.cache.fetchedAt,
        stale: false,
      }
    }

    if (!env.YOUTUBE_API_KEY) {
      return {
        video: null,
        channelUrl: fallbackChannelUrl,
        cached: false,
        fetchedAt: null,
        stale: false,
      }
    }

    try {
      const channel = await this.resolveChannel(handle, env.YOUTUBE_API_KEY)
      const channelUrl = buildChannelUrl(handle, channel.id)
      const video = await this.fetchLatestChannelVideo(
        channel.id,
        channel.title,
        env.YOUTUBE_API_KEY,
      )
      const fetchedAt = new Date().toISOString()

      this.cache = {
        video,
        channelUrl,
        fetchedAt,
        expiresAt: now + env.YOUTUBE_LATEST_CACHE_TTL_SECONDS * 1000,
      }

      return {
        video,
        channelUrl,
        cached: false,
        fetchedAt,
        stale: false,
      }
    } catch {
      if (this.cache) {
        return {
          video: this.cache.video,
          channelUrl: this.cache.channelUrl,
          cached: true,
          fetchedAt: this.cache.fetchedAt,
          stale: true,
        }
      }

      return {
        video: null,
        channelUrl: fallbackChannelUrl,
        cached: false,
        fetchedAt: null,
        stale: false,
      }
    }
  }

  private async resolveChannel(
    handle: string,
    apiKey: string,
  ): Promise<{ id: string; title: string }> {
    const url = new URL(`${YOUTUBE_API_BASE_URL}/channels`)
    url.searchParams.set("part", "id,snippet")
    url.searchParams.set("forHandle", handle)
    url.searchParams.set("key", apiKey)

    const payload = await this.fetchJson<YoutubeChannelListResponse>(url)
    const channel = payload.items?.[0]

    if (!channel?.id) {
      throw new Error("Canal do YouTube não encontrado")
    }

    return {
      id: channel.id,
      title: channel.snippet?.title || "YouTube",
    }
  }

  private async fetchLatestChannelVideo(
    channelId: string,
    fallbackChannelTitle: string,
    apiKey: string,
  ): Promise<YoutubeLatestVideo | null> {
    const url = new URL(`${YOUTUBE_API_BASE_URL}/search`)
    url.searchParams.set("part", "snippet")
    url.searchParams.set("channelId", channelId)
    url.searchParams.set("order", "date")
    url.searchParams.set("type", "video")
    url.searchParams.set("maxResults", "1")
    url.searchParams.set("key", apiKey)

    const payload = await this.fetchJson<YoutubeSearchResponse>(url)
    const item = payload.items?.[0]
    const videoId = item?.id?.videoId

    if (!videoId) {
      return null
    }

    const thumbnailUrl = pickThumbnailUrl(item.snippet?.thumbnails)
    const title = item.snippet?.title?.trim() || "Novo vídeo no canal da G-Force"
    const publishedAt = item.snippet?.publishedAt || new Date().toISOString()

    return {
      videoId,
      title,
      publishedAt,
      thumbnailUrl:
        thumbnailUrl ||
        `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
      watchUrl: `https://www.youtube.com/watch?v=${videoId}`,
      embedUrl: `https://www.youtube.com/embed/${videoId}`,
      channelTitle: item.snippet?.channelTitle || fallbackChannelTitle,
    }
  }

  private async fetchJson<T>(url: URL): Promise<T> {
    const response = await fetch(url.toString(), {
      signal: AbortSignal.timeout(EXTERNAL_FETCH_TIMEOUT_MS),
    })

    if (!response.ok) {
      throw new Error(`YouTube API HTTP ${response.status}`)
    }

    return (await response.json()) as T
  }
}
