import { z } from "zod"
import { acceptedDocumentSchema, privacyPreferencesSchema } from "./privacy-validator"

export const registerSchema = z.object({
  nome: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
  email: z.string().email("Email inválido"),
  password: z.string().min(10, "Senha deve ter pelo menos 10 caracteres"),
  role: z.enum(["ADMIN", "PROFESSOR", "ALUNO"]).optional(),
  inviteCode: z.string().optional(),
  telefone: z.string().optional(),
  especialidade: z.string().optional(),
  acceptedDocuments: z.array(acceptedDocumentSchema).min(2),
  privacyPreferences: privacyPreferencesSchema.optional(),
  leadSlug: z
    .string()
    .trim()
    .min(3)
    .max(80)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
    .optional(),
})

export const loginSchema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(1, "Senha é obrigatória"),
})

export const forgotPasswordSchema = z.object({
  email: z.string().trim().toLowerCase().email("Email inválido"),
})

export const resetPasswordSchema = z.object({
  token: z.string().trim().min(32, "Token de recuperação inválido").max(256),
  newPassword: z
    .string()
    .min(10, "Senha deve ter pelo menos 10 caracteres")
    .max(128, "Senha deve ter no máximo 128 caracteres"),
})

export const createInviteCodeSchema = z.object({
  role: z.enum(["ADMIN", "PROFESSOR"]),
  expiresInDays: z.number().positive().optional(),
})
