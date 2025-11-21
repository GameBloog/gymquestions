import { AlunoRepository } from "@/application/repositories/aluno-repository"
import {
  Aluno,
  CreateAlunoInput,
  UpdateAlunoInput,
} from "@/domain/entities/aluno"
import { prisma } from "../prisma"
import { AppError } from "@/shared/errors/app-error"
import { Prisma } from "@prisma/client"

export class PrismaAlunoRepository implements AlunoRepository {
  async create(data: CreateAlunoInput): Promise<Aluno> {
    return await prisma.aluno.create({
      data: {
        userId: data.userId,
        professorId: data.professorId,
        telefone: data.telefone ?? null,
        alturaCm: data.alturaCm ?? null,
        pesoKg: data.pesoKg ?? null,
        idade: data.idade ?? null,
        cinturaCm: data.cinturaCm ?? null,
        quadrilCm: data.quadrilCm ?? null,
        pescocoCm: data.pescocoCm ?? null,
        alimentos_quer_diario: data.alimentos_quer_diario ?? Prisma.JsonNull,
        alimentos_nao_comem: data.alimentos_nao_comem ?? Prisma.JsonNull,
        alergias_alimentares: data.alergias_alimentares ?? Prisma.JsonNull,
        dores_articulares: data.dores_articulares ?? null,
        suplementos_consumidos: data.suplementos_consumidos ?? Prisma.JsonNull,
        dias_treino_semana: data.dias_treino_semana ?? null,
        frequencia_horarios_refeicoes:
          data.frequencia_horarios_refeicoes ?? null,
      },
    })
  }

  async findById(id: string): Promise<Aluno | null> {
    return await prisma.aluno.findUnique({
      where: { id },
    })
  }

  async findByUserId(userId: string): Promise<Aluno | null> {
    return await prisma.aluno.findUnique({
      where: { userId },
    })
  }

  async findMany(): Promise<Aluno[]> {
    return await prisma.aluno.findMany({
      orderBy: { createdAt: "desc" },
    })
  }

  async findManyByProfessor(professorId: string): Promise<Aluno[]> {
    return await prisma.aluno.findMany({
      where: { professorId },
      orderBy: { createdAt: "desc" },
    })
  }

  async update(id: string, data: UpdateAlunoInput): Promise<Aluno> {
    try {
      return await prisma.aluno.update({
        where: { id },
        data: {
          ...(data.telefone !== undefined && { telefone: data.telefone }),
          ...(data.alturaCm !== undefined && { alturaCm: data.alturaCm }),
          ...(data.pesoKg !== undefined && { pesoKg: data.pesoKg }),
          ...(data.idade !== undefined && { idade: data.idade }),
          ...(data.cinturaCm !== undefined && { cinturaCm: data.cinturaCm }),
          ...(data.quadrilCm !== undefined && { quadrilCm: data.quadrilCm }),
          ...(data.pescocoCm !== undefined && { pescocoCm: data.pescocoCm }),
          ...(data.alimentos_quer_diario !== undefined && {
            alimentos_quer_diario: data.alimentos_quer_diario,
          }),
          ...(data.alimentos_nao_comem !== undefined && {
            alimentos_nao_comem: data.alimentos_nao_comem,
          }),
          ...(data.alergias_alimentares !== undefined && {
            alergias_alimentares: data.alergias_alimentares,
          }),
          ...(data.dores_articulares !== undefined && {
            dores_articulares: data.dores_articulares,
          }),
          ...(data.suplementos_consumidos !== undefined && {
            suplementos_consumidos: data.suplementos_consumidos,
          }),
          ...(data.dias_treino_semana !== undefined && {
            dias_treino_semana: data.dias_treino_semana,
          }),
          ...(data.frequencia_horarios_refeicoes !== undefined && {
            frequencia_horarios_refeicoes: data.frequencia_horarios_refeicoes,
          }),
        },
      })
    } catch (error) {
      throw new AppError("Aluno não encontrado", 404)
    }
  }

  async delete(id: string): Promise<void> {
    try {
      await prisma.aluno.delete({
        where: { id },
      })
    } catch (error) {
      throw new AppError("Aluno não encontrado", 404)
    }
  }
}
