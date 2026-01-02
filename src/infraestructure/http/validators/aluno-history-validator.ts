import { z } from "zod"

export const createHistoricoSchema = z.object({
  alunoId: z.string().uuid("ID do aluno inválido"),
  pesoKg: z.number().positive().optional(),
  alturaCm: z.number().int().positive().optional(),
  cinturaCm: z.number().int().positive().optional(),
  quadrilCm: z.number().int().positive().optional(),
  pescocoCm: z.number().int().positive().optional(),
  bracoEsquerdoCm: z.number().positive().optional(),
  bracoDireitoCm: z.number().positive().optional(),
  pernaEsquerdaCm: z.number().positive().optional(),
  pernaDireitaCm: z.number().positive().optional(),
  percentualGordura: z.number().min(0).max(100).optional(),
  massaMuscularKg: z.number().positive().optional(),
  observacoes: z.string().optional(),
  dataRegistro: z.string().datetime().optional(),
})

export const updateHistoricoSchema = z.object({
  pesoKg: z.number().positive().optional(),
  alturaCm: z.number().int().positive().optional(),
  cinturaCm: z.number().int().positive().optional(),
  quadrilCm: z.number().int().positive().optional(),
  pescocoCm: z.number().int().positive().optional(),
  bracoEsquerdoCm: z.number().positive().optional(),
  bracoDireitoCm: z.number().positive().optional(),
  pernaEsquerdaCm: z.number().positive().optional(),
  pernaDireitoCm: z.number().positive().optional(),
  percentualGordura: z.number().min(0).max(100).optional(),
  massaMuscularKg: z.number().positive().optional(),
  observacoes: z.string().optional(),
})

export const getHistoricoByIdSchema = z.object({
  id: z.string().uuid("ID inválido"),
})

export const getHistoricoByAlunoIdSchema = z.object({
  alunoId: z.string().uuid("ID do aluno inválido"),
})

export const historicoFiltrosSchema = z.object({
  dataInicio: z.string().datetime().optional(),
  dataFim: z.string().datetime().optional(),
  limite: z.coerce.number().int().positive().max(1000).optional(),
})
