import { z } from "zod"

export const PASSWORD_MIN_LENGTH = 10
export const PASSWORD_MAX_LENGTH = 128

export const passwordSchema = z
  .string()
  .min(
    PASSWORD_MIN_LENGTH,
    `Senha deve ter pelo menos ${PASSWORD_MIN_LENGTH} caracteres`,
  )
  .max(
    PASSWORD_MAX_LENGTH,
    `Senha deve ter no máximo ${PASSWORD_MAX_LENGTH} caracteres`,
  )
