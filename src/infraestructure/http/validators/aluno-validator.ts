import { z } from "zod"

const objetivosAtuaisSchema = z.string().trim().max(600).optional()
const remediosUsoSchema = z.string().trim().max(600).optional()

export const createAlunoSchema = z
  .object({
    nome: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
    email: z.string().email("Email inválido"),
    password: z.string().min(6, "Senha deve ter pelo menos 6 caracteres"),

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

export const getAlunoByIdSchema = z.object({
  id: z.string().uuid("ID inválido"),
})
