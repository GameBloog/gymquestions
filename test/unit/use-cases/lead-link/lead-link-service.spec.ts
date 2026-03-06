import { beforeEach, describe, expect, it, vi } from "vitest"

interface PrismaLeadLinkMock {
  findUnique: ReturnType<typeof vi.fn>
  findFirst: ReturnType<typeof vi.fn>
  findMany: ReturnType<typeof vi.fn>
  create: ReturnType<typeof vi.fn>
  update: ReturnType<typeof vi.fn>
}

interface PrismaLeadClickEventMock {
  findMany: ReturnType<typeof vi.fn>
  create: ReturnType<typeof vi.fn>
}

interface PrismaLeadAttributionMock {
  findMany: ReturnType<typeof vi.fn>
  upsert: ReturnType<typeof vi.fn>
}

interface PrismaMock {
  leadLink: PrismaLeadLinkMock
  leadClickEvent: PrismaLeadClickEventMock
  leadAttribution: PrismaLeadAttributionMock
}

const buildPrismaMock = (): PrismaMock => ({
  leadLink: {
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
  leadClickEvent: {
    findMany: vi.fn(),
    create: vi.fn(),
  },
  leadAttribution: {
    findMany: vi.fn(),
    upsert: vi.fn(),
  },
})

let prismaMock: PrismaMock

const importService = async () => {
  vi.resetModules()

  vi.doMock("@/infraestructure/database/prisma", () => ({
    prisma: prismaMock,
  }))

  const module = await import(
    "../../../../src/application/use-cases/lead-link/lead-link-service"
  )

  return module.LeadLinkService
}

describe("LeadLinkService", () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    prismaMock = buildPrismaMock()

    process.env.NOTIFICATION_TIMEZONE = "America/Sao_Paulo"
    process.env.LEAD_TRACKING_SALT = "test-salt-123456789"
  })

  it("should create lead link with unique slug suffix when first slug is taken", async () => {
    prismaMock.leadLink.findUnique
      .mockResolvedValueOnce({ id: "existing" })
      .mockResolvedValueOnce(null)

    prismaMock.leadLink.create.mockResolvedValue({
      id: "lead-1",
      slug: "instagram-marco-2",
      nome: "Instagram Marco",
      canal: "Instagram",
      origem: "Bio",
      ativo: true,
      createdBy: "admin-1",
      createdAt: new Date(),
      updatedAt: new Date(),
    })

    const LeadLinkService = await importService()
    const service = new LeadLinkService()

    const result = await service.createLeadLink("admin-1", {
      nome: "Instagram Marco",
      canal: "Instagram",
      origem: "Bio",
      slug: "instagram-marco",
    })

    expect(prismaMock.leadLink.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          slug: "instagram-marco-2",
        }),
      }),
    )
    expect(result.landingPath).toBe("/landing?lead=instagram-marco-2")
  })

  it("should track click and persist hashed identifiers", async () => {
    prismaMock.leadLink.findFirst.mockResolvedValue({ id: "lead-1" })
    prismaMock.leadClickEvent.create.mockResolvedValue({ id: "click-1" })

    const LeadLinkService = await importService()
    const service = new LeadLinkService()

    const result = await service.trackClick(
      {
        leadSlug: "instagram bio",
        path: "/landing",
        utmCampaign: "marco-2026",
      },
      {
        ip: "187.22.1.5",
        userAgent: "Mozilla/5.0",
      },
    )

    expect(result).toEqual({ tracked: true })

    const payload = prismaMock.leadClickEvent.create.mock.calls[0][0].data
    expect(payload.ipHash).toBeTypeOf("string")
    expect(payload.uaHash).toBeTypeOf("string")
    expect(payload.fingerprint).toBeTypeOf("string")
    expect(payload.ipHash).not.toBe("187.22.1.5")
    expect(payload.fingerprint.length).toBe(64)
  })

  it("should return tracked false when lead slug does not exist", async () => {
    prismaMock.leadLink.findFirst.mockResolvedValue(null)

    const LeadLinkService = await importService()
    const service = new LeadLinkService()

    const result = await service.trackClick(
      {
        leadSlug: "inexistente",
      },
      {
        ip: "1.1.1.1",
      },
    )

    expect(result).toEqual({ tracked: false })
    expect(prismaMock.leadClickEvent.create).not.toHaveBeenCalled()
  })

  it("should aggregate analytics cards with unique clicks and conversions", async () => {
    const now = new Date()

    prismaMock.leadLink.findMany.mockResolvedValue([
      {
        id: "lead-1",
        slug: "instagram",
        nome: "Instagram",
        canal: "Instagram",
        origem: "Bio",
        ativo: true,
        createdBy: "admin-1",
        createdAt: now,
        updatedAt: now,
      },
      {
        id: "lead-2",
        slug: "parceria",
        nome: "Parceria",
        canal: "Indicacao",
        origem: "Personal",
        ativo: true,
        createdBy: "admin-1",
        createdAt: now,
        updatedAt: now,
      },
    ])

    prismaMock.leadClickEvent.findMany.mockResolvedValue([
      { leadLinkId: "lead-1", clickedAt: now, fingerprint: "fp-1" },
      { leadLinkId: "lead-1", clickedAt: now, fingerprint: "fp-1" },
      { leadLinkId: "lead-1", clickedAt: now, fingerprint: "fp-2" },
      { leadLinkId: "lead-2", clickedAt: now, fingerprint: "fp-3" },
    ])

    prismaMock.leadAttribution.findMany.mockResolvedValue([
      { leadLinkId: "lead-1", attributedAt: now },
      { leadLinkId: "lead-2", attributedAt: now },
    ])

    const LeadLinkService = await importService()
    const service = new LeadLinkService()

    const analytics = await service.getAnalytics({ range: 7 })

    expect(analytics.cards.clicksTotal).toBe(4)
    expect(analytics.cards.clicksUnique).toBe(3)
    expect(analytics.cards.novosCadastros).toBe(2)
    expect(analytics.cards.conversao).toBe(66.67)
    expect(analytics.topLinks.length).toBe(2)
    expect(analytics.series.length).toBe(7)
  })

  it("should block update when slug is already in use", async () => {
    prismaMock.leadLink.findUnique.mockResolvedValue({
      id: "lead-1",
      slug: "instagram",
      nome: "Instagram",
      canal: null,
      origem: null,
      ativo: true,
      createdBy: "admin-1",
      createdAt: new Date(),
      updatedAt: new Date(),
    })

    prismaMock.leadLink.findFirst.mockResolvedValue({ id: "lead-2" })

    const LeadLinkService = await importService()
    const service = new LeadLinkService()

    await expect(
      service.updateLeadLink("lead-1", {
        slug: "parceria",
      }),
    ).rejects.toMatchObject({
      message: "Slug já está em uso",
      statusCode: 409,
    })
  })
})
