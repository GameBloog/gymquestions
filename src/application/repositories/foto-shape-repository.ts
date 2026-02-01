import { FotoShape, CreateFotoShapeInput } from "@/domain/entities/foto-shape"

export interface FotoShapeRepository {
  create(data: CreateFotoShapeInput): Promise<FotoShape>
  findById(id: string): Promise<FotoShape | null>
  findManyByAluno(alunoId: string): Promise<FotoShape[]>
  delete(id: string): Promise<void>
}
