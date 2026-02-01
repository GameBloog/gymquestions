import { ArquivoAlunoRepository } from "@/application/repositories/arquivo-aluno-repository"
import { AlunoRepository } from "@/application/repositories/aluno-repository"
import { ArquivoAluno, TipoArquivo } from "@/domain/entities/arquivo-aluno"
import { AppError } from "@/shared/errors/app-error"
import { CloudinaryService } from "@/infraestructure/storage/cloudinary.service"

interface UploadArquivoAlunoInput {
  alunoId: string
  professorId: string
  tipo: TipoArquivo
  titulo: string
  descricao?: string
  buffer: Buffer
}

export class UploadArquivoAlunoUseCase {
  constructor(
    private arquivoAlunoRepository: ArquivoAlunoRepository,
    private alunoRepository: AlunoRepository
  ) {}

  async execute(data: UploadArquivoAlunoInput): Promise<ArquivoAluno> {
    const aluno = await this.alunoRepository.findById(data.alunoId)
    if (!aluno) {
      throw new AppError("Aluno não encontrado", 404)
    }

    const tipoParaPath = data.tipo === "TREINO" ? "treino" : "dieta"

    const { url, publicId } = await CloudinaryService.uploadPDF(
      data.buffer,
      data.alunoId,
      tipoParaPath
    )

    return await this.arquivoAlunoRepository.create({
      alunoId: data.alunoId,
      professorId: data.professorId,
      tipo: data.tipo,
      titulo: data.titulo,
      descricao: data.descricao,
      url,
      publicId,
    })
  }
}
