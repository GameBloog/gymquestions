import { FastifyInstance } from "fastify"
import { AlunoHistoricoController } from "../controllers/aluno-history-contoller"
import { authMiddleware } from "../middlewares/auth.middleware"
import { requireRole } from "../middlewares/role.middleware"
import { UserRole } from "@/domain/entities/user"

const controller = new AlunoHistoricoController()

export async function alunoHistoricoRoutes(app: FastifyInstance) {
  // Todas as rotas requerem autenticação
  app.addHook("preHandler", authMiddleware)

  // Criar novo registro de histórico
  app.post(
    "/alunos/:alunoId/historico",
    { preHandler: [requireRole(UserRole.ADMIN, UserRole.PROFESSOR)] },
    controller.create.bind(controller)
  )

  // Listar histórico de um aluno (com filtros opcionais)
  app.get("/alunos/:alunoId/historico", controller.listByAluno.bind(controller))

  // Buscar último registro de histórico de um aluno
  app.get(
    "/alunos/:alunoId/historico/latest",
    controller.getLatest.bind(controller)
  )

  // Atualizar um registro de histórico
  app.put(
    "/historico/:id",
    { preHandler: [requireRole(UserRole.ADMIN, UserRole.PROFESSOR)] },
    controller.update.bind(controller)
  )

  // Deletar um registro de histórico
  app.delete(
    "/historico/:id",
    { preHandler: [requireRole(UserRole.ADMIN, UserRole.PROFESSOR)] },
    controller.delete.bind(controller)
  )
}
