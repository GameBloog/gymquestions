import { ProfessorRepository } from "@/application/repositories/professor-repository"
import { UserRepository } from "@/application/repositories/user-repository"
import { Professor } from "@/domain/entities/professor"
import { AppError } from "@/shared/errors/app-error"
import { UserRole } from "@/domain/entities/user"

interface CreateProfessorInput {
  nome: string
  email: string
  password: string
  telefone?: string
  especialidade?: string
}

export class CreateProfessorUseCase {
  constructor(
    private professorRepository: ProfessorRepository,
    private userRepository: UserRepository
  ) {}

  async execute(data: CreateProfessorInput): Promise<Professor> {
    const userExists = await this.userRepository.findByEmail(data.email)
    if (userExists) {
      throw new AppError("Email já cadastrado", 409)
    }

    const user = await this.userRepository.create({
      nome: data.nome,
      email: data.email,
      password: data.password,
      role: UserRole.PROFESSOR,
    })

    const professor = await this.professorRepository.create({
      userId: user.id,
      telefone: data.telefone,
      especialidade: data.especialidade,
    })

    return professor
  }
}

