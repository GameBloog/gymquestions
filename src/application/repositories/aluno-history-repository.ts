import {
  AlunoHistorico,
  CreateAlunoHistoricoInput,
  UpdateAlunoHistoricoInput,
  HistoricoFiltros,
} from "@/domain/entities/aluno-history"

export interface AlunoHistoricoRepository {
  create(data: CreateAlunoHistoricoInput): Promise<AlunoHistorico>
  findById(id: string): Promise<AlunoHistorico | null>
  findByAlunoId(
    alunoId: string,
    filtros?: HistoricoFiltros
  ): Promise<AlunoHistorico[]>
  findLatestByAlunoId(alunoId: string): Promise<AlunoHistorico | null>
  update(id: string, data: UpdateAlunoHistoricoInput): Promise<AlunoHistorico>
  delete(id: string): Promise<void>
}
