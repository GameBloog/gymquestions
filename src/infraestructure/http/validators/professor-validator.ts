import { z } from "zod"

export const createProfessorSchema = z.object({
  nome: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
  email: z.string().email("Email inválido"),
  password: z.string().min(6, "Senha deve ter pelo menos 6 caracteres"),
  telefone: z.string().optional(),
  especialidade: z.string().optional(),
})

export const updateProfessorSchema = z.object({
  telefone: z.string().optional(),
  especialidade: z.string().optional(),
})

export const getProfessorByIdSchema = z.object({
  id: z.string().uuid("ID inválido"),
})
