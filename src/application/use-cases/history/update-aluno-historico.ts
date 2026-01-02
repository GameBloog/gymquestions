// ============================================
// update-aluno-historico.ts
// ============================================
import { AlunoHistoricoRepository } from "@/application/repositories/aluno-history-repository"
import {
  AlunoHistorico,
  UpdateAlunoHistoricoInput,
} from "@/domain/entities/aluno-history"
import { AppError } from "@/shared/errors/app-error"

export class UpdateAlunoHistoricoUseCase {
  constructor(private historicoRepository: AlunoHistoricoRepository) {}

  async execute(
    id: string,
    data: UpdateAlunoHistoricoInput
  ): Promise<AlunoHistorico> {
    const exists = await this.historicoRepository.findById(id)
    if (!exists) {
      throw new AppError("Histórico não encontrado", 404)
    }

    return await this.historicoRepository.update(id, data)
  }
}
