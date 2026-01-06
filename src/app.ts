import Fastify from "fastify"
import cors from "@fastify/cors"
import helmet from "@fastify/helmet"
import rateLimit from "@fastify/rate-limit"
import multipart from "@fastify/multipart"
import { authRoutes } from "./infraestructure/http/routes/auth-routes"
import { alunoRoutes } from "./infraestructure/http/routes/aluno-routes"
import { professorRoutes } from "./infraestructure/http/routes/professor-routes"
import { fotoShapeRoutes } from "./infraestructure/http/routes/foto-shape-routes"
import { arquivoAlunoRoutes } from "./infraestructure/http/routes/arquivo-aluno-routes"
import { AppError } from "./shared/errors/app-error"
import { ZodError } from "zod"
import { env } from "./env"

export const app = Fastify({
  logger:
    env.NODE_ENV === "production"
      ? { level: env.LOG_LEVEL }
      : {
          level: env.LOG_LEVEL,
          transport: {
            target: "pino-pretty",
            options: {
              colorize: true,
              translateTime: "HH:MM:ss Z",
              ignore: "pid,hostname",
            },
          },
        },
  disableRequestLogging: env.NODE_ENV === "production",
  bodyLimit: env.MAX_FILE_SIZE, // Limite de tamanho do body
})

app.register(helmet, {
  contentSecurityPolicy: env.NODE_ENV === "production",
  crossOriginEmbedderPolicy: env.NODE_ENV === "production",
})

app.register(rateLimit, {
  max: env.RATE_LIMIT_MAX,
  timeWindow: env.RATE_LIMIT_TIMEWINDOW,
  errorResponseBuilder: () => ({
    error: "Muitas requisições. Tente novamente em alguns instantes.",
    statusCode: 429,
  }),
})

app.register(cors, {
  origin: env.NODE_ENV === "production" ? env.CORS_ORIGIN || false : true,
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
})

// Registrar multipart para upload de arquivos
app.register(multipart, {
  limits: {
    fileSize: env.MAX_FILE_SIZE,
    files: 1, // Apenas 1 arquivo por vez
  },
})

app.register(authRoutes)
app.register(alunoRoutes)
app.register(professorRoutes)
app.register(fotoShapeRoutes)
app.register(arquivoAlunoRoutes)

app.get("/health", async () => {
  return {
    status: "ok",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: env.NODE_ENV,
  }
})

app.setErrorHandler((error, request, reply) => {
  if (env.NODE_ENV === "production") {
    app.log.error({
      error: error.message,
      stack: error.stack,
      url: request.url,
      method: request.method,
    })
  } else {
    console.error(error)
  }

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

  return reply.status(500).send({
    error:
      env.NODE_ENV === "production"
        ? "Erro interno do servidor"
        : error.message,
  })
})
