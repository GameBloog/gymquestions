import { FotoShapeRepository } from "@/application/repositories/foto-shape-repository"
import { FotoShape } from "@/domain/entities/foto-shape"

export class GetFotosShapeUseCase {
  constructor(private fotoShapeRepository: FotoShapeRepository) {}

  async execute(alunoId: string): Promise<FotoShape[]> {
    return await this.fotoShapeRepository.findManyByAluno(alunoId)
  }
}
