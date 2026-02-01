import {
  ArquivoAluno,
  CreateArquivoAlunoInput,
  UpdateArquivoAlunoInput,
} from "@/domain/entities/arquivo-aluno"

export interface ArquivoAlunoRepository {
  create(data: CreateArquivoAlunoInput): Promise<ArquivoAluno>
  findById(id: string): Promise<ArquivoAluno | null>
  findManyByAluno(alunoId: string): Promise<ArquivoAluno[]>
  update(id: string, data: UpdateArquivoAlunoInput): Promise<ArquivoAluno>
  delete(id: string): Promise<void>
}
