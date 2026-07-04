import { ProfessorRepository } from "@/application/repositories/professor-repository"
import { AlunoRepository } from "@/application/repositories/aluno-repository"
import { UserRepository } from "@/application/repositories/user-repository"
import { AppError } from "@/shared/errors/app-error"

export class DeleteProfessorUseCase {
  constructor(
    private professorRepository: ProfessorRepository,
    private alunoRepository: AlunoRepository,
    private userRepository: UserRepository
  ) {}

  async execute(id: string): Promise<void> {
    const professor = await this.professorRepository.findById(id)

    if (!professor) {
      throw new AppError("Professor não encontrado", 404)
    }

    if (professor.isPadrao) {
      throw new AppError(
        "Não é possível deletar o professor padrão do sistema",
        400
      )
    }

    const alunos = await this.alunoRepository.findManyByProfessor(id)

    if (alunos.length > 0) {
      throw new AppError(
        `Não é possível deletar este professor pois ele possui ${alunos.length} aluno(s) vinculado(s)`,
        400
      )
    }

    await this.professorRepository.delete(id)
    await this.userRepository.block(professor.userId)
  }
}
