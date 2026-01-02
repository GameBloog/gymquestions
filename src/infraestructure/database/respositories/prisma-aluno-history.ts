import { AlunoHistoricoRepository } from "@/application/repositories/aluno-history-repository"
import {
  AlunoHistorico,
  CreateAlunoHistoricoInput,
  UpdateAlunoHistoricoInput,
  HistoricoFiltros,
} from "@/domain/entities/aluno-history"
import { prisma } from "../prisma"
import { AppError } from "@/shared/errors/app-error"

export class PrismaAlunoHistoricoRepository
  implements AlunoHistoricoRepository
{
  async create(data: CreateAlunoHistoricoInput): Promise<AlunoHistorico> {
    return await prisma.alunoHistorico.create({
      data: {
        alunoId: data.alunoId,
        pesoKg: data.pesoKg ?? null,
        alturaCm: data.alturaCm ?? null,
        cinturaCm: data.cinturaCm ?? null,
        quadrilCm: data.quadrilCm ?? null,
        pescocoCm: data.pescocoCm ?? null,
        bracoEsquerdoCm: data.bracoEsquerdoCm ?? null,
        bracoDireitoCm: data.bracoDireitoCm ?? null,
        pernaEsquerdaCm: data.pernaEsquerdaCm ?? null,
        pernaDireitaCm: data.pernaDireitaCm ?? null,
        percentualGordura: data.percentualGordura ?? null,
        massaMuscularKg: data.massaMuscularKg ?? null,
        observacoes: data.observacoes ?? null,
        registradoPor: data.registradoPor,
        dataRegistro: data.dataRegistro ?? new Date(),
      },
    })
  }

  async findById(id: string): Promise<AlunoHistorico | null> {
    return await prisma.alunoHistorico.findUnique({
      where: { id },
    })
  }

  async findByAlunoId(
    alunoId: string,
    filtros?: HistoricoFiltros
  ): Promise<AlunoHistorico[]> {
    const where: any = { alunoId }

    if (filtros?.dataInicio || filtros?.dataFim) {
      where.dataRegistro = {}
      if (filtros.dataInicio) {
        where.dataRegistro.gte = filtros.dataInicio
      }
      if (filtros.dataFim) {
        where.dataRegistro.lte = filtros.dataFim
      }
    }

    return await prisma.alunoHistorico.findMany({
      where,
      orderBy: { dataRegistro: "desc" },
      take: filtros?.limite,
    })
  }

  async findLatestByAlunoId(alunoId: string): Promise<AlunoHistorico | null> {
    return await prisma.alunoHistorico.findFirst({
      where: { alunoId },
      orderBy: { dataRegistro: "desc" },
    })
  }

  async update(
    id: string,
    data: UpdateAlunoHistoricoInput
  ): Promise<AlunoHistorico> {
    try {
      return await prisma.alunoHistorico.update({
        where: { id },
        data: {
          ...(data.pesoKg !== undefined && { pesoKg: data.pesoKg }),
          ...(data.alturaCm !== undefined && { alturaCm: data.alturaCm }),
          ...(data.cinturaCm !== undefined && { cinturaCm: data.cinturaCm }),
          ...(data.quadrilCm !== undefined && { quadrilCm: data.quadrilCm }),
          ...(data.pescocoCm !== undefined && { pescocoCm: data.pescocoCm }),
          ...(data.bracoEsquerdoCm !== undefined && {
            bracoEsquerdoCm: data.bracoEsquerdoCm,
          }),
          ...(data.bracoDireitoCm !== undefined && {
            bracoDireitoCm: data.bracoDireitoCm,
          }),
          ...(data.pernaEsquerdaCm !== undefined && {
            pernaEsquerdaCm: data.pernaEsquerdaCm,
          }),
          ...(data.pernaDireitaCm !== undefined && {
            pernaDireitaCm: data.pernaDireitaCm,
          }),
          ...(data.percentualGordura !== undefined && {
            percentualGordura: data.percentualGordura,
          }),
          ...(data.massaMuscularKg !== undefined && {
            massaMuscularKg: data.massaMuscularKg,
          }),
          ...(data.observacoes !== undefined && {
            observacoes: data.observacoes,
          }),
        },
      })
    } catch (error) {
      throw new AppError("Histórico não encontrado", 404)
    }
  }

  async delete(id: string): Promise<void> {
    try {
      await prisma.alunoHistorico.delete({
        where: { id },
      })
    } catch (error) {
      throw new AppError("Histórico não encontrado", 404)
    }
  }
}
