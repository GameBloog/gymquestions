import { FotoShapeRepository } from "@/application/repositories/foto-shape-repository"
import { AppError } from "@/shared/errors/app-error"
import { CloudinaryService } from "@/infraestructure/storage/cloudinary.service"

export class DeleteFotoShapeUseCase {
  constructor(private fotoShapeRepository: FotoShapeRepository) {}

  async execute(id: string): Promise<void> {
    const foto = await this.fotoShapeRepository.findById(id)
    if (!foto) {
      throw new AppError("Foto não encontrada", 404)
    }

    // Deletar do Cloudinary
    await CloudinaryService.deleteFile(foto.publicId, "image")

    // Deletar do banco
    await this.fotoShapeRepository.delete(id)
  }
}
