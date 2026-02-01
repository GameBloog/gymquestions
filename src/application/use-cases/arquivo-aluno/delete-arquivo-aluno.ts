import { ArquivoAlunoRepository } from "@/application/repositories/arquivo-aluno-repository"
import { AppError } from "@/shared/errors/app-error"
import { CloudinaryService } from "@/infraestructure/storage/cloudinary.service"

export class DeleteArquivoAlunoUseCase {
  constructor(private arquivoAlunoRepository: ArquivoAlunoRepository) {}

  async execute(id: string): Promise<void> {
    const arquivo = await this.arquivoAlunoRepository.findById(id)
    if (!arquivo) {
      throw new AppError("Arquivo não encontrado", 404)
    }

    // Deletar do Cloudinary
    await CloudinaryService.deleteFile(arquivo.publicId, "raw")

    // Deletar do banco
    await this.arquivoAlunoRepository.delete(id)
  }
}
