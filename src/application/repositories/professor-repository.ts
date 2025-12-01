import {
  Professor,
  CreateProfessorInput,
  UpdateProfessorInput,
} from "@/domain/entities/professor"

export interface ProfessorRepository {
  create(data: CreateProfessorInput): Promise<Professor>
  findById(id: string): Promise<Professor | null>
  findByUserId(userId: string): Promise<Professor | null>
  findMany(): Promise<Professor[]>
  findPadrao(): Promise<Professor | null>
  update(id: string, data: UpdateProfessorInput): Promise<Professor>
  delete(id: string): Promise<void>
}
