import { z } from "zod"

const grupamentoMuscularSchema = z.enum([
  "PEITO",
  "COSTAS",
  "PERNAS",
  "OMBRO",
  "BICEPS",
  "TRICEPS",
  "ABDOMEN",
  "GLUTEOS",
  "CARDIO",
  "OUTRO",
])

export const createExercicioSchema = z.object({
  nome: z.string().trim().min(2).max(120),
  descricao: z.string().trim().max(1000).optional(),
  grupamentoMuscular: grupamentoMuscularSchema,
})

export const importExercicioExternoSchema = z.object({
  externalId: z.string().trim().min(1).max(80),
  nome: z.string().trim().min(2).max(120),
  descricao: z.string().trim().max(1000).optional(),
  grupamentoMuscular: grupamentoMuscularSchema,
  externalSource: z.string().trim().max(50).default("wger"),
})

export const searchExercicioExternoSchema = z.object({
  q: z.string().trim().max(120).optional(),
  limit: z.coerce.number().int().min(1).max(50).optional(),
})

export const listExerciciosQuerySchema = z.object({
  q: z.string().trim().max(120).optional(),
  grupamento: grupamentoMuscularSchema.optional(),
})

export const exercicioMediaParamsSchema = z.object({
  exercicioId: z.string().uuid(),
  kind: z.enum(["execucao", "aparelho"]),
})

// O mimetype vem do cliente, mas nao e acreditado: ele so decide qual formato
// o servidor vai FIXAR na assinatura. Enviar "image/gif" e depois mandar outro
// arquivo nao burla nada - o Cloudinary grava no formato assinado.
export const exercicioMediaSignatureBodySchema = z.object({
  mimetype: z.string().min(1),
})

export const exercicioMediaConfirmBodySchema = z.object({
  uploadToken: z.string().min(1),
})

export const grupamentosMusculares = grupamentoMuscularSchema.options
