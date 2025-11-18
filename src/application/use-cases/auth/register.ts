import { UserRepository } from "@/application/repositories/user-repository"
import { InviteCodeRepository } from "@/application/repositories/invite-code-repository"
import { ProfessorRepository } from "@/application/repositories/professor-repository"
import { CreateUserInput, User, UserRole } from "@/domain/entities/user"
import { AppError } from "@/shared/errors/app-error"
import { ValidateInviteCodeUseCase } from "../invite-code/validate-invite-code"

interface RegisterInput extends CreateUserInput {
  inviteCode?: string
  telefone?: string
  especialidade?: string
}

export class RegisterUseCase {
  constructor(
    private userRepository: UserRepository,
    private inviteCodeRepository: InviteCodeRepository,
    private professorRepository: ProfessorRepository
  ) {}

  async execute(data: RegisterInput): Promise<Omit<User, "password">> {
    const userExists = await this.userRepository.findByEmail(data.email)

    if (userExists) {
      throw new AppError("Email já cadastrado", 409)
    }

    if (
      data.role &&
      (data.role === UserRole.PROFESSOR || data.role === UserRole.ADMIN)
    ) {
      if (!data.inviteCode) {
        throw new AppError(
          "Código de convite é obrigatório para professores e admins",
          400
        )
      }

      const validateInviteCode = new ValidateInviteCodeUseCase(
        this.inviteCodeRepository
      )
      await validateInviteCode.execute(data.inviteCode, data.role)
    }

    const user = await this.userRepository.create({
      nome: data.nome,
      email: data.email,
      password: data.password,
      role: data.role || UserRole.ALUNO,
    })

    if (user.role === UserRole.PROFESSOR) {
      await this.professorRepository.create({
        userId: user.id,
        telefone: data.telefone,
        especialidade: data.especialidade,
      })
    }

    if (data.inviteCode) {
      await this.inviteCodeRepository.markAsUsed(data.inviteCode, user.id)
    }

    const { password, ...userWithoutPassword } = user

    return userWithoutPassword
  }
}
