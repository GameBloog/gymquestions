import { z } from "zod"
import { passwordSchema } from "./password-validator"

const nomeSchema = z.string().trim().min(2, "Nome deve ter pelo menos 2 caracteres")
const emailSchema = z.string().trim().email("Email inválido")

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
