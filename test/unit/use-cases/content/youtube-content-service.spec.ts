import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const asResponse = (data: unknown, ok = true, status = 200): Response =>
  ({
    ok,
    status,
    json: async () => data,
  }) as Response

const importService = async () => {
  vi.resetModules()
  const module = await import(
    "../../../../src/application/use-cases/content/youtube-content-service"
  )
  return module.YoutubeContentService
}

describe("YoutubeContentService", () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    process.env.YOUTUBE_API_KEY = "test-youtube-key"
    process.env.YOUTUBE_CHANNEL_HANDLE = "gforce.oficialbr"
    process.env.YOUTUBE_LATEST_CACHE_TTL_SECONDS = "86400"
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    delete process.env.YOUTUBE_API_KEY
    delete process.env.YOUTUBE_CHANNEL_HANDLE
    delete process.env.YOUTUBE_LATEST_CACHE_TTL_SECONDS
  })

  it("should resolve handle gforce.oficialbr when env is a full @ URL", async () => {
    process.env.YOUTUBE_CHANNEL_HANDLE = "https://www.youtube.com/@gforce.oficialbr"

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        asResponse({
          items: [{ id: "UC_CHANNEL_123", snippet: { title: "G-Force" } }],
        }),
      )
      .mockResolvedValueOnce(
        asResponse({
          items: [
            {
              id: { videoId: "abc123" },
              snippet: {
                title: "Novo vídeo",
                publishedAt: "2026-03-05T21:00:00Z",
                channelTitle: "G-Force",
                thumbnails: {
                  high: { url: "https://img.youtube.com/vi/abc123/hqdefault.jpg" },
                },
              },
            },
          ],
        }),
      )

    vi.stubGlobal("fetch", fetchMock)

    const YoutubeContentService = await importService()
    const service = new YoutubeContentService()
    await service.getLatestVideo()

    const firstCall = String(fetchMock.mock.calls[0][0])
    expect(firstCall).toContain("/channels?")
    expect(firstCall).toContain("forHandle=gforce.oficialbr")
  })

  it("should return normalized latest video when YouTube API responds", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        asResponse({
          items: [{ id: "UC_CHANNEL_123", snippet: { title: "G-Force Oficial" } }],
        }),
      )
      .mockResolvedValueOnce(
        asResponse({
          items: [
            {
              id: { videoId: "abc123" },
              snippet: {
                title: "Treino da semana",
                publishedAt: "2026-03-05T19:00:00Z",
                channelTitle: "G-Force Oficial",
                thumbnails: {
                  maxres: { url: "https://img.youtube.com/vi/abc123/maxresdefault.jpg" },
                },
              },
            },
          ],
        }),
      )

    vi.stubGlobal("fetch", fetchMock)

    const YoutubeContentService = await importService()
    const service = new YoutubeContentService()
    const result = await service.getLatestVideo()

    expect(result.cached).toBe(false)
    expect(result.stale).toBe(false)
    expect(result.channelUrl).toBe("https://www.youtube.com/@gforce.oficialbr")
    expect(result.fetchedAt).toBeTypeOf("string")
    expect(result.video).toEqual({
      videoId: "abc123",
      title: "Treino da semana",
      publishedAt: "2026-03-05T19:00:00Z",
      thumbnailUrl: "https://img.youtube.com/vi/abc123/maxresdefault.jpg",
      watchUrl: "https://www.youtube.com/watch?v=abc123",
      embedUrl: "https://www.youtube.com/embed/abc123",
      channelTitle: "G-Force Oficial",
    })
  })

  it("should use cache without new API calls while cache is valid", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        asResponse({
          items: [{ id: "UC_CHANNEL_123", snippet: { title: "G-Force Oficial" } }],
        }),
      )
      .mockResolvedValueOnce(
        asResponse({
          items: [
            {
              id: { videoId: "abc123" },
              snippet: {
                title: "Treino da semana",
                publishedAt: "2026-03-05T19:00:00Z",
                channelTitle: "G-Force Oficial",
                thumbnails: {
                  high: { url: "https://img.youtube.com/vi/abc123/hqdefault.jpg" },
                },
              },
            },
          ],
        }),
      )

    vi.stubGlobal("fetch", fetchMock)

    const YoutubeContentService = await importService()
    const service = new YoutubeContentService()

    const first = await service.getLatestVideo()
    const second = await service.getLatestVideo()

    expect(first.cached).toBe(false)
    expect(second.cached).toBe(true)
    expect(second.stale).toBe(false)
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it("should return stale cache when API fails and cache exists", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        asResponse({
          items: [{ id: "UC_CHANNEL_123", snippet: { title: "G-Force Oficial" } }],
        }),
      )
      .mockResolvedValueOnce(
        asResponse({
          items: [
            {
              id: { videoId: "abc123" },
              snippet: {
                title: "Treino da semana",
                publishedAt: "2026-03-05T19:00:00Z",
                channelTitle: "G-Force Oficial",
                thumbnails: {
                  high: { url: "https://img.youtube.com/vi/abc123/hqdefault.jpg" },
                },
              },
            },
          ],
        }),
      )

    vi.stubGlobal("fetch", fetchMock)

    const YoutubeContentService = await importService()
    const service = new YoutubeContentService()
    await service.getLatestVideo()

    const cacheEntry = (service as unknown as { cache: { expiresAt: number } }).cache
    cacheEntry.expiresAt = Date.now() - 1

    fetchMock.mockRejectedValueOnce(new Error("network down"))

    const staleResult = await service.getLatestVideo()

    expect(staleResult.cached).toBe(true)
    expect(staleResult.stale).toBe(true)
    expect(staleResult.video?.videoId).toBe("abc123")
  })

  it("should return null video when API is unavailable and no cache exists", async () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error("api unavailable"))
    vi.stubGlobal("fetch", fetchMock)

    const YoutubeContentService = await importService()
    const service = new YoutubeContentService()
    const result = await service.getLatestVideo()

    expect(result.video).toBeNull()
    expect(result.cached).toBe(false)
    expect(result.stale).toBe(false)
    expect(result.fetchedAt).toBeNull()
    expect(result.channelUrl).toBe("https://www.youtube.com/@gforce.oficialbr")
  })
})
