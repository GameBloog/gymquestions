import { z } from "zod"

export const createAnswerSchema = z.object({
  nome: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
  email: z.string().email("Email inválido"),
  telefone: z.string().optional(),
  alturaCm: z.number().int().positive().optional(),
  pesoKg: z.number().positive().optional(),
  idade: z.number().int().positive().optional(),
  cinturaCm: z.number().int().positive().optional(),
  quadrilCm: z.number().int().positive().optional(),
  pescocoCm: z.number().int().positive().optional(),
  alimentos_quer_diario: z.array(z.string()).optional(),
  alimentos_nao_comem: z.array(z.string()).optional(),
  alergias_alimentares: z.array(z.string()).optional(),
  dores_articulares: z.string().optional(),
  suplementos_consumidos: z.array(z.string()).optional(),
  dias_treino_semana: z.number().int().min(0).max(7).optional(),
  frequencia_horarios_refeicoes: z.string().optional(),
})

export const updateAnswerSchema = createAnswerSchema.partial()

export const getAnswerByIdSchema = z.object({
  id: z.string().uuid("ID inválido"),
})
