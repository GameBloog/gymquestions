import { FastifyInstance } from "fastify"
import { ExercicioController } from "../controllers/exercicio-controller"
import { authMiddleware } from "../middlewares/auth.middleware"
import { requireRole } from "../middlewares/role.middleware"
import { UserRole } from "@/domain/entities/user"

const controller = new ExercicioController()

export async function exercicioRoutes(app: FastifyInstance) {
  app.addHook("preHandler", authMiddleware)

  app.get("/exercicios", controller.list.bind(controller))
  app.get("/exercicios/grupamentos", controller.listGrupamentos.bind(controller))
  app.get("/exercicios/externos", controller.searchExternal.bind(controller))

  app.post(
    "/exercicios",
    { preHandler: [requireRole(UserRole.ADMIN, UserRole.PROFESSOR)] },
    controller.create.bind(controller),
  )

  app.post(
    "/exercicios/importar",
    { preHandler: [requireRole(UserRole.ADMIN, UserRole.PROFESSOR)] },
    controller.importExternal.bind(controller),
  )

  // Upload assinado: o arquivo vai do navegador direto ao Cloudinary, sem
  // atravessar a Lambda. `assinatura` autoriza e escolhe o destino;
  // `confirmacao` grava no banco depois que o envio terminou.
  app.post(
    "/exercicios/:exercicioId/midia/:kind/assinatura",
    { preHandler: [requireRole(UserRole.ADMIN, UserRole.PROFESSOR)] },
    controller.createMediaUploadSignature.bind(controller),
  )

  app.post(
    "/exercicios/:exercicioId/midia/:kind/confirmacao",
    { preHandler: [requireRole(UserRole.ADMIN, UserRole.PROFESSOR)] },
    controller.confirmMediaUpload.bind(controller),
  )

  // Caminho multipart original, mantido no ar durante a migracao: se o bundle
  // do frontend for revertido para uma versao anterior, ele volta a funcionar
  // sem exigir redeploy do backend. Limitado a MAX_FILE_SIZE.
  app.post(
    "/exercicios/:exercicioId/midia/:kind",
    { preHandler: [requireRole(UserRole.ADMIN, UserRole.PROFESSOR)] },
    controller.uploadMedia.bind(controller),
  )

  app.delete(
    "/exercicios/:exercicioId/midia/:kind",
    { preHandler: [requireRole(UserRole.ADMIN, UserRole.PROFESSOR)] },
    controller.clearMedia.bind(controller),
  )
}
