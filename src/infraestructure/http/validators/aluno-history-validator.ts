import { z } from "zod"

const oneDecimalPositiveNumber = z
  .number()
  .positive()
  .refine(
    (value) => Number.isInteger(Math.round(value * 10) === value * 10 ? value * 10 : NaN),
    "Informe no máximo uma casa decimal"
  )

const historicoContentFields = [
  "pesoKg",
  "alturaCm",
  "cinturaCm",
  "quadrilCm",
  "pescocoCm",
  "bracoEsquerdoCm",
  "bracoDireitoCm",
  "pernaEsquerdaCm",
  "pernaDireitaCm",
  "percentualGordura",
  "massaMuscularKg",
  "observacoes",
] as const

export const createHistoricoSchema = z
  .object({
    alunoId: z.string().uuid("ID do aluno inválido"),
    pesoKg: z.number().positive().optional(),
    alturaCm: z.number().int().positive().optional(),
    cinturaCm: oneDecimalPositiveNumber.optional(),
    quadrilCm: oneDecimalPositiveNumber.optional(),
    pescocoCm: oneDecimalPositiveNumber.optional(),
    bracoEsquerdoCm: z.number().positive().optional(),
    bracoDireitoCm: z.number().positive().optional(),
    pernaEsquerdaCm: z.number().positive().optional(),
    pernaDireitaCm: z.number().positive().optional(),
    percentualGordura: z.number().min(0).max(100).optional(),
    massaMuscularKg: z.number().positive().optional(),
    observacoes: z.string().trim().min(1).optional(),
    dataRegistro: z.string().datetime().optional(),
  })
  .refine(
    (data) =>
      historicoContentFields.some((field) => data[field] !== undefined),
    {
      message: "Informe pelo menos uma medida ou uma observação",
      path: ["historico"],
    }
  )

export const updateHistoricoSchema = z.object({
  pesoKg: z.number().positive().optional(),
  alturaCm: z.number().int().positive().optional(),
  cinturaCm: oneDecimalPositiveNumber.optional(),
  quadrilCm: oneDecimalPositiveNumber.optional(),
  pescocoCm: oneDecimalPositiveNumber.optional(),
  bracoEsquerdoCm: z.number().positive().optional(),
  bracoDireitoCm: z.number().positive().optional(),
  pernaEsquerdaCm: z.number().positive().optional(),
  pernaDireitaCm: z.number().positive().optional(),
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
