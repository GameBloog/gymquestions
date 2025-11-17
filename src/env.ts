import "dotenv/config"
import z from "zod"

const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
  PORT: z.coerce.number().default(3333),
  DATABASE_URL: z.string().url(),
})

const _env = envSchema.safeParse(process.env)

if (!_env.success) {
  console.error("❌ Erro nas variáveis de ambiente:", _env.error.format())
  throw new Error("Variaveis de ambiente invalidos")
}

export const env = _env.data
