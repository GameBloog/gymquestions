import { ArquivoAlunoRepository } from "@/application/repositories/arquivo-aluno-repository"
import { ArquivoAluno } from "@/domain/entities/arquivo-aluno"

export class GetArquivosAlunoUseCase {
  constructor(private arquivoAlunoRepository: ArquivoAlunoRepository) {}

  async execute(alunoId: string): Promise<ArquivoAluno[]> {
    return await this.arquivoAlunoRepository.findManyByAluno(alunoId)
  }
}
