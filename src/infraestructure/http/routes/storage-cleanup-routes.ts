import { FastifyInstance } from "fastify"
import { UserRole } from "@/domain/entities/user"
import { StorageCleanupController } from "../controllers/storage-cleanup-controller"
import { authMiddleware } from "../middlewares/auth.middleware"
import { requireRole } from "../middlewares/role.middleware"

const controller = new StorageCleanupController()

export async function storageCleanupRoutes(app: FastifyInstance) {
  app.get(
    "/storage-cleanup",
    { preHandler: [authMiddleware, requireRole(UserRole.ADMIN)] },
    controller.list.bind(controller),
  )
}
