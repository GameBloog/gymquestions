import Fastify from "fastify"
import cors from "@fastify/cors"
import { env } from "./env"
import { answersRoutes } from "./infraestructure/http/routes/answers-routes"
import { AppError } from "./shared/errors/app-error"
import { ZodError } from "zod"

export const app = Fastify({
  logger: env.NODE_ENV === "development",
})

app.register(cors, {
  origin: true,
})

app.register(answersRoutes)

app.get("/health", async () => {
  return { status: "ok", timeStamp: new Date().toISOString() }
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
