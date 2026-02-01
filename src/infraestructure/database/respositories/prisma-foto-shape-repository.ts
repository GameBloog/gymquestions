import { FotoShapeRepository } from "@/application/repositories/foto-shape-repository"
import { FotoShape, CreateFotoShapeInput } from "@/domain/entities/foto-shape"
import { prisma } from "../prisma"
import { AppError } from "@/shared/errors/app-error"

export class PrismaFotoShapeRepository implements FotoShapeRepository {
  async create(data: CreateFotoShapeInput): Promise<FotoShape> {
    return await prisma.fotoShape.create({
      data: {
        alunoId: data.alunoId,
        url: data.url,
        publicId: data.publicId,
        descricao: data.descricao ?? null,
      },
    })
  }

  async findById(id: string): Promise<FotoShape | null> {
    return await prisma.fotoShape.findUnique({
      where: { id },
    })
  }

  async findManyByAluno(alunoId: string): Promise<FotoShape[]> {
    return await prisma.fotoShape.findMany({
      where: { alunoId },
      orderBy: { createdAt: "desc" },
    })
  }

  async delete(id: string): Promise<void> {
    try {
      await prisma.fotoShape.delete({
        where: { id },
      })
    } catch (error) {
      throw new AppError("Foto não encontrada", 404)
    }
  }
}
