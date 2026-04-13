import { z } from "zod"

const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
  PORT: z.coerce.number().default(3333),
  TRUST_PROXY: z.coerce.boolean().default(false),

  DATABASE_URL: z.string().url(),

  JWT_SECRET: z
    .string()
    .min(64, "JWT_SECRET deve ter no mínimo 64 caracteres em produção"),
  JWT_EXPIRES_IN: z.string().default("7d"),
  REFRESH_TOKEN_EXPIRES_DAYS: z.coerce.number().int().positive().default(30),

  BCRYPT_ROUNDS: z.coerce.number().min(10).max(15).default(12),

  CORS_ORIGIN: z.string().optional(),

  RATE_LIMIT_MAX: z.coerce.number().default(100),
  RATE_LIMIT_TIMEWINDOW: z.coerce.number().default(60000),
  AUTH_RATE_LIMIT_MAX: z.coerce.number().default(10),
  AUTH_RATE_LIMIT_TIMEWINDOW: z.coerce.number().default(60000),

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

  ENABLE_NOTIFICATION_SCHEDULER: z.coerce.boolean().default(true),
  NOTIFICATION_TIMEZONE: z.string().default("America/Sao_Paulo"),
  FRIDAY_PHOTO_REMINDER_CRON: z.string().default("0 9 * * 5"),
  REAVALIACAO_REMINDER_CRON: z.string().default("0 8 * * *"),

  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().default(587),
  SMTP_SECURE: z.coerce.boolean().default(false),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  SMTP_FROM_EMAIL: z.string().email().optional(),
  SMTP_FROM_NAME: z.string().default("G-Force"),

  TWILIO_ACCOUNT_SID: z.string().optional(),
  TWILIO_AUTH_TOKEN: z.string().optional(),
  TWILIO_WHATSAPP_FROM: z.string().optional(),

  EXERCISE_API_BASE_URL: z.string().url().default("https://wger.de/api/v2"),
  USDA_API_BASE_URL: z.string().url().default("https://api.nal.usda.gov/fdc/v1"),
  USDA_API_KEY: z.string().optional(),
  TACO_API_BASE_URL: z.string().url().optional(),
  TACO_API_KEY: z.string().optional(),
  YOUTUBE_API_KEY: z.string().optional(),
  YOUTUBE_CHANNEL_HANDLE: z.string().default("gforce.oficialbr"),
  YOUTUBE_LATEST_CACHE_TTL_SECONDS: z.coerce.number().int().min(60).default(86400),

  LEAD_TRACKING_SALT: z
    .string()
    .min(16)
    .default("lead-tracking-salt-change-me"),
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

  if (_env.data.LEAD_TRACKING_SALT === "lead-tracking-salt-change-me") {
    throw new Error(
      "⚠️ CRÍTICO: LEAD_TRACKING_SALT padrão não pode ser usado em produção!"
    )
  }

  if (!_env.data.CORS_ORIGIN) {
    console.warn("⚠️ AVISO: CORS_ORIGIN não configurado para produção!")
  }
}

export const env = _env.data
