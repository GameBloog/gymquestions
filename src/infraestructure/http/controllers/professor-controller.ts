import { FastifyRequest, FastifyReply } from "fastify"
import { z } from "zod"
import { PrismaProfessorRepository } from "@/infraestructure/database/respositories/prisma-professor-repository"
import { PrismaUserRepository } from "@/infraestructure/database/respositories/prisma-user-repository"
import { PrismaAlunoRepository } from "@/infraestructure/database/respositories/prisma-aluno-repository"
import { CreateProfessorUseCase } from "@/application/use-cases/professor/create-professor"
import { GetProfessoresUseCase } from "@/application/use-cases/professor/get-professores"
import { GetProfessorByIdUseCase } from "@/application/use-cases/professor/get-professor-by-id"
import { UpdateProfessorUseCase } from "@/application/use-cases/professor/update-professor"
import { DeleteProfessorUseCase } from "@/application/use-cases/professor/delete-professor"
import {
  createProfessorSchema,
  updateProfessorSchema,
  getProfessorByIdSchema,
} from "../validators/professor-validator"
import { prisma } from "@/infraestructure/database/prisma"

const professorRepository = new PrismaProfessorRepository()
const userRepository = new PrismaUserRepository()
const alunoRepository = new PrismaAlunoRepository()

export class ProfessorController {
  async create(request: FastifyRequest, reply: FastifyReply) {
    try {
      const data = createProfessorSchema.parse(request.body)

      const useCase = new CreateProfessorUseCase(
        professorRepository,
        userRepository
      )
      const professor = await useCase.execute(data)

      const professorComUser = await prisma.professor.findUnique({
        where: { id: professor.id },
        include: {
          user: { select: { id: true, nome: true, email: true, role: true } },
        },
      })

      return reply.status(201).send(professorComUser)
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

  async list(request: FastifyRequest, reply: FastifyReply) {
    const useCase = new GetProfessoresUseCase(professorRepository)
    const professores = await useCase.execute()

    const professoresCompletos = await Promise.all(
      professores.map(async (prof) => {
        const user = await userRepository.findById(prof.userId)
        return {
          ...prof,
          user: user
            ? {
                id: user.id,
                nome: user.nome,
                email: user.email,
                role: user.role,
              }
            : null,
        }
      })
    )

    return reply.send(professoresCompletos)
  }

  async getById(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { id } = getProfessorByIdSchema.parse(request.params)

      const useCase = new GetProfessorByIdUseCase(professorRepository)
      const professor = await useCase.execute(id)

      const user = await userRepository.findById(professor.userId)

      return reply.send({
        ...professor,
        user: user
          ? {
              id: user.id,
              nome: user.nome,
              email: user.email,
              role: user.role,
            }
          : null,
      })
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
      const { id } = getProfessorByIdSchema.parse(request.params)
      const data = updateProfessorSchema.parse(request.body)

      if (Object.keys(data).length === 0) {
        return reply.status(400).send({
          error: "Nenhum campo foi enviado para atualização",
        })
      }

      const useCase = new UpdateProfessorUseCase(professorRepository)
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
      const { id } = getProfessorByIdSchema.parse(request.params)

      const useCase = new DeleteProfessorUseCase(
        professorRepository,
        alunoRepository
      )
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
}
