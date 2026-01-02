
import { AlunoHistoricoRepository } from "@/application/repositories/aluno-history-repository"
import { AlunoRepository } from "@/application/repositories/aluno-repository"
import { AlunoHistorico } from "@/domain/entities/aluno-history"
import { AppError } from "@/shared/errors/app-error"

interface CreateHistoricoInput {
  alunoId: string
  pesoKg?: number
  alturaCm?: number
  cinturaCm?: number
  quadrilCm?: number
  pescocoCm?: number
  bracoEsquerdoCm?: number
  bracoDireitoCm?: number
  pernaEsquerdaCm?: number
  pernaDireitaCm?: number
  percentualGordura?: number
  massaMuscularKg?: number
  observacoes?: string
  registradoPor: string
  dataRegistro?: Date
}

export class CreateAlunoHistoricoUseCase {
  constructor(
    private historicoRepository: AlunoHistoricoRepository,
    private alunoRepository: AlunoRepository
  ) {}

  async execute(data: CreateHistoricoInput): Promise<AlunoHistorico> {
    const aluno = await this.alunoRepository.findById(data.alunoId)
    if (!aluno) {
      throw new AppError("Aluno não encontrado", 404)
    }

    const historico = await this.historicoRepository.create(data)

    const updateData: any = {}
    if (data.pesoKg !== undefined) updateData.pesoKg = data.pesoKg
    if (data.alturaCm !== undefined) updateData.alturaCm = data.alturaCm
    if (data.cinturaCm !== undefined) updateData.cinturaCm = data.cinturaCm
    if (data.quadrilCm !== undefined) updateData.quadrilCm = data.quadrilCm
    if (data.pescocoCm !== undefined) updateData.pescocoCm = data.pescocoCm

    if (Object.keys(updateData).length > 0) {
      await this.alunoRepository.update(data.alunoId, updateData)
    }

    return historico
  }
}





