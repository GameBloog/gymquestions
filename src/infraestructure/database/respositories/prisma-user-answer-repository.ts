import { Prisma } from "@prisma/client"
import { UserAnswerRepository } from "../../../application/repositories/user-answer-repostiroy"
import {
  CreateUserAnswerInput,
  UpdateUserAnswerInput,
  UserAnswer,
} from "../../../domain/entities/user-answer"
import { prisma } from "../prisma"
import { AppError } from "../../../shared/errors/app-error"

export class PrismaUserAnswerRepository implements UserAnswerRepository {
  async create(data: CreateUserAnswerInput): Promise<UserAnswer> {
    return await prisma.userAnswer.create({
      data: {
        nome: data.nome,
        email: data.email,
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

  async findMany(limit?: number): Promise<UserAnswer[]> {
    return await prisma.userAnswer.findMany({
      orderBy: { createdAt: "desc" },
      take: limit,
    })
  }

  async findById(id: string): Promise<UserAnswer | null> {
    return await prisma.userAnswer.findUnique({
      where: { id },
    })
  }

  async update(id: string, data: UpdateUserAnswerInput): Promise<UserAnswer> {
    try {
      return await prisma.userAnswer.update({
        where: { id },
        data: {
          ...(data.nome && { nome: data.nome }),
          ...(data.email && { email: data.email }),
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
      throw new AppError("Resposta não encontrada", 404)
    }
  }

  async delete(id: string): Promise<void> {
    try {
      await prisma.userAnswer.delete({
        where: { id },
      })
    } catch (error) {
      throw new AppError("Resposta não encontrada", 404)
    }
  }
}
