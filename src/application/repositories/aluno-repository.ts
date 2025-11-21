import {
  Aluno,
  CreateAlunoInput,
  UpdateAlunoInput,
} from "@/domain/entities/aluno"

export interface AlunoRepository {
  create(data: CreateAlunoInput): Promise<Aluno>
  findById(id: string): Promise<Aluno | null>
  findByUserId(userId: string): Promise<Aluno | null>
  findMany(): Promise<Aluno[]>
  findManyByProfessor(professorId: string): Promise<Aluno[]>
  update(id: string, data: UpdateAlunoInput): Promise<Aluno>
  delete(id: string): Promise<void>
}
