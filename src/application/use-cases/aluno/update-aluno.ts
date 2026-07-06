import { AlunoRepository } from "@/application/repositories/aluno-repository"
import { AccountUnitOfWork } from "@/application/repositories/account-unit-of-work"
import { TransactionalUserRepository } from "@/application/repositories/user-repository"
import { Aluno, UpdateAlunoInput } from "@/domain/entities/aluno"
import { UpdateUserInput } from "@/domain/entities/user"
import { AppError } from "@/shared/errors/app-error"

interface UpdateAlunoUseCaseInput extends UpdateAlunoInput {
  nome?: string
  email?: string
  password?: string
}

export class UpdateAlunoUseCase {
  constructor(
    private alunoRepository: AlunoRepository,
    private accountUnitOfWork: AccountUnitOfWork,
  ) {}

  async execute(id: string, data: UpdateAlunoUseCaseInput): Promise<Aluno> {
    const exists = await this.alunoRepository.findById(id)

    if (!exists) {
      throw new AppError("Aluno não encontrado", 404)
    }

    const passwordHash = data.password !== undefined
      ? await this.accountUnitOfWork.preparePassword(data.password)
      : undefined

    return this.accountUnitOfWork.execute(async (context) => {
      await this.updateLinkedUserIfNeeded(
        exists.userId,
        data,
        context.userRepository,
        passwordHash,
      )

      const alunoData = this.extractAlunoData(data)

      if (Object.keys(alunoData).length === 0) {
        return (await context.alunoRepository.findById(id)) ?? exists
      }

      return context.alunoRepository.update(id, alunoData)
    })
  }

  private async updateLinkedUserIfNeeded(
    userId: string,
    data: UpdateAlunoUseCaseInput,
    userRepository: TransactionalUserRepository,
    passwordHash?: string,
  ) {
    const userData = this.extractUserData(data)

    if (Object.keys(userData).length === 0 && !passwordHash) {
      return
    }

    const currentUser = await userRepository.findById(userId)

    if (!currentUser) {
      throw new AppError("Usuário não encontrado", 404)
    }

    if (userData.email && userData.email !== currentUser.email) {
      const existingUser = await userRepository.findByEmail(userData.email)

      if (existingUser && existingUser.id !== currentUser.id) {
        throw new AppError("Email já cadastrado", 409)
      }
    }

    await userRepository.updatePrepared(userId, {
      ...userData,
      ...(passwordHash !== undefined && { passwordHash }),
    })
  }

  private extractAlunoData(data: UpdateAlunoUseCaseInput): UpdateAlunoInput {
    return {
      ...(data.ativo !== undefined && { ativo: data.ativo }),
      ...(data.sexoBiologico !== undefined && {
        sexoBiologico: data.sexoBiologico,
      }),
      ...(data.telefone !== undefined && { telefone: data.telefone }),
      ...(data.alturaCm !== undefined && { alturaCm: data.alturaCm }),
      ...(data.pesoKg !== undefined && { pesoKg: data.pesoKg }),
      ...(data.idade !== undefined && { idade: data.idade }),
      ...(data.cinturaCm !== undefined && { cinturaCm: data.cinturaCm }),
      ...(data.quadrilCm !== undefined && { quadrilCm: data.quadrilCm }),
      ...(data.pescocoCm !== undefined && { pescocoCm: data.pescocoCm }),
      ...(data.alimentos_quer_diario !== undefined && {
        alimentos_quer_diario: data.alimentos_quer_diario,
      }),
      ...(data.alimentos_nao_comem !== undefined && {
        alimentos_nao_comem: data.alimentos_nao_comem,
      }),
      ...(data.alergias_alimentares !== undefined && {
        alergias_alimentares: data.alergias_alimentares,
      }),
      ...(data.dores_articulares !== undefined && {
        dores_articulares: data.dores_articulares,
      }),
      ...(data.suplementos_consumidos !== undefined && {
        suplementos_consumidos: data.suplementos_consumidos,
      }),
      ...(data.dias_treino_semana !== undefined && {
        dias_treino_semana: data.dias_treino_semana,
      }),
      ...(data.frequencia_horarios_refeicoes !== undefined && {
        frequencia_horarios_refeicoes: data.frequencia_horarios_refeicoes,
      }),
      ...(data.objetivos_atuais !== undefined && {
        objetivos_atuais: data.objetivos_atuais,
      }),
      ...(data.toma_remedio !== undefined && {
        toma_remedio: data.toma_remedio,
      }),
      ...(data.remedios_uso !== undefined && {
        remedios_uso: data.remedios_uso,
      }),
    }
  }

  private extractUserData(data: UpdateAlunoUseCaseInput): Omit<UpdateUserInput, "password"> {
    return {
      ...(data.nome !== undefined && { nome: data.nome }),
      ...(data.email !== undefined && { email: data.email }),
    }
  }
}
