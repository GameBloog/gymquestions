import { z } from "zod"

const monthRegex = /^\d{4}-(0[1-9]|1[0-2])$/

const monthSchema = z
  .string()
  .regex(monthRegex, "Mês inválido. Use o formato YYYY-MM")

const renewalPlanEnum = z.enum(["COMPLETO", "TREINO", "DIETA"])
const entryTypeEnum = z.enum(["RECEITA", "DESPESA"])
const entryCategoryEnum = z.enum([
  "CAMISA",
  "YOUTUBE",
  "PARCERIA",
  "OUTRA_RECEITA",
  "CUSTO_OPERACIONAL",
  "OUTRA_DESPESA",
])

export const financeDashboardQuerySchema = z.object({
  from: monthSchema.optional(),
  to: monthSchema.optional(),
})

export const financeMonthParamsSchema = z.object({
  month: monthSchema,
})

export const financeRenewalsQuerySchema = z.object({
  month: monthSchema,
})

export const financeRenewalParamsSchema = z.object({
  id: z.string().uuid("ID de renovação inválido"),
})

export const createFinanceRenewalSchema = z.object({
  alunoId: z.string().uuid("ID do aluno inválido"),
  tipoPlano: renewalPlanEnum,
  valor: z.number().positive("Valor deve ser maior que zero"),
  renovadoEm: z.coerce.date(),
  observacao: z.string().trim().max(500).optional().nullable(),
})

export const updateFinanceRenewalSchema = z
  .object({
    alunoId: z.string().uuid("ID do aluno inválido").optional(),
    tipoPlano: renewalPlanEnum.optional(),
    valor: z.number().positive("Valor deve ser maior que zero").optional(),
    renovadoEm: z.coerce.date().optional(),
    observacao: z.string().trim().max(500).optional().nullable(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "Nenhum campo enviado para atualização",
  })

export const financeEntriesQuerySchema = z.object({
  month: monthSchema,
  type: entryTypeEnum.optional(),
})

export const financeEntryParamsSchema = z.object({
  id: z.string().uuid("ID de lançamento inválido"),
})

export const createFinanceEntrySchema = z.object({
  tipo: entryTypeEnum,
  categoria: entryCategoryEnum,
  valor: z.number().positive("Valor deve ser maior que zero"),
  quantidade: z.number().int().positive().optional().nullable(),
  descricao: z.string().trim().max(1000).optional().nullable(),
  dataLancamento: z.coerce.date(),
})

export const updateFinanceEntrySchema = z
  .object({
    tipo: entryTypeEnum.optional(),
    categoria: entryCategoryEnum.optional(),
    valor: z.number().positive("Valor deve ser maior que zero").optional(),
    quantidade: z.number().int().positive().optional().nullable(),
    descricao: z.string().trim().max(1000).optional().nullable(),
    dataLancamento: z.coerce.date().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "Nenhum campo enviado para atualização",
  })
