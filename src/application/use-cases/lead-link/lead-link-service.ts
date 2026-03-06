import { LeadAttributionModel } from "@prisma/client"
import { createHash } from "crypto"
import { env } from "@/env"
import { prisma } from "@/infraestructure/database/prisma"
import { AppError } from "@/shared/errors/app-error"
import {
  aggregateClicks,
  buildDateKey,
  buildRecentDateKeys,
  normalizeSlug,
} from "./lead-link-utils"

const ALLOWED_RANGES = new Set([7, 30, 90])
const DEFAULT_RANGE = 30
const RANGE_BUFFER_DAYS = 2

export interface CreateLeadLinkInput {
  nome: string
  canal?: string
  origem?: string
  slug?: string
}

export interface UpdateLeadLinkInput {
  nome?: string
  canal?: string | null
  origem?: string | null
  slug?: string
  ativo?: boolean
}

export interface ListLeadLinksInput {
  range?: number
}

export interface AnalyticsInput {
  range?: number
}

export interface TrackLeadClickInput {
  leadSlug: string
  referrer?: string
  path?: string
  utmSource?: string
  utmMedium?: string
  utmCampaign?: string
  utmContent?: string
  utmTerm?: string
}

export interface TrackLeadClickMeta {
  ip?: string
  userAgent?: string
}

interface LeadMetricsData {
  rangeDays: number
  dateKeys: string[]
  links: Array<{
    id: string
    slug: string
    nome: string
    canal: string | null
    origem: string | null
    ativo: boolean
    createdBy: string
    createdAt: Date
    updatedAt: Date
  }>
  clicksTotalByLink: Map<string, number>
  clicksUniqueByLink: Map<string, number>
  clicksTotalByDate: Map<string, number>
  clicksUniqueByDate: Map<string, number>
  cadastrosByLink: Map<string, number>
  cadastrosByDate: Map<string, number>
}

const round2 = (value: number) => Math.round(value * 100) / 100

export class LeadLinkService {
  async createLeadLink(createdBy: string, input: CreateLeadLinkInput) {
    const baseSlug =
      normalizeSlug(input.slug || `${input.nome}-${input.canal || ""}`) ||
      "lead"

    const slug = await this.buildUniqueSlug(baseSlug)

    const created = await prisma.leadLink.create({
      data: {
        slug,
        nome: input.nome.trim(),
        canal: input.canal?.trim() || null,
        origem: input.origem?.trim() || null,
        createdBy,
      },
    })

    return {
      ...created,
      landingPath: this.buildLandingPath(created.slug),
    }
  }

  async updateLeadLink(id: string, input: UpdateLeadLinkInput) {
    const existing = await prisma.leadLink.findUnique({ where: { id } })

    if (!existing) {
      throw new AppError("Link de lead não encontrado", 404)
    }

    const data: {
      nome?: string
      canal?: string | null
      origem?: string | null
      slug?: string
      ativo?: boolean
    } = {}

    if (input.nome !== undefined) {
      data.nome = input.nome.trim()
    }

    if (input.canal !== undefined) {
      data.canal = input.canal?.trim() || null
    }

    if (input.origem !== undefined) {
      data.origem = input.origem?.trim() || null
    }

    if (input.ativo !== undefined) {
      data.ativo = input.ativo
    }

    if (input.slug !== undefined) {
      const normalized = normalizeSlug(input.slug)
      if (!normalized) {
        throw new AppError("Slug inválido", 400)
      }

      if (normalized !== existing.slug) {
        const conflict = await prisma.leadLink.findFirst({
          where: {
            slug: normalized,
            id: {
              not: id,
            },
          },
          select: { id: true },
        })

        if (conflict) {
          throw new AppError("Slug já está em uso", 409)
        }
      }

      data.slug = normalized
    }

    const updated = await prisma.leadLink.update({
      where: { id },
      data,
    })

    return {
      ...updated,
      landingPath: this.buildLandingPath(updated.slug),
    }
  }

  async listLeadLinks(input: ListLeadLinksInput) {
    const metrics = await this.collectMetricsData(input.range)

    const items = metrics.links.map((link) => {
      const clicksTotal = metrics.clicksTotalByLink.get(link.id) ?? 0
      const clicksUnique = metrics.clicksUniqueByLink.get(link.id) ?? 0
      const novosCadastros = metrics.cadastrosByLink.get(link.id) ?? 0
      const conversao =
        clicksUnique > 0 ? round2((novosCadastros / clicksUnique) * 100) : 0

      return {
        ...link,
        landingPath: this.buildLandingPath(link.slug),
        clicksTotal,
        clicksUnique,
        novosCadastros,
        conversao,
      }
    })

    return {
      rangeDays: metrics.rangeDays,
      items,
    }
  }

  async getAnalytics(input: AnalyticsInput) {
    const metrics = await this.collectMetricsData(input.range)

    const totalClicks = Array.from(metrics.clicksTotalByLink.values()).reduce(
      (acc, value) => acc + value,
      0,
    )
    const totalUnique = Array.from(metrics.clicksUniqueByLink.values()).reduce(
      (acc, value) => acc + value,
      0,
    )
    const totalCadastros = Array.from(metrics.cadastrosByLink.values()).reduce(
      (acc, value) => acc + value,
      0,
    )

    const conversao =
      totalUnique > 0 ? round2((totalCadastros / totalUnique) * 100) : 0

    const series = metrics.dateKeys.map((date) => ({
      date,
      clicksTotal: metrics.clicksTotalByDate.get(date) ?? 0,
      clicksUnique: metrics.clicksUniqueByDate.get(date) ?? 0,
      novosCadastros: metrics.cadastrosByDate.get(date) ?? 0,
    }))

    const topLinks = metrics.links
      .map((link) => {
        const clicksTotal = metrics.clicksTotalByLink.get(link.id) ?? 0
        const clicksUnique = metrics.clicksUniqueByLink.get(link.id) ?? 0
        const novosCadastros = metrics.cadastrosByLink.get(link.id) ?? 0
        const conversaoLink =
          clicksUnique > 0 ? round2((novosCadastros / clicksUnique) * 100) : 0

        return {
          leadLinkId: link.id,
          slug: link.slug,
          nome: link.nome,
          canal: link.canal,
          origem: link.origem,
          ativo: link.ativo,
          landingPath: this.buildLandingPath(link.slug),
          clicksTotal,
          clicksUnique,
          novosCadastros,
          conversao: conversaoLink,
        }
      })
      .sort((a, b) => {
        if (b.clicksUnique !== a.clicksUnique) {
          return b.clicksUnique - a.clicksUnique
        }

        if (b.clicksTotal !== a.clicksTotal) {
          return b.clicksTotal - a.clicksTotal
        }

        return a.nome.localeCompare(b.nome)
      })

    return {
      rangeDays: metrics.rangeDays,
      cards: {
        clicksTotal: totalClicks,
        clicksUnique: totalUnique,
        novosCadastros: totalCadastros,
        conversao,
      },
      series,
      topLinks,
    }
  }

  async trackClick(input: TrackLeadClickInput, meta: TrackLeadClickMeta) {
    const normalizedSlug = normalizeSlug(input.leadSlug)
    if (!normalizedSlug) {
      throw new AppError("leadSlug inválido", 400)
    }

    const link = await prisma.leadLink.findFirst({
      where: {
        slug: normalizedSlug,
        ativo: true,
      },
      select: {
        id: true,
      },
    })

    if (!link) {
      return { tracked: false }
    }

    const ipHash = meta.ip ? this.hash(meta.ip) : null
    const uaHash = meta.userAgent ? this.hash(meta.userAgent) : null
    const fingerprint = this.hash(
      `${normalizedSlug}:${ipHash ?? "na"}:${uaHash ?? "na"}`,
    )

    await prisma.leadClickEvent.create({
      data: {
        leadLinkId: link.id,
        ipHash,
        uaHash,
        fingerprint,
        referrer: input.referrer?.trim() || null,
        path: input.path?.trim() || null,
        utmSource: input.utmSource?.trim() || null,
        utmMedium: input.utmMedium?.trim() || null,
        utmCampaign: input.utmCampaign?.trim() || null,
        utmContent: input.utmContent?.trim() || null,
        utmTerm: input.utmTerm?.trim() || null,
      },
    })

    return { tracked: true }
  }

  async createAttributionBySlug(slug: string, userId: string) {
    const normalizedSlug = normalizeSlug(slug)
    if (!normalizedSlug) {
      return
    }

    const link = await prisma.leadLink.findFirst({
      where: {
        slug: normalizedSlug,
        ativo: true,
      },
      select: {
        id: true,
      },
    })

    if (!link) {
      return
    }

    await prisma.leadAttribution.upsert({
      where: {
        userId,
      },
      create: {
        leadLinkId: link.id,
        userId,
        modelo: LeadAttributionModel.FIRST_TOUCH,
      },
      update: {},
    })
  }

  private async collectMetricsData(range?: number): Promise<LeadMetricsData> {
    const rangeDays = this.resolveRange(range)
    const now = new Date()
    const dateKeys = buildRecentDateKeys(
      rangeDays,
      now,
      env.NOTIFICATION_TIMEZONE,
    )
    const allowedDateKeys = new Set(dateKeys)
    const start = new Date(
      now.getTime() -
        (rangeDays + RANGE_BUFFER_DAYS) * 24 * 60 * 60 * 1000,
    )

    const [links, clickEvents, attributions] = await Promise.all([
      prisma.leadLink.findMany({
        orderBy: [{ createdAt: "desc" }],
      }),
      prisma.leadClickEvent.findMany({
        where: {
          clickedAt: {
            gte: start,
          },
        },
        select: {
          leadLinkId: true,
          clickedAt: true,
          fingerprint: true,
        },
      }),
      prisma.leadAttribution.findMany({
        where: {
          attributedAt: {
            gte: start,
          },
        },
        select: {
          leadLinkId: true,
          attributedAt: true,
        },
      }),
    ])

    const clickAggregates = aggregateClicks(
      clickEvents,
      env.NOTIFICATION_TIMEZONE,
      allowedDateKeys,
    )

    const cadastrosByLink = new Map<string, number>()
    const cadastrosByDate = new Map<string, number>()

    for (const attribution of attributions) {
      const dateKey = buildDateKey(
        attribution.attributedAt,
        env.NOTIFICATION_TIMEZONE,
      )

      if (!allowedDateKeys.has(dateKey)) {
        continue
      }

      cadastrosByLink.set(
        attribution.leadLinkId,
        (cadastrosByLink.get(attribution.leadLinkId) ?? 0) + 1,
      )
      cadastrosByDate.set(dateKey, (cadastrosByDate.get(dateKey) ?? 0) + 1)
    }

    return {
      rangeDays,
      dateKeys,
      links,
      clicksTotalByLink: clickAggregates.totalByLink,
      clicksUniqueByLink: clickAggregates.uniqueByLink,
      clicksTotalByDate: clickAggregates.totalByDate,
      clicksUniqueByDate: clickAggregates.uniqueByDate,
      cadastrosByLink,
      cadastrosByDate,
    }
  }

  private resolveRange(range?: number): number {
    if (!range) {
      return DEFAULT_RANGE
    }

    return ALLOWED_RANGES.has(range) ? range : DEFAULT_RANGE
  }

  private buildLandingPath(slug: string) {
    return `/landing?lead=${slug}`
  }

  private hash(value: string) {
    return createHash("sha256")
      .update(`${env.LEAD_TRACKING_SALT}:${value}`)
      .digest("hex")
  }

  private async buildUniqueSlug(baseInput: string): Promise<string> {
    const base = normalizeSlug(baseInput) || "lead"
    let attempt = 0

    while (attempt < 100) {
      const suffix = attempt === 0 ? "" : `-${attempt + 1}`
      const maxBaseLength = Math.max(1, 80 - suffix.length)
      const candidateBase = base.slice(0, maxBaseLength).replace(/-+$/g, "")
      const candidate = `${candidateBase || "lead"}${suffix}`

      const exists = await prisma.leadLink.findUnique({
        where: { slug: candidate },
        select: { id: true },
      })

      if (!exists) {
        return candidate
      }

      attempt += 1
    }

    throw new AppError("Não foi possível gerar um slug único", 500)
  }
}
