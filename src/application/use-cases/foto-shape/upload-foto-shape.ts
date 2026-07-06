import { FotoShapeRepository } from "@/application/repositories/foto-shape-repository"
import { AlunoRepository } from "@/application/repositories/aluno-repository"
import { FotoShape } from "@/domain/entities/foto-shape"
import { AppError } from "@/shared/errors/app-error"
import { CloudinaryService } from "@/infraestructure/storage/cloudinary.service"
import { EnqueueStorageDeletionUseCase } from "../storage-cleanup/enqueue-storage-deletion"
import {
  StorageDeletionCategory,
  StorageResourceType,
} from "@/domain/entities/storage-cleanup"

interface UploadFotoShapeInput {
  alunoId: string
  buffer: Buffer
  descricao?: string
}

export class UploadFotoShapeUseCase {
  constructor(
    private fotoShapeRepository: FotoShapeRepository,
    private alunoRepository: AlunoRepository,
    private storageDeletion?: EnqueueStorageDeletionUseCase,
  ) {}

  async execute(data: UploadFotoShapeInput): Promise<FotoShape> {
    const aluno = await this.alunoRepository.findById(data.alunoId)
    if (!aluno) {
      throw new AppError("Aluno não encontrado", 404)
    }

    const { url, publicId } = await CloudinaryService.uploadFotoShape(
      data.buffer,
      data.alunoId
    )

    try {
      return await this.fotoShapeRepository.create({
        alunoId: data.alunoId,
        url,
        publicId,
        descricao: data.descricao,
      })
    } catch (error) {
      await this.storageDeletion?.deleteNowOrEnqueue({
        resourceCategory: StorageDeletionCategory.COMPENSATION_UPLOAD,
        resourceType: StorageResourceType.IMAGE,
        publicId,
        relatedParentId: data.alunoId,
      })

      throw error
    }
  }
}
