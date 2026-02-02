import { FastifyRequest, FastifyReply } from "fastify"
import { PrismaArquivoAlunoRepository } from "@/infraestructure/database/respositories/prisma-arquivo-aluno-repository"
import { PrismaAlunoRepository } from "@/infraestructure/database/respositories/prisma-aluno-repository"
import { PrismaProfessorRepository } from "@/infraestructure/database/respositories/prisma-professor-repository"
import { UploadArquivoAlunoUseCase } from "@/application/use-cases/arquivo-aluno/upload-arquivo-aluno"
import { GetArquivosAlunoUseCase } from "@/application/use-cases/arquivo-aluno/get-arquivos-aluno"
import { DeleteArquivoAlunoUseCase } from "@/application/use-cases/arquivo-aluno/delete-arquivo-aluno"
import { TipoArquivo } from "@prisma/client"
import { AppError } from "@/shared/errors/app-error"
import { UserRole } from "@/domain/entities/user"
import { env } from "@/env"
import { z } from "zod"

const arquivoRepository = new PrismaArquivoAlunoRepository()
const alunoRepository = new PrismaAlunoRepository()
const professorRepository = new PrismaProfessorRepository()

export class ArquivoAlunoController {
  async upload(request: FastifyRequest, reply: FastifyReply) {
    const { role, id: userId } = request.user!

    if (role === UserRole.ALUNO) {
      throw new AppError("Apenas professores podem enviar treinos/dietas", 403)
    }

    const data = await request.file()
    if (!data) {
      throw new AppError("Nenhum arquivo foi enviado", 400)
    }

    if (data.mimetype !== "application/pdf") {
      throw new AppError("Apenas arquivos PDF são permitidos", 400)
    }

    const buffer = await data.toBuffer()

    if (buffer.length > env.MAX_FILE_SIZE) {
      throw new AppError(
        `Arquivo muito grande. Máximo: ${env.MAX_FILE_SIZE / 1024 / 1024}MB`,
        400
      )
    }

    const fields = data.fields as any
    const alunoId = fields?.alunoId?.value
    const tipo = fields?.tipo?.value
    const titulo = fields?.titulo?.value
    const descricao = fields?.descricao?.value

    if (!alunoId || !tipo || !titulo) {
      throw new AppError("Campos obrigatórios: alunoId, tipo, titulo", 400)
    }

    if (tipo !== "TREINO" && tipo !== "DIETA") {
      throw new AppError("Tipo deve ser TREINO ou DIETA", 400)
    }

    if (!z.string().uuid().safeParse(alunoId).success) {
      throw new AppError("ID do aluno inválido", 400)
    }

    let professorId: string

    if (role === UserRole.PROFESSOR) {
      const professor = await professorRepository.findByUserId(userId)
      if (!professor) {
        throw new AppError("Perfil de professor não encontrado", 404)
      }

      const aluno = await alunoRepository.findById(alunoId)
      if (!aluno || aluno.professorId !== professor.id) {
        throw new AppError("Você só pode enviar arquivos para seus alunos", 403)
      }

      professorId = professor.id
    } else {
      const aluno = await alunoRepository.findById(alunoId)
      if (!aluno) {
        throw new AppError("Aluno não encontrado", 404)
      }
      professorId = aluno.professorId
    }

    const useCase = new UploadArquivoAlunoUseCase(
      arquivoRepository,
      alunoRepository
    )

    const arquivo = await useCase.execute({
      alunoId,
      professorId,
      tipo: tipo as TipoArquivo,
      titulo,
      descricao,
      buffer,
    })

    return reply.status(201).send(arquivo)
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
      throw new AppError("Você só pode ver seus próprios arquivos", 403)
    }

    if (role === UserRole.PROFESSOR) {
      const professor = await professorRepository.findByUserId(userId)
      if (!professor || aluno.professorId !== professor.id) {
        throw new AppError("Você só pode ver arquivos dos seus alunos", 403)
      }
    }

    const useCase = new GetArquivosAlunoUseCase(arquivoRepository)
    const arquivos = await useCase.execute(alunoId)

    return reply.send(arquivos)
  }

  async delete(request: FastifyRequest, reply: FastifyReply) {
    const { role, id: userId } = request.user!
    const { id } = request.params as { id: string }

    if (!z.string().uuid().safeParse(id).success) {
      throw new AppError("ID inválido", 400)
    }

    if (role === UserRole.ALUNO) {
      throw new AppError("Alunos não podem deletar arquivos", 403)
    }

    const arquivo = await arquivoRepository.findById(id)
    if (!arquivo) {
      throw new AppError("Arquivo não encontrado", 404)
    }

    if (role === UserRole.PROFESSOR) {
      const professor = await professorRepository.findByUserId(userId)
      if (!professor || arquivo.professorId !== professor.id) {
        throw new AppError("Você só pode deletar seus próprios arquivos", 403)
      }
    }

    const useCase = new DeleteArquivoAlunoUseCase(arquivoRepository)
    await useCase.execute(id)

    return reply.status(204).send()
  }
}
