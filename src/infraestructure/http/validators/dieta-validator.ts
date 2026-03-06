import { z } from "zod"

export const objetivoDietaSchema = z.enum(["MANTER", "PERDER", "GANHAR"])

export const listAlimentosQuerySchema = z.object({
  q: z.string().trim().max(120).optional(),
})

export const searchAlimentosExternosQuerySchema = z.object({
  q: z.string().trim().min(2).max(120),
  source: z.enum(["USDA", "TACO", "ALL"]).optional(),
  limit: z.coerce.number().int().min(1).max(50).optional(),
})

export const importAlimentoExternoSchema = z.object({
  externalId: z.string().trim().min(1).max(80),
  nome: z.string().trim().min(2).max(180),
  descricao: z.string().trim().max(1200).optional(),
  calorias100g: z.number().nonnegative().max(2000),
  proteinas100g: z.number().nonnegative().max(200),
  carboidratos100g: z.number().nonnegative().max(200),
  gorduras100g: z.number().nonnegative().max(200),
  fibras100g: z.number().nonnegative().max(120).optional(),
  source: z.enum(["USDA", "TACO"]),
})

export const createAlimentoSchema = z
  .object({
    nome: z.string().trim().min(2).max(180),
    descricao: z.string().trim().max(1200).optional(),
    calorias100g: z.number().nonnegative().max(2000),
    proteinas100g: z.number().nonnegative().max(100),
    carboidratos100g: z.number().nonnegative().max(100),
    gorduras100g: z.number().nonnegative().max(100),
    fibras100g: z.number().nonnegative().max(100).optional(),
  })
  .superRefine((value, context) => {
    const macrosTotal =
      value.proteinas100g + value.carboidratos100g + value.gorduras100g

    if (macrosTotal > 100.5) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["proteinas100g"],
        message: "A soma de proteínas, carboidratos e gorduras deve ser <= 100g",
      })
    }

    if (
      value.fibras100g !== undefined &&
      value.fibras100g > value.carboidratos100g + 0.5
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["fibras100g"],
        message: "Fibras não pode exceder o valor de carboidratos por 100g",
      })
    }
  })

const refeicaoItemInputSchema = z.object({
  alimentoId: z.string().uuid(),
  ordem: z.number().int().min(1),
  quantidadeGramas: z.number().positive().max(2000),
  observacoes: z.string().trim().max(600).optional(),
})

const refeicaoInputSchema = z.object({
  nome: z.string().trim().min(1).max(80),
  ordem: z.number().int().min(1),
  horario: z.string().trim().max(30).optional(),
  observacoes: z.string().trim().max(600).optional(),
  itens: z.array(refeicaoItemInputSchema).min(1),
})

const dietaDiaInputSchema = z.object({
  titulo: z.string().trim().min(1).max(80),
  ordem: z.number().int().min(1),
  diaSemana: z.number().int().min(1).max(7).optional(),
  observacoes: z.string().trim().max(600).optional(),
  refeicoes: z.array(refeicaoInputSchema).min(1),
})

export const upsertPlanoDietaSchema = z.object({
  alunoId: z.string().uuid(),
  nome: z.string().trim().min(2).max(120),
  objetivo: objetivoDietaSchema,
  fatorAtividade: z.number().min(1.1).max(2.5).optional(),
  caloriasMeta: z.number().positive().max(10000).optional(),
  proteinasMetaG: z.number().nonnegative().max(1000).optional(),
  carboidratosMetaG: z.number().nonnegative().max(1200).optional(),
  gordurasMetaG: z.number().nonnegative().max(500).optional(),
  observacoes: z.string().trim().max(1200).optional(),
  dias: z.array(dietaDiaInputSchema).min(1).max(7),
})

export const alunoIdParamsSchema = z.object({
  alunoId: z.string().uuid(),
})

export const recomendacaoQuerySchema = z.object({
  objetivo: objetivoDietaSchema.default("MANTER"),
  fatorAtividade: z.coerce.number().min(1.1).max(2.5).optional(),
})

export const startDietaCheckinSchema = z.object({
  dietaDiaId: z.string().uuid(),
})

export const updateRefeicaoCheckinParamsSchema = z.object({
  checkinId: z.string().uuid(),
  dietaRefeicaoId: z.string().uuid(),
})

export const updateRefeicaoCheckinBodySchema = z.object({
  concluida: z.boolean().optional(),
  observacaoAluno: z.string().trim().max(600).optional(),
})

export const finalizeDietaCheckinParamsSchema = z.object({
  checkinId: z.string().uuid(),
})

export const finalizeDietaCheckinBodySchema = z.object({
  observacaoDia: z.string().trim().max(1200).optional(),
})

export const comentarioProfessorBodySchema = z.object({
  comentarioProfessor: z.string().trim().min(1).max(1200),
})

export const listCheckinsQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(200).optional(),
})
