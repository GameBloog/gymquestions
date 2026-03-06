import { describe, expect, it } from "vitest"
import {
  aggregateClicks,
  buildDateKey,
  buildRecentDateKeys,
  normalizeSlug,
} from "@/application/use-cases/lead-link/lead-link-utils"

describe("LeadLinkUtils", () => {
  it("should normalize slug removing accents and invalid chars", () => {
    expect(normalizeSlug("  Campanha São João 2026!!!  ")).toBe(
      "campanha-sao-joao-2026",
    )
  })

  it("should aggregate unique clicks by link + day + fingerprint", () => {
    const events = [
      {
        leadLinkId: "link-1",
        clickedAt: new Date("2026-03-01T12:00:00.000Z"),
        fingerprint: "fp-1",
      },
      {
        leadLinkId: "link-1",
        clickedAt: new Date("2026-03-01T12:10:00.000Z"),
        fingerprint: "fp-1",
      },
      {
        leadLinkId: "link-1",
        clickedAt: new Date("2026-03-01T13:00:00.000Z"),
        fingerprint: "fp-2",
      },
      {
        leadLinkId: "link-1",
        clickedAt: new Date("2026-03-02T13:00:00.000Z"),
        fingerprint: "fp-1",
      },
    ]

    const aggregated = aggregateClicks(events, "America/Sao_Paulo")

    expect(aggregated.totalByLink.get("link-1")).toBe(4)
    expect(aggregated.uniqueByLink.get("link-1")).toBe(3)
  })

  it("should generate sequential date keys in configured timezone", () => {
    const keys = buildRecentDateKeys(
      3,
      new Date("2026-03-06T12:00:00.000Z"),
      "America/Sao_Paulo",
    )

    expect(keys).toEqual(["2026-03-04", "2026-03-05", "2026-03-06"])
    expect(buildDateKey(new Date("2026-03-06T12:00:00.000Z"), "America/Sao_Paulo")).toBe(
      "2026-03-06",
    )
  })
})
