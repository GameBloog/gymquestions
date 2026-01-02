// ============================================
// delete-aluno-historico.ts
// ============================================
import { AlunoHistoricoRepository } from "@/application/repositories/aluno-history-repository"
import { AppError } from "@/shared/errors/app-error"

export class DeleteAlunoHistoricoUseCase {
  constructor(private historicoRepository: AlunoHistoricoRepository) {}

  async execute(id: string): Promise<void> {
    const exists = await this.historicoRepository.findById(id)
    if (!exists) {
      throw new AppError("Histórico não encontrado", 404)
    }

    await this.historicoRepository.delete(id)
  }
}
