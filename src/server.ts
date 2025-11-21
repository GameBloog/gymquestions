import Fastify from "fastify"
import cors from "@fastify/cors"
import { authRoutes } from "./infraestructure/http/routes/auth-routes"
import { alunoRoutes } from "./infraestructure/http/routes/aluno-routes"
import { AppError } from "./shared/errors/app-error"
import { ZodError } from "zod"
import { env } from "./env"

export const app = Fastify({
  logger: env.NODE_ENV === "development",
})

app.register(cors, {
  origin: true,
})

app.register(authRoutes)
app.register(alunoRoutes)

app.get("/health", async () => {
  return { status: "ok", timestamp: new Date().toISOString() }
})

app.setErrorHandler((error, request, reply) => {
  if (error instanceof AppError) {
    return reply.status(error.statusCode).send({
      error: error.message,
    })
  }

  if (error instanceof ZodError) {
    return reply.status(400).send({
      error: "Erro de validação",
      details: error.issues,
    })
  }

  if (env.NODE_ENV === "development") {
    console.error(error)
  }

  return reply.status(500).send({
    error: "Erro interno do servidor",
  })
})
