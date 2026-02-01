import { ArquivoAlunoRepository } from "@/application/repositories/arquivo-aluno-repository"
import {
  ArquivoAluno,
  CreateArquivoAlunoInput,
  UpdateArquivoAlunoInput,
} from "@/domain/entities/arquivo-aluno"
import { prisma } from "../prisma"
import { AppError } from "@/shared/errors/app-error"

export class PrismaArquivoAlunoRepository implements ArquivoAlunoRepository {
  async create(data: CreateArquivoAlunoInput): Promise<ArquivoAluno> {
    return await prisma.arquivoAluno.create({
      data: {
        alunoId: data.alunoId,
        professorId: data.professorId,
        tipo: data.tipo,
        titulo: data.titulo,
        descricao: data.descricao ?? null,
        url: data.url,
        publicId: data.publicId,
      },
    })
  }

  async findById(id: string): Promise<ArquivoAluno | null> {
    return await prisma.arquivoAluno.findUnique({
      where: { id },
    })
  }

  async findManyByAluno(alunoId: string): Promise<ArquivoAluno[]> {
    return await prisma.arquivoAluno.findMany({
      where: { alunoId },
      orderBy: { createdAt: "desc" },
    })
  }

  async update(
    id: string,
    data: UpdateArquivoAlunoInput
  ): Promise<ArquivoAluno> {
    try {
      return await prisma.arquivoAluno.update({
        where: { id },
        data: {
          ...(data.titulo !== undefined && { titulo: data.titulo }),
          ...(data.descricao !== undefined && { descricao: data.descricao }),
        },
      })
    } catch (error) {
      throw new AppError("Arquivo não encontrado", 404)
    }
  }

  async delete(id: string): Promise<void> {
    try {
      await prisma.arquivoAluno.delete({
        where: { id },
      })
    } catch (error) {
      throw new AppError("Arquivo não encontrado", 404)
    }
  }
}
