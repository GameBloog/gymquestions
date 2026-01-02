
import { AlunoHistoricoRepository } from "@/application/repositories/aluno-history-repository"
import {
  AlunoHistorico,
  HistoricoFiltros,
} from "@/domain/entities/aluno-history"

export class GetAlunoHistoricoUseCase {
  constructor(private historicoRepository: AlunoHistoricoRepository) {}

  async execute(
    alunoId: string,
    filtros?: HistoricoFiltros
  ): Promise<AlunoHistorico[]> {
    return await this.historicoRepository.findByAlunoId(alunoId, filtros)
  }

  async getLatest(alunoId: string): Promise<AlunoHistorico | null> {
    return await this.historicoRepository.findLatestByAlunoId(alunoId)
  }
}