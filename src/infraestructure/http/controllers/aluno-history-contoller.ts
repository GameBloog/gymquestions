import { FastifyRequest, FastifyReply } from "fastify"
import { z } from "zod"
import { PrismaAlunoHistoricoRepository } from "@/infraestructure/database/respositories/prisma-aluno-history"
import { PrismaAlunoRepository } from "@/infraestructure/database/respositories/prisma-aluno-repository"
import { PrismaProfessorRepository } from "@/infraestructure/database/respositories/prisma-professor-repository"
import { CreateAlunoHistoricoUseCase } from "@/application/use-cases/history/create-aluno-history"
import { GetAlunoHistoricoUseCase } from "@/application/use-cases/history/get-aluno-historico"
import { UpdateAlunoHistoricoUseCase } from "@/application/use-cases/history/update-aluno-historico"
import { DeleteAlunoHistoricoUseCase } from "@/application/use-cases/history/delete-aluno-historico"
import {
  createHistoricoSchema,
  updateHistoricoSchema,
  getHistoricoByIdSchema,
  getHistoricoByAlunoIdSchema,
  historicoFiltrosSchema,
} from "../validators/aluno-history-validator"
import { AppError } from "@/shared/errors/app-error"
import { UserRole } from "@/domain/entities/user"

const historicoRepository = new PrismaAlunoHistoricoRepository()
const alunoRepository = new PrismaAlunoRepository()
const professorRepository = new PrismaProfessorRepository()

export class AlunoHistoricoController {
  async create(request: FastifyRequest, reply: FastifyReply) {
    try {
      const data = createHistoricoSchema.parse(request.body)
      const { id: userId, role } = request.user!

      const aluno = await alunoRepository.findById(data.alunoId)
      if (!aluno) {
        throw new AppError("Aluno não encontrado", 404)
      }

      await this.checkPermission(aluno, role, userId)

      const useCase = new CreateAlunoHistoricoUseCase(
        historicoRepository,
        alunoRepository
      )

      const historico = await useCase.execute({
        ...data,
        registradoPor: userId,
        dataRegistro: data.dataRegistro
          ? new Date(data.dataRegistro)
          : undefined,
      })

      return reply.status(201).send(historico)
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

  async listByAluno(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { alunoId } = getHistoricoByAlunoIdSchema.parse(request.params)
      const filtros = historicoFiltrosSchema.parse(request.query)
      const { id: userId, role } = request.user!

      const aluno = await alunoRepository.findById(alunoId)
      if (!aluno) {
        throw new AppError("Aluno não encontrado", 404)
      }

      await this.checkPermission(aluno, role, userId)

      const useCase = new GetAlunoHistoricoUseCase(historicoRepository)
      const historico = await useCase.execute(alunoId, {
        dataInicio: filtros.dataInicio
          ? new Date(filtros.dataInicio)
          : undefined,
        dataFim: filtros.dataFim ? new Date(filtros.dataFim) : undefined,
        limite: filtros.limite,
      })

      return reply.send(historico)
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({
          error: "Parâmetros inválidos",
          details: error.issues,
        })
      }
      throw error
    }
  }

  async getLatest(request: FastifyRequest, reply: FastifyReply) {
    try {
      const { alunoId } = getHistoricoByAlunoIdSchema.parse(request.params)
      const { id: userId, role } = request.user!

      const aluno = await alunoRepository.findById(alunoId)
      if (!aluno) {
        throw new AppError("Aluno não encontrado", 404)
      }

      await this.checkPermission(aluno, role, userId)

      const useCase = new GetAlunoHistoricoUseCase(historicoRepository)
      const historico = await useCase.getLatest(alunoId)

      if (!historico) {
        return reply.status(404).send({
          error: "Nenhum histórico encontrado para este aluno",
        })
      }

      return reply.send(historico)
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
      const { id } = getHistoricoByIdSchema.parse(request.params)
      const data = updateHistoricoSchema.parse(request.body)
      const { id: userId, role } = request.user!

      if (Object.keys(data).length === 0) {
        return reply.status(400).send({
          error: "Nenhum campo foi enviado para atualização",
        })
      }

      const historico = await historicoRepository.findById(id)
      if (!historico) {
        throw new AppError("Histórico não encontrado", 404)
      }

      const aluno = await alunoRepository.findById(historico.alunoId)
      if (!aluno) {
        throw new AppError("Aluno não encontrado", 404)
      }

      await this.checkPermission(aluno, role, userId)

      const useCase = new UpdateAlunoHistoricoUseCase(historicoRepository)
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
      const { id } = getHistoricoByIdSchema.parse(request.params)
      const { id: userId, role } = request.user!

      const historico = await historicoRepository.findById(id)
      if (!historico) {
        throw new AppError("Histórico não encontrado", 404)
      }

      const aluno = await alunoRepository.findById(historico.alunoId)
      if (!aluno) {
        throw new AppError("Aluno não encontrado", 404)
      }

      await this.checkPermission(aluno, role, userId)

      const useCase = new DeleteAlunoHistoricoUseCase(historicoRepository)
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
        throw new AppError(
          "Você não tem permissão para acessar este histórico",
          403
        )
      }
    } else if (role === UserRole.PROFESSOR) {
      const professor = await professorRepository.findByUserId(userId)
      if (!professor || aluno.professorId !== professor.id) {
        throw new AppError(
          "Você não tem permissão para acessar este histórico",
          403
        )
      }
    }
  }
}
