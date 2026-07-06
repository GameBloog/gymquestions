import { ProfessorRepository } from "@/application/repositories/professor-repository"
import {
  Professor,
  CreateProfessorInput,
  UpdateProfessorInput,
} from "@/domain/entities/professor"
import { prisma } from "../prisma"
import { AppError } from "@/shared/errors/app-error"
import { PrismaDatabaseClient } from "../prisma-database-client"

export class PrismaProfessorRepository implements ProfessorRepository {
  constructor(private readonly database: PrismaDatabaseClient = prisma) {}

  async create(data: CreateProfessorInput): Promise<Professor> {
    return await this.database.professor.create({
      data: {
        userId: data.userId,
        telefone: data.telefone ?? null,
        especialidade: data.especialidade ?? null,
        isPadrao: false, 
      },
    })
  }

  async findById(id: string): Promise<Professor | null> {
    return await this.database.professor.findUnique({
      where: { id },
    })
  }

  async findByUserId(userId: string): Promise<Professor | null> {
    return await this.database.professor.findUnique({
      where: { userId },
    })
  }

  async findMany(): Promise<Professor[]> {
    return await this.database.professor.findMany({
      orderBy: { createdAt: "desc" },
    })
  }

  async findPadrao(): Promise<Professor | null> {
    return await this.database.professor.findFirst({
      where: { isPadrao: true },
    })
  }

  async update(id: string, data: UpdateProfessorInput): Promise<Professor> {
    try {
      return await this.database.professor.update({
        where: { id },
        data: {
          ...(data.telefone !== undefined && { telefone: data.telefone }),
          ...(data.especialidade !== undefined && {
            especialidade: data.especialidade,
          }),
        },
      })
    } catch (error) {
      throw new AppError("Professor não encontrado", 404)
    }
  }

  async delete(id: string): Promise<void> {
    try {
      const professor = await this.database.professor.findUnique({
        where: { id },
      })

      if (professor?.isPadrao) {
        throw new AppError(
          "Não é possível deletar o professor padrão do sistema",
          400
        )
      }

      await this.database.professor.delete({
        where: { id },
      })
    } catch (error) {
      if (error instanceof AppError) {
        throw error
      }
      throw new AppError("Professor não encontrado", 404)
    }
  }
}
