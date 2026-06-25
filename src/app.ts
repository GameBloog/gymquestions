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
import { alunoHistoricoRoutes } from "./infraestructure/http/routes/aluno-historico-routes"
import { exercicioRoutes } from "./infraestructure/http/routes/exercicio-routes"
import { treinoRoutes } from "./infraestructure/http/routes/treino-routes"
import { dietaRoutes } from "./infraestructure/http/routes/dieta-routes"
import { leadLinkRoutes } from "./infraestructure/http/routes/lead-link-routes"
import { contentRoutes } from "./infraestructure/http/routes/content-routes"
import { financeRoutes } from "./infraestructure/http/routes/finance-routes"
import { professorOperationsRoutes } from "./infraestructure/http/routes/professor-operations-routes"
import { legalRoutes } from "./infraestructure/http/routes/legal-routes"
import { privacyRoutes } from "./infraestructure/http/routes/privacy-routes"
import { onboardingRoutes } from "./infraestructure/http/routes/onboarding-routes"

const MULTIPART_CONTENT_TYPE_ERROR_CODE = "FST_INVALID_MULTIPART_CONTENT_TYPE"

type FastifyHttpError = Error & {
  code?: string
  statusCode?: number
}

const loggerRedact = {
  paths: [
    "req.headers.authorization",
    "req.headers.cookie",
    "headers.authorization",
    "headers.cookie",
    "*.token",
    "*.refreshToken",
    "*.password",
    "*.email",
    "*.telefone",
    "*.phone",
    "*.url",
    "*.signedUrl",
    "*.secure_url",
    "*.api_key",
    "*.api_secret",
  ],
  censor: "[REDACTED]",
}

export const app = Fastify({
  trustProxy: env.TRUST_PROXY,
  logger:
    env.NODE_ENV === "production"
      ? { level: env.LOG_LEVEL, redact: loggerRedact }
      : {
          level: env.LOG_LEVEL,
          redact: loggerRedact,
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
  bodyLimit: env.MAX_FILE_SIZE, 
})

app.register(helmet, {
  contentSecurityPolicy: env.NODE_ENV === "production",
  crossOriginEmbedderPolicy: env.NODE_ENV === "production",
  strictTransportSecurity:
    env.NODE_ENV === "production"
      ? { maxAge: 15552000, includeSubDomains: true }
      : false,
})

app.register(rateLimit, {
  max: env.RATE_LIMIT_MAX,
  timeWindow: env.RATE_LIMIT_TIMEWINDOW,
  errorResponseBuilder: () => ({
    error: "Muitas requisições. Tente novamente em alguns instantes.",
    statusCode: 429,
  }),
})

const isLocalOrigin = (origin: string): boolean => {
  if (/^(exp|exps):\/\//.test(origin)) {
    return true
  }

  try {
    const { hostname } = new URL(origin)
    return hostname === "localhost" || hostname === "127.0.0.1"
  } catch {
    return false
  }
}

app.register(cors, {
  origin: (origin, cb) => {
    if (!origin) {
      cb(null, true)
      return
    }

    if (env.NODE_ENV !== "production") {
      if (isLocalOrigin(origin)) {
        cb(null, true)
      } else {
        cb(new Error("Not allowed by CORS"), false)
      }
      return
    }

    const allowedOrigins = env.CORS_ORIGIN?.split(",").map((o) => o.trim())

    if (allowedOrigins?.includes(origin)) {
      cb(null, true)
    } else {
      cb(new Error("Not allowed by CORS"), false)
    }
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
})

app.register(multipart, {
  limits: {
    fileSize: env.MAX_FILE_SIZE,
    files: 1,
    fields: 10,
    parts: 11,
    fieldSize: 10 * 1024,
  },
})

 app.register(authRoutes)
 app.register(alunoHistoricoRoutes)
 app.register(alunoRoutes)
 app.register(professorRoutes)
 app.register(fotoShapeRoutes)
 app.register(arquivoAlunoRoutes)
 app.register(exercicioRoutes)
 app.register(treinoRoutes)
 app.register(dietaRoutes)
 app.register(leadLinkRoutes)
 app.register(contentRoutes)
 app.register(financeRoutes)
 app.register(professorOperationsRoutes)
 app.register(legalRoutes)
 app.register(privacyRoutes)
 app.register(onboardingRoutes)

app.get("/health", async () => {
  if (env.NODE_ENV === "production") {
    return {
      status: "ok",
      timestamp: new Date().toISOString(),
    }
  }

  return {
    status: "ok",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: env.NODE_ENV,
  }
})

app.setErrorHandler((error, request, reply) => {
  request.log.error(
    {
      err: error,
      url: request.url,
      method: request.method,
    },
    "Erro na requisição"
  )

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

  const fastifyError = error as FastifyHttpError

  if (fastifyError.code === MULTIPART_CONTENT_TYPE_ERROR_CODE) {
    return reply.status(fastifyError.statusCode ?? 406).send({
      error: "A requisição deve ser multipart/form-data",
    })
  }

  if (
    typeof fastifyError.statusCode === "number" &&
    fastifyError.statusCode >= 400 &&
    fastifyError.statusCode < 500
  ) {
    return reply.status(fastifyError.statusCode).send({
      error: fastifyError.message,
    })
  }

  return reply.status(500).send({
    error: "Erro interno do servidor",
  })
})
