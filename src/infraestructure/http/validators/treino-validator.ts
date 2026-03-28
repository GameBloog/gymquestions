import { z } from "zod"

const treinoDiaExercicioInputSchema = z.object({
  exercicioId: z.string().uuid(),
  ordem: z.number().int().min(1),
  series: z.number().int().min(1).max(20).optional(),
  repeticoes: z.string().trim().max(50).optional(),
  cargaSugerida: z.number().nonnegative().max(1000).optional(),
  observacoes: z.string().trim().max(600).optional(),
  metodo: z.string().trim().max(300).optional(),
})

const treinoDiaInputSchema = z.object({
  titulo: z.string().trim().min(1).max(80),
  ordem: z.number().int().min(1),
  diaSemana: z.number().int().min(1).max(7).optional(),
  observacoes: z.string().trim().max(600).optional(),
  metodo: z.string().trim().max(300).optional(),
  exercicios: z.array(treinoDiaExercicioInputSchema).min(1),
})

export const upsertPlanoTreinoSchema = z.object({
  alunoId: z.string().uuid(),
  nome: z.string().trim().min(2).max(120),
  observacoes: z.string().trim().max(1200).optional(),
  dias: z.array(treinoDiaInputSchema).min(1).max(7),
})

export const createTreinoModeloSchema = z.object({
  nome: z.string().trim().min(2).max(120),
  observacoes: z.string().trim().max(1200).optional(),
  dias: z.array(treinoDiaInputSchema).min(1).max(7),
})

export const alunoIdParamsSchema = z.object({
  alunoId: z.string().uuid(),
})

export const treinoModeloIdParamsSchema = z.object({
  moldeId: z.string().uuid(),
})

export const startCheckinSchema = z.object({
  treinoDiaId: z.string().uuid(),
})

export const updateExercicioCheckinParamsSchema = z.object({
  checkinId: z.string().uuid(),
  treinoDiaExercicioId: z.string().uuid(),
})

export const updateExercicioCheckinBodySchema = z.object({
  concluido: z.boolean().optional(),
  cargaReal: z.number().nonnegative().max(1000).optional(),
  repeticoesReal: z.string().trim().max(50).optional(),
  comentarioAluno: z.string().trim().max(600).optional(),
})

export const finalizeCheckinParamsSchema = z.object({
  checkinId: z.string().uuid(),
})

export const finalizeCheckinBodySchema = z.object({
  comentarioAluno: z.string().trim().max(1200).optional(),
})

export const comentarioProfessorBodySchema = z.object({
  comentarioProfessor: z.string().trim().min(1).max(1200),
})

export const timelineQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(200).optional(),
})

export const progressoQuerySchema = z.object({
  exercicioId: z.string().uuid().optional(),
})
