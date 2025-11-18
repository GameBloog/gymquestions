import { z } from "zod"

export const registerSchema = z.object({
  nome: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
  email: z.string().email("Email inválido"),
  password: z.string().min(6, "Senha deve ter pelo menos 6 caracteres"),
  role: z.enum(["ADMIN", "PROFESSOR", "ALUNO"]).optional(),
  inviteCode: z.string().optional(),
  telefone: z.string().optional(),
  especialidade: z.string().optional(),
})

export const loginSchema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(1, "Senha é obrigatória"),
})

export const createInviteCodeSchema = z.object({
  role: z.enum(["ADMIN", "PROFESSOR"]),
  expiresInDays: z.number().positive().optional(),
})
