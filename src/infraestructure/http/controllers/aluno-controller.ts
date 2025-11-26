import { FastifyRequest, FastifyReply } from "fastify"
import { z } from "zod"
import { PrismaAlunoRepository } from "@/infraestructure/database/respositories/prisma-aluno-repository"
import { PrismaUserRepository } from "@/infraestructure/database/respositories/prisma-user-repository"
import { PrismaProfessorRepository } from "@/infraestructure/database/respositories/prisma-professor-repository"
import { CreateAlunoUseCase } from "@/application/use-cases/aluno/create-alunos"
import { GetAlunosUseCase } from "@/application/use-cases/aluno/get-alunos"
import { GetAlunoByIdUseCase } from "@/application/use-cases/aluno/get-aluno-by-id"
import { UpdateAlunoUseCase } from "@/application/use-cases/aluno/update-aluno"
import { DeleteAlunoUseCase } from "@/application/use-cases/aluno/delete-aluno"
import {
  createAlunoSchema,
  updateAlunoSchema,
  getAlunoByIdSchema,
} from "../validators/aluno-validator"
import { AppError } from "@/shared/errors/app-error"
import { UserRole } from "@/domain/entities/user"
import { PROFESSOR_PADRAO, ERROR_MESSAGES } from "@/shared/constants"

const alunoRepository = new PrismaAlunoRepository()
const userRepository = new PrismaUserRepository()
const professorRepository = new PrismaProfessorRepository()

export class AlunoController {
  async create(request: FastifyRequest, reply: FastifyReply) {
    try {
      const data = createAlunoSchema.parse(request.body)
      const { role, id: userId } = request.user!

      await this.defineProfessorId(data, role, userId)

      const useCase = new CreateAlunoUseCase(
        alunoRepository,
        userRepository,
        professorRepository
      )
      const aluno = await useCase.execute(data as any)

      return reply.status(201).send(aluno)
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({
          error: "Dados inválidos",
          details: error.issues.map((e) => ({
            campo: e.path.join("."),
            mensagem: e.message,
          })),
        })
      }
      throw error
    }
  }

 
  private async defineProfessorId(
    data: any,
    role: UserRole,
    userId: string
  ): Promise<void> {
    if (role === UserRole.PROFESSOR) {
      const professor = await professorRepository.findByUserId(userId)
      if (!professor) {
        throw new AppError(ERROR_MESSAGES.PROFESSOR_NAO_ENCONTRADO, 404)
      }
      data.professorId = professor.id
      console.log(`Professor logado criando aluno: ${professor.id}`)
    } else if (role === UserRole.ADMIN) {
      // Se for admin e não enviou professorId, usa o professor padrão
      if (!data.professorId) {
        const professorPadraoUser = await userRepository.findByEmail(
          PROFESSOR_PADRAO.EMAIL
        )

        if (professorPadraoUser) {
          const professorPadrao = await professorRepository.findByUserId(
            professorPadraoUser.id
          )
          if (professorPadrao) {
            data.professorId = professorPadrao.id
            console.log(
              `Admin criando aluno sem professorId, usando professor padrão: ${data.professorId}`
            )
          }
        }

        if (!data.professorId) {
          throw new AppError(
            ERROR_MESSAGES.PROFESSOR_PADRAO_NAO_ENCONTRADO,
            404
          )
        }
      } else {
        console.log(`Admin criando aluno com professorId: ${data.professorId}`)
      }
    }
  }

  async list(request: FastifyRequest, reply: FastifyReply) {
    const { role, id: userId } = request.user!
    const useCase = new GetAlunosUseCase(alunoRepository)

    let alunos

    if (role === UserRole.ADMIN) {
      alunos = await useCase.execute()
    } else if (role === UserRole.PROFESSOR) {
      const professor = await professorRepository.findByUserId(userId)
      if (!professor) {
        throw new AppError(ERROR_MESSAGES.PROFESSOR_NAO_ENCONTRADO, 404)
      }
      alunos = await useCase.executeByProfessor(professor.id)
    } else {
      const aluno = await alunoRepository.findByUserId(userId)
      alunos = aluno ? [aluno] : []
    }

    const alunosFormatados = alunos.map((aluno) => ({
      ...aluno,
      nome: aluno.user?.nome || "Nome não disponível",
      email: aluno.user?.email || "Email não disponível",
    }))

    return reply.send(alunosFormatados)
  }

  async getById(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { id } = getAlunoByIdSchema.parse(request.params)
      const { role, id: userId } = request.user!

      const useCase = new GetAlunoByIdUseCase(alunoRepository)
      const aluno = await useCase.execute(id)

      this.checkPermission(aluno, role, userId)

      return reply.send(aluno)
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({
          error: "ID inválido",
          details: error.issues,
        })
      }
      throw error
    }
  }

  async update(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { id } = getAlunoByIdSchema.parse(request.params)
      const data = updateAlunoSchema.parse(request.body)
      const { role, id: userId } = request.user!

      if (Object.keys(data).length === 0) {
        return reply.status(400).send({
          error: "Nenhum campo foi enviado para atualização",
        })
      }

      const aluno = await alunoRepository.findById(id)
      if (!aluno) {
        throw new AppError(ERROR_MESSAGES.ALUNO_NAO_ENCONTRADO, 404)
      }

      this.checkUpdatePermission(aluno, role, userId)

      const useCase = new UpdateAlunoUseCase(alunoRepository)
      const updated = await useCase.execute(id, data)

      return reply.send(updated)
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({
          error: "Dados inválidos",
          details: error.issues.map((e) => ({
            campo: e.path.join("."),
            mensagem: e.message,
          })),
        })
      }
      throw error
    }
  }

  async delete(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { id } = getAlunoByIdSchema.parse(request.params)
      const { role, id: userId } = request.user!

      const aluno = await alunoRepository.findById(id)
      if (!aluno) {
        throw new AppError(ERROR_MESSAGES.ALUNO_NAO_ENCONTRADO, 404)
      }

      if (role === UserRole.PROFESSOR) {
        const professor = await professorRepository.findByUserId(userId)
        if (!professor || aluno.professorId !== professor.id) {
          throw new AppError("Você só pode deletar seus próprios alunos", 403)
        }
      }

      const useCase = new DeleteAlunoUseCase(alunoRepository, userRepository)
      await useCase.execute(id)

      return reply.status(204).send()
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({
          error: "ID inválido",
          details: error.issues,
        })
      }
      throw error
    }
  }

 
  private async checkPermission(
    aluno: any,
    role: UserRole,
    userId: string
  ): Promise<void> {
    if (role === UserRole.ALUNO) {
      if (aluno.userId !== userId) {
        throw new AppError("Você não tem permissão para ver este aluno", 403)
      }
    } else if (role === UserRole.PROFESSOR) {
      const professor = await professorRepository.findByUserId(userId)
      if (!professor || aluno.professorId !== professor.id) {
        throw new AppError("Você não tem permissão para ver este aluno", 403)
      }
    }
  }

  
  private async checkUpdatePermission(
    aluno: any,
    role: UserRole,
    userId: string
  ): Promise<void> {
    if (role === UserRole.ALUNO) {
      if (aluno.userId !== userId) {
        throw new AppError("Você só pode atualizar seu próprio perfil", 403)
      }
    } else if (role === UserRole.PROFESSOR) {
      const professor = await professorRepository.findByUserId(userId)
      if (!professor || aluno.professorId !== professor.id) {
        throw new AppError("Você só pode atualizar seus próprios alunos", 403)
      }
    }
  }
}
