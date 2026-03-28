import { z } from "zod"

const nomeSchema = z.string().trim().min(2, "Nome deve ter pelo menos 2 caracteres")
const emailSchema = z.string().trim().email("Email inválido")
const passwordSchema = z.string().min(6, "Senha deve ter pelo menos 6 caracteres")

export const createProfessorSchema = z.object({
  nome: nomeSchema,
  email: emailSchema,
  password: passwordSchema,
  telefone: z.string().optional(),
  especialidade: z.string().optional(),
})

export const updateProfessorSchema = z.object({
  nome: nomeSchema.optional(),
  email: emailSchema.optional(),
  password: passwordSchema.optional(),
  telefone: z.string().optional(),
  especialidade: z.string().optional(),
})

export const getProfessorByIdSchema = z.object({
  id: z.string().uuid("ID inválido"),
})
