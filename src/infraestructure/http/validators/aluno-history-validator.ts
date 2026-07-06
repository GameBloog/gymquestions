import { z } from "zod"

const oneDecimalPositiveNumber = z
  .number()
  .positive()
  .refine(
    (value) => Number.isInteger(Math.round(value * 10) === value * 10 ? value * 10 : NaN),
    "Informe no máximo uma casa decimal"
  )

const leanMassInputFields = {
  massaMagraKg: z.number().positive().optional(),
  // Alias temporário de entrada para clientes anteriores ao contrato massaMagraKg.
  massaMuscularKg: z.number().positive().optional(),
}

type LeanMassInput = {
  massaMagraKg?: number
  massaMuscularKg?: number
}

const hasConsistentLeanMassInput = (data: LeanMassInput) =>
  data.massaMagraKg === undefined ||
  data.massaMuscularKg === undefined ||
  data.massaMagraKg === data.massaMuscularKg

const normalizeLeanMassInput = <T extends LeanMassInput>(data: T) => {
  const { massaMuscularKg, ...canonicalData } = data
  const massaMagraKg = data.massaMagraKg ?? massaMuscularKg

  return {
    ...canonicalData,
    ...(massaMagraKg !== undefined && { massaMagraKg }),
  }
}

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
  "massaMagraKg",
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
    ...leanMassInputFields,
    observacoes: z.string().trim().min(1).optional(),
    dataRegistro: z.string().datetime().optional(),
  })
  .refine(
    (data) =>
      historicoContentFields.some((field) => data[field] !== undefined) ||
      data.massaMuscularKg !== undefined,
    {
      message: "Informe pelo menos uma medida ou uma observação",
      path: ["historico"],
    }
  )
  .refine(hasConsistentLeanMassInput, {
    message:
      "massaMagraKg e o campo legado massaMuscularKg não podem ter valores diferentes",
    path: ["massaMagraKg"],
  })
  .transform(normalizeLeanMassInput)

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
  ...leanMassInputFields,
  observacoes: z.string().optional(),
})
  .refine(hasConsistentLeanMassInput, {
    message:
      "massaMagraKg e o campo legado massaMuscularKg não podem ter valores diferentes",
    path: ["massaMagraKg"],
  })
  .transform(normalizeLeanMassInput)

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
