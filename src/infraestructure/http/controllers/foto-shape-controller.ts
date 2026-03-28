import { FastifyRequest, FastifyReply } from "fastify"
import { PrismaFotoShapeRepository } from "@/infraestructure/database/respositories/prisma-foto-shape-repository"
import { PrismaAlunoRepository } from "@/infraestructure/database/respositories/prisma-aluno-repository"
import { PrismaProfessorRepository } from "@/infraestructure/database/respositories/prisma-professor-repository"
import { UploadFotoShapeUseCase } from "@/application/use-cases/foto-shape/upload-foto-shape"
import { GetFotosShapeUseCase } from "@/application/use-cases/foto-shape/get-foto-shape"
import { DeleteFotoShapeUseCase } from "@/application/use-cases/foto-shape/delete-foto-shape"
import { AppError } from "@/shared/errors/app-error"
import { UserRole } from "@/domain/entities/user"
import { env } from "@/env"
import { z } from "zod"
import { notificationService } from "@/infraestructure/notifications/notification.service"

const fotoShapeRepository = new PrismaFotoShapeRepository()
const alunoRepository = new PrismaAlunoRepository()
const professorRepository = new PrismaProfessorRepository()

const MAX_DESCRIPTION_LENGTH = 500

const readFieldValue = (field: unknown): string | undefined => {
  if (!field || typeof field !== "object" || !("value" in field)) {
    return undefined
  }

  const value = (field as { value?: unknown }).value
  return typeof value === "string" ? value : undefined
}

export class FotoShapeController {
  async upload(request: FastifyRequest, reply: FastifyReply) {
    const { role, id: userId } = request.user!

    const data = await request.file()
    if (!data) {
      throw new AppError("Nenhum arquivo foi enviado", 400)
    }

    if (!data.mimetype.startsWith("image/")) {
      throw new AppError("Apenas imagens são permitidas", 400)
    }

    const buffer = await data.toBuffer()

    if (buffer.length > env.MAX_PHOTO_SIZE) {
      throw new AppError(
        `Arquivo muito grande. Máximo: ${env.MAX_PHOTO_SIZE / 1024 / 1024}MB`,
        400
      )
    }

    let alunoId: string

    if (role === UserRole.ALUNO) {
      const aluno = await alunoRepository.findByUserId(userId)
      if (!aluno) {
        throw new AppError("Perfil de aluno não encontrado", 404)
      }
      alunoId = aluno.id
    } else {
      throw new AppError("Apenas alunos podem enviar fotos de shape", 403)
    }

    const rawDescricao = readFieldValue(
      (data.fields as Record<string, unknown> | undefined)?.descricao
    )
    const descricao = rawDescricao?.trim() || undefined

    if (descricao && descricao.length > MAX_DESCRIPTION_LENGTH) {
      throw new AppError("Descrição muito longa", 400)
    }

    const useCase = new UploadFotoShapeUseCase(
      fotoShapeRepository,
      alunoRepository
    )

    const foto = await useCase.execute({
      alunoId,
      buffer,
      descricao,
    })

    await notificationService
      .notifyProfessorAlunoEnviouFotos({ alunoId, descricao })
      .catch((error) => {
        request.log.error(
          { error, alunoId },
          "Falha ao notificar professor sobre envio de fotos"
        )
      })

    return reply.status(201).send(foto)
  }

  async list(request: FastifyRequest, reply: FastifyReply) {
    const { role, id: userId } = request.user!
    const { alunoId } = request.params as { alunoId: string }

    if (!z.string().uuid().safeParse(alunoId).success) {
      throw new AppError("ID do aluno inválido", 400)
    }

    const aluno = await alunoRepository.findById(alunoId)
    if (!aluno) {
      throw new AppError("Aluno não encontrado", 404)
    }

    if (role === UserRole.ALUNO && aluno.userId !== userId) {
      throw new AppError("Você só pode ver suas próprias fotos", 403)
    }

    if (role === UserRole.PROFESSOR) {
      const professor = await professorRepository.findByUserId(userId)
      if (!professor || aluno.professorId !== professor.id) {
        throw new AppError("Você só pode ver fotos dos seus alunos", 403)
      }
    }

    const useCase = new GetFotosShapeUseCase(fotoShapeRepository)
    const fotos = await useCase.execute(alunoId)

    return reply.send(fotos)
  }

  async delete(request: FastifyRequest, reply: FastifyReply) {
    const { role, id: userId } = request.user!
    const { id } = request.params as { id: string }

    if (!z.string().uuid().safeParse(id).success) {
      throw new AppError("ID inválido", 400)
    }

    const foto = await fotoShapeRepository.findById(id)
    if (!foto) {
      throw new AppError("Foto não encontrada", 404)
    }

    const aluno = await alunoRepository.findById(foto.alunoId)
    if (!aluno) {
      throw new AppError("Aluno não encontrado", 404)
    }

    if (role === UserRole.ALUNO && aluno.userId !== userId) {
      throw new AppError("Você só pode deletar suas próprias fotos", 403)
    }

    if (role === UserRole.PROFESSOR) {
      const professor = await professorRepository.findByUserId(userId)
      if (!professor || aluno.professorId !== professor.id) {
        throw new AppError("Você só pode deletar fotos dos seus alunos", 403)
      }
    }

    const useCase = new DeleteFotoShapeUseCase(fotoShapeRepository)
    await useCase.execute(id)

    return reply.status(204).send()
  }
}
