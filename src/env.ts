import { z } from "zod"

const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
  PORT: z.coerce.number().default(3333),

  DATABASE_URL: z.string().url(),

  JWT_SECRET: z
    .string()
    .min(64, "JWT_SECRET deve ter no mínimo 64 caracteres em produção"),
  JWT_EXPIRES_IN: z.string().default("7d"),

  BCRYPT_ROUNDS: z.coerce.number().min(10).max(15).default(12),

  CORS_ORIGIN: z.string().optional(),

  RATE_LIMIT_MAX: z.coerce.number().default(100),
  RATE_LIMIT_TIMEWINDOW: z.coerce.number().default(60000),

  LOG_LEVEL: z
    .enum(["fatal", "error", "warn", "info", "debug", "trace"])
    .default("info"),

  CLOUDINARY_CLOUD_NAME: z
    .string()
    .min(1, "CLOUDINARY_CLOUD_NAME é obrigatório"),
  CLOUDINARY_API_KEY: z.string().min(1, "CLOUDINARY_API_KEY é obrigatório"),
  CLOUDINARY_API_SECRET: z
    .string()
    .min(1, "CLOUDINARY_API_SECRET é obrigatório"),

  MAX_FILE_SIZE: z.coerce.number().default(5242880), // 5MB
  MAX_PHOTO_SIZE: z.coerce.number().default(2097152), // 2MB
})

const _env = envSchema.safeParse(process.env)

if (!_env.success) {
  console.error("❌ Erro nas variáveis de ambiente:", _env.error.format())
  throw new Error("Variáveis de ambiente inválidas")
}

if (_env.data.NODE_ENV === "production") {
  if (_env.data.JWT_SECRET.length < 64) {
    throw new Error("⚠️ CRÍTICO: JWT_SECRET muito curto para produção!")
  }

  if (!_env.data.CORS_ORIGIN) {
    console.warn("⚠️ AVISO: CORS_ORIGIN não configurado para produção!")
  }
}

export const env = _env.data
