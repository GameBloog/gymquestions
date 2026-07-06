import { AccountUnitOfWork } from "@/application/repositories/account-unit-of-work"
import { AppError } from "@/shared/errors/app-error"

export class DeleteProfessorUseCase {
  constructor(private accountUnitOfWork: AccountUnitOfWork) {}

  async execute(id: string): Promise<void> {
    await this.accountUnitOfWork.execute(async (context) => {
      const professor = await context.professorRepository.findById(id)

      if (!professor) {
        throw new AppError("Professor não encontrado", 404)
      }

      if (professor.isPadrao) {
        throw new AppError(
          "Não é possível deletar o professor padrão do sistema",
          400
        )
      }

      const alunos = await context.alunoRepository.findManyByProfessor(id)

      if (alunos.length > 0) {
        throw new AppError(
          `Não é possível deletar este professor pois ele possui ${alunos.length} aluno(s) vinculado(s)`,
          400
        )
      }

      await context.professorRepository.delete(id)
      await context.userRepository.block(professor.userId)
    })
  }
}
