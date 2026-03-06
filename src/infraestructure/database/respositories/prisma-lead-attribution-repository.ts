import {
  LeadAttributionRepository,
  LeadLinkLookup,
} from "@/application/repositories/lead-attribution-repository"
import { LeadAttributionModel } from "@prisma/client"
import { prisma } from "../prisma"

export class PrismaLeadAttributionRepository
  implements LeadAttributionRepository
{
  async findActiveLeadLinkBySlug(slug: string): Promise<LeadLinkLookup | null> {
    const link = await prisma.leadLink.findFirst({
      where: {
        slug,
        ativo: true,
      },
      select: {
        id: true,
      },
    })

    return link
  }

  async createFirstTouchAttribution(input: {
    leadLinkId: string
    userId: string
  }): Promise<void> {
    await prisma.leadAttribution.upsert({
      where: {
        userId: input.userId,
      },
      create: {
        leadLinkId: input.leadLinkId,
        userId: input.userId,
        modelo: LeadAttributionModel.FIRST_TOUCH,
      },
      update: {},
    })
  }
}
