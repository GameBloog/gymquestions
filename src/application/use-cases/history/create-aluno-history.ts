
import { AlunoHistoricoRepository } from "@/application/repositories/aluno-history-repository"
import { AlunoRepository } from "@/application/repositories/aluno-repository"
import { AlunoHistorico } from "@/domain/entities/aluno-history"
import { AppError } from "@/shared/errors/app-error"
import {
  calculateLeanMassKg,
  calculateNavyBodyFat,
} from "../dieta/nutrition-calculator"

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
  massaMagraKg?: number
  observacoes?: string
  registradoPor: string
  dataRegistro?: Date
}

const hasHistoricoContent = (data: CreateHistoricoInput): boolean =>
  [
    data.pesoKg,
    data.alturaCm,
    data.cinturaCm,
    data.quadrilCm,
    data.pescocoCm,
    data.bracoEsquerdoCm,
    data.bracoDireitoCm,
    data.pernaEsquerdaCm,
    data.pernaDireitaCm,
    data.percentualGordura,
    data.massaMagraKg,
  ].some((value) => value !== undefined) || Boolean(data.observacoes?.trim())

export class CreateAlunoHistoricoUseCase {
  constructor(
    private historicoRepository: AlunoHistoricoRepository,
    private alunoRepository: AlunoRepository
  ) {}

  async execute(data: CreateHistoricoInput): Promise<AlunoHistorico> {
    if (!hasHistoricoContent(data)) {
      throw new AppError(
        "Informe pelo menos uma medida ou uma observação",
        400
      )
    }

    const aluno = await this.alunoRepository.findById(data.alunoId)
    if (!aluno) {
      throw new AppError("Aluno não encontrado", 404)
    }

    const alturaCm = data.alturaCm ?? aluno.alturaCm ?? undefined
    const cinturaCm = data.cinturaCm ?? aluno.cinturaCm ?? undefined
    const quadrilCm = data.quadrilCm ?? aluno.quadrilCm ?? undefined
    const pescocoCm = data.pescocoCm ?? aluno.pescocoCm ?? undefined
    const pesoKg = data.pesoKg ?? aluno.pesoKg ?? undefined

    const percentualCalculado =
      data.percentualGordura ??
      (aluno.sexoBiologico && alturaCm && cinturaCm && pescocoCm
        ? calculateNavyBodyFat({
            sexoBiologico: aluno.sexoBiologico,
            alturaCm,
            cinturaCm,
            quadrilCm,
            pescocoCm,
          })
        : null)

    const massaMagraCalculada =
      data.massaMagraKg ??
      calculateLeanMassKg(pesoKg, percentualCalculado ?? undefined)

    const historico = await this.historicoRepository.create({
      ...data,
      percentualGordura: percentualCalculado ?? undefined,
      massaMagraKg: massaMagraCalculada ?? undefined,
    })

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




