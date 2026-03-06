import { z } from "zod"

const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

export const leadLinkIdParamsSchema = z.object({
  id: z.string().uuid(),
})

export const listLeadLinksQuerySchema = z.object({
  range: z.coerce.number().int().optional(),
})

export const analyticsLeadLinksQuerySchema = z.object({
  range: z.coerce.number().int().optional(),
})

export const createLeadLinkSchema = z.object({
  nome: z.string().trim().min(2).max(120),
  canal: z.string().trim().max(80).optional(),
  origem: z.string().trim().max(120).optional(),
  slug: z
    .string()
    .trim()
    .min(3)
    .max(80)
    .regex(slugRegex, "Slug inválido")
    .optional(),
})

export const updateLeadLinkSchema = z
  .object({
    nome: z.string().trim().min(2).max(120).optional(),
    canal: z.string().trim().max(80).nullable().optional(),
    origem: z.string().trim().max(120).nullable().optional(),
    slug: z
      .string()
      .trim()
      .min(3)
      .max(80)
      .regex(slugRegex, "Slug inválido")
      .optional(),
    ativo: z.boolean().optional(),
  })
  .refine(
    (value) =>
      value.nome !== undefined ||
      value.canal !== undefined ||
      value.origem !== undefined ||
      value.slug !== undefined ||
      value.ativo !== undefined,
    {
      message: "Informe ao menos um campo para atualização",
    },
  )

export const trackLeadClickSchema = z.object({
  leadSlug: z.string().trim().min(3).max(80).regex(slugRegex),
  referrer: z.string().trim().max(2048).optional(),
  path: z.string().trim().max(512).optional(),
  utmSource: z.string().trim().max(120).optional(),
  utmMedium: z.string().trim().max(120).optional(),
  utmCampaign: z.string().trim().max(180).optional(),
  utmContent: z.string().trim().max(180).optional(),
  utmTerm: z.string().trim().max(180).optional(),
})
