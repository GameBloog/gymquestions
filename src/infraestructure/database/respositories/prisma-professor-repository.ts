import { ProfessorRepository } from "@/application/repositories/professor-repository"
import {
  Professor,
  CreateProfessorInput,
  UpdateProfessorInput,
} from "@/domain/entities/professor"
import { prisma } from "../prisma"
import { AppError } from "@/shared/errors/app-error"

export class PrismaProfessorRepository implements ProfessorRepository {
  async create(data: CreateProfessorInput): Promise<Professor> {
    return await prisma.professor.create({
      data: {
        userId: data.userId,
        telefone: data.telefone ?? null,
        especialidade: data.especialidade ?? null,
      },
    })
  }

  async findById(id: string): Promise<Professor | null> {
    return await prisma.professor.findUnique({
      where: { id },
    })
  }

  async findByUserId(userId: string): Promise<Professor | null> {
    return await prisma.professor.findUnique({
      where: { userId },
    })
  }

  async findMany(): Promise<Professor[]> {
    return await prisma.professor.findMany({
      orderBy: { createdAt: "desc" },
    })
  }

  async update(id: string, data: UpdateProfessorInput): Promise<Professor> {
    try {
      return await prisma.professor.update({
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
      await prisma.professor.delete({
        where: { id },
      })
    } catch (error) {
      throw new AppError("Professor não encontrado", 404)
    }
  }
}
