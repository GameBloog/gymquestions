import { z } from "zod"

if (
  process.env.NODE_ENV === "test" ||
  (process.env.VITEST && process.env.NODE_ENV !== "production")
) {
  process.env.NODE_ENV = "test"
  process.env.DATABASE_URL ??= "postgresql://test:test@localhost:5432/test"
  process.env.JWT_SECRET ??=
    "test_secret_key_for_testing_purposes_with_64_characters_minimum_1234"
  process.env.CLOUDINARY_CLOUD_NAME ??= "test-cloud"
  process.env.CLOUDINARY_API_KEY ??= "test-key"
  process.env.CLOUDINARY_API_SECRET ??= "test-secret"
  process.env.LEAD_TRACKING_SALT ??= "test-lead-tracking-salt-1234"
}

const booleanString = z.preprocess((value) => {
  if (typeof value !== "string") {
    return value
  }

  const normalized = value.trim().toLowerCase()
  if (["true", "1", "yes", "on"].includes(normalized)) return true
  if (["false", "0", "no", "off", ""].includes(normalized)) return false
  return value
}, z.boolean())

const documentFormats = {
  CPF: /^(\d{3}\.?\d{3}\.?\d{3}-?\d{2})$/,
  CNPJ: /^(\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2})$/,
}

const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
  PORT: z.coerce.number().default(3333),
  TRUST_PROXY: booleanString.default(false),

  DATABASE_URL: z.string().url(),

  JWT_SECRET: z
    .string()
    .min(64, "JWT_SECRET deve ter no mínimo 64 caracteres em produção"),
  JWT_EXPIRES_IN: z.string().default("15m"),
  REFRESH_TOKEN_EXPIRES_DAYS: z.coerce.number().int().positive().default(30),
  PASSWORD_RESET_EXPIRES_MINUTES: z.coerce
    .number()
    .int()
    .min(5)
    .max(120)
    .default(30),

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

  ENABLE_NOTIFICATION_SCHEDULER: booleanString.default(true),
  NOTIFICATION_TIMEZONE: z.string().default("America/Sao_Paulo"),
  FRIDAY_PHOTO_REMINDER_CRON: z.string().default("0 9 * * 5"),
  REAVALIACAO_REMINDER_CRON: z.string().default("0 8 * * *"),

  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().default(587),
  SMTP_SECURE: booleanString.default(false),
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

  PRIVACY_CONTROLLER_NAME: z.string().optional(),
  PRIVACY_CONTROLLER_DOCUMENT_TYPE: z.enum(["CPF", "CNPJ"]).optional(),
  PRIVACY_CONTROLLER_DOCUMENT: z.string().optional(),
  PRIVACY_CONTROLLER_CNPJ: z.string().optional(),
  PRIVACY_CONTROLLER_ADDRESS: z.string().optional(),
  PRIVACY_CONTACT_EMAIL: z.string().email().optional(),
  PRIVACY_DOCUMENT_VERSION: z.string().default("2026-06-07"),
}).superRefine((data, ctx) => {
  const documentType =
    data.PRIVACY_CONTROLLER_DOCUMENT_TYPE ||
    (data.PRIVACY_CONTROLLER_CNPJ ? "CNPJ" : undefined)
  const document =
    data.PRIVACY_CONTROLLER_DOCUMENT || data.PRIVACY_CONTROLLER_CNPJ

  if (!documentType || !document) return

  if (!documentFormats[documentType].test(document)) {
    ctx.addIssue({
      code: "custom",
      path: [
        data.PRIVACY_CONTROLLER_DOCUMENT
          ? "PRIVACY_CONTROLLER_DOCUMENT"
          : "PRIVACY_CONTROLLER_CNPJ",
      ],
      message:
        documentType === "CPF"
          ? "PRIVACY_CONTROLLER_DOCUMENT deve ser um CPF com 11 digitos"
          : "PRIVACY_CONTROLLER_DOCUMENT deve ser um CNPJ com 14 digitos",
    })
  }
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

  const missingPrivacyControllerConfig = [
    ["PRIVACY_CONTROLLER_NAME", _env.data.PRIVACY_CONTROLLER_NAME],
    [
      "PRIVACY_CONTROLLER_DOCUMENT_TYPE",
      _env.data.PRIVACY_CONTROLLER_DOCUMENT_TYPE ||
        (_env.data.PRIVACY_CONTROLLER_CNPJ ? "CNPJ" : undefined),
    ],
    [
      "PRIVACY_CONTROLLER_DOCUMENT",
      _env.data.PRIVACY_CONTROLLER_DOCUMENT ||
        _env.data.PRIVACY_CONTROLLER_CNPJ,
    ],
    ["PRIVACY_CONTROLLER_ADDRESS", _env.data.PRIVACY_CONTROLLER_ADDRESS],
    ["PRIVACY_CONTACT_EMAIL", _env.data.PRIVACY_CONTACT_EMAIL],
  ].filter(([, value]) => !value)

  if (missingPrivacyControllerConfig.length > 0) {
    throw new Error(
      `⚠️ CRÍTICO: configuração do controlador LGPD ausente: ${missingPrivacyControllerConfig
        .map(([name]) => name)
        .join(", ")}`
    )
  }
}

export const env = _env.data
