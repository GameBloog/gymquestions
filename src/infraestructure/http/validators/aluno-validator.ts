import { z } from "zod"
import { passwordSchema } from "./password-validator"

const nomeSchema = z.string().trim().min(2, "Nome deve ter pelo menos 2 caracteres")
const emailSchema = z.string().trim().email("Email inválido")
const objetivosAtuaisSchema = z.string().trim().max(600).optional()
const objetivosAtuaisUpdateSchema = z.string().trim().max(600).nullable().optional()
const remediosUsoSchema = z.string().trim().max(600).optional()
const remediosUsoUpdateSchema = z.string().trim().max(600).nullable().optional()

export const createAlunoSchema = z
  .object({
    nome: nomeSchema,
    email: emailSchema,
    password: passwordSchema,

    professorId: z.string().uuid("ID do professor inválido").optional(),

    sexoBiologico: z.enum(["MASCULINO", "FEMININO"]).optional(),
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
    suplementos_consumidos: z.array(z.string()).optional(),

    dores_articulares: z.string().optional(),
    dias_treino_semana: z.number().int().min(0).max(7).optional(),
    frequencia_horarios_refeicoes: z.string().optional(),
    objetivos_atuais: objetivosAtuaisSchema,
    toma_remedio: z.boolean().optional(),
    remedios_uso: remediosUsoSchema,
  })
  .superRefine((data, ctx) => {
    if (
      data.toma_remedio === true &&
      (!data.remedios_uso || data.remedios_uso.trim().length === 0)
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["remedios_uso"],
        message:
          "Informe quais remédios usa quando a opção 'toma remédio' estiver ativa",
      })
    }
  })

export const updateAlunoSchema = z
  .object({
    nome: nomeSchema.optional(),
    email: emailSchema.optional(),
    password: passwordSchema.optional(),
    sexoBiologico: z.enum(["MASCULINO", "FEMININO"]).nullable().optional(),
    telefone: z.string().nullable().optional(),
    alturaCm: z.number().int().positive().nullable().optional(),
    pesoKg: z.number().positive().nullable().optional(),
    idade: z.number().int().positive().nullable().optional(),
    cinturaCm: z.number().int().positive().nullable().optional(),
    quadrilCm: z.number().int().positive().nullable().optional(),
    pescocoCm: z.number().int().positive().nullable().optional(),
    alimentos_quer_diario: z.array(z.string()).nullable().optional(),
    alimentos_nao_comem: z.array(z.string()).nullable().optional(),
    alergias_alimentares: z.array(z.string()).nullable().optional(),
    suplementos_consumidos: z.array(z.string()).nullable().optional(),
    dores_articulares: z.string().nullable().optional(),
    dias_treino_semana: z.number().int().min(0).max(7).nullable().optional(),
    frequencia_horarios_refeicoes: z.string().nullable().optional(),
    objetivos_atuais: objetivosAtuaisUpdateSchema,
    toma_remedio: z.boolean().nullable().optional(),
    remedios_uso: remediosUsoUpdateSchema,
  })
  .superRefine((data, ctx) => {
    if (
      data.toma_remedio === true &&
      (!data.remedios_uso || data.remedios_uso.trim().length === 0)
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["remedios_uso"],
        message:
          "Informe quais remédios usa quando a opção 'toma remédio' estiver ativa",
      })
    }
  })

export const getAlunoByIdSchema = z.object({
  id: z.string().uuid("ID inválido"),
})

export const updateAlunoStatusSchema = z.object({
  ativo: z.boolean(),
})
