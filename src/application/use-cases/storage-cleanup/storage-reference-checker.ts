import { prisma } from "@/infraestructure/database/prisma"
import { StorageResourceType } from "@/domain/entities/storage-cleanup"

export class StorageReferenceChecker {
  async hasActiveReference(
    publicId: string,
    resourceType: StorageResourceType,
  ): Promise<boolean> {
    if (resourceType === StorageResourceType.RAW) {
      const arquivo = await prisma.arquivoAluno.findFirst({
        where: { publicId },
        select: { id: true },
      })
      return Boolean(arquivo)
    }

    const [foto, exercicioExecution, exercicioEquipment] = await Promise.all([
      prisma.fotoShape.findFirst({
        where: { publicId },
        select: { id: true },
      }),
      prisma.exercicio.findFirst({
        where: { executionGifPublicId: publicId },
        select: { id: true },
      }),
      prisma.exercicio.findFirst({
        where: { equipmentImagePublicId: publicId },
        select: { id: true },
      }),
    ])

    return Boolean(foto || exercicioExecution || exercicioEquipment)
  }
}
