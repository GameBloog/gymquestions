import { z } from "zod"

const monthRegex = /^\d{4}-(0[1-9]|1[0-2])$/

const monthSchema = z
  .string()
  .regex(monthRegex, "Mês inválido. Use o formato YYYY-MM")

export const professorDashboardQuerySchema = z.object({
  feedbackLimit: z.coerce.number().int().min(1).max(20).default(5),
  recentDays: z.coerce.number().int().min(1).max(90).default(14),
  reavaliacaoWindowDays: z.coerce.number().int().min(1).max(30).default(5),
})

export const professorFinanceDashboardQuerySchema = z.object({
  from: monthSchema.optional(),
  to: monthSchema.optional(),
})
