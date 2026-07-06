import { FastifyReply, FastifyRequest } from "fastify"
import { z } from "zod"
import { StorageDeletionStatus } from "@/domain/entities/storage-cleanup"
import { PrismaStorageCleanupRepository } from "@/infraestructure/database/respositories/prisma-storage-cleanup-repository"

const querySchema = z.object({
  status: z.nativeEnum(StorageDeletionStatus).optional(),
})

const repository = new PrismaStorageCleanupRepository()

export class StorageCleanupController {
  async list(request: FastifyRequest, reply: FastifyReply) {
    try {
      const query = querySchema.parse(request.query)
      const items = await repository.listByStatus(query.status)

      return reply.send(
        items.map((item) => ({
          id: item.id,
          resourceCategory: item.resourceCategory,
          resourceType: item.resourceType,
          relatedRecordId: item.relatedRecordId,
          relatedParentId: item.relatedParentId,
          status: item.status,
          attemptCount: item.attemptCount,
          nextAttemptAt: item.nextAttemptAt,
          lastAttemptedAt: item.lastAttemptedAt,
          lastErrorCategory: item.lastErrorCategory,
          createdAt: item.createdAt,
          updatedAt: item.updatedAt,
        })),
      )
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({
          error: "Parâmetros inválidos",
          details: error.issues,
        })
      }

      throw error
    }
  }
}
