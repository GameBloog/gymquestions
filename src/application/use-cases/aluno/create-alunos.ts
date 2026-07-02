import { AccountUnitOfWork } from "@/application/repositories/account-unit-of-work"
import { UserRepository } from "@/application/repositories/user-repository"
import { ProfessorRepository } from "@/application/repositories/professor-repository"
import { Aluno } from "@/domain/entities/aluno"
import { AppError } from "@/shared/errors/app-error"
import { UserRole } from "@/domain/entities/user"

interface CreateAlunoInput {
  nome: string
  email: string
  password: string

  professorId: string

  sexoBiologico?: "MASCULINO" | "FEMININO"
  telefone?: string
  alturaCm?: number
  pesoKg?: number
  idade?: number
  cinturaCm?: number
  quadrilCm?: number
  pescocoCm?: number
  alimentos_quer_diario?: string[]
  alimentos_nao_comem?: string[]
  alergias_alimentares?: string[]
  dores_articulares?: string
  suplementos_consumidos?: string[]
  dias_treino_semana?: number
  frequencia_horarios_refeicoes?: string
  objetivos_atuais?: string
  toma_remedio?: boolean
  remedios_uso?: string | null
}

export class CreateAlunoUseCase {
  constructor(
    private userRepository: UserRepository,
    private professorRepository: ProfessorRepository,
    private accountUnitOfWork: AccountUnitOfWork,
  ) {}

  async execute(data: CreateAlunoInput): Promise<Aluno> {
    const userExists = await this.userRepository.findByEmail(data.email)
    if (userExists) {
      throw new AppError("Email já cadastrado", 409)
    }

    const professor = await this.findProfessor(data.professorId)

    const passwordHash = await this.accountUnitOfWork.preparePassword(
      data.password,
    )

    try {
      return await this.accountUnitOfWork.execute(async (context) => {
        const user = await context.userRepository.createPrepared({
          nome: data.nome,
          email: data.email,
          passwordHash,
          role: UserRole.ALUNO,
        })

        return context.alunoRepository.create(
          this.buildAlunoPayload(user.id, professor.id, data),
        )
      })
    } catch (error) {
      this.handleSchemaMismatchError(error)
      throw error
    }
  }

  private buildAlunoPayload(
    userId: string,
    professorId: string,
    data: CreateAlunoInput,
  ) {
    return {
      userId,
      professorId,
      sexoBiologico: data.sexoBiologico,
      telefone: data.telefone,
      alturaCm: data.alturaCm,
      pesoKg: data.pesoKg,
      idade: data.idade,
      cinturaCm: data.cinturaCm,
      quadrilCm: data.quadrilCm,
      pescocoCm: data.pescocoCm,
      alimentos_quer_diario: data.alimentos_quer_diario,
      alimentos_nao_comem: data.alimentos_nao_comem,
      alergias_alimentares: data.alergias_alimentares,
      dores_articulares: data.dores_articulares,
      suplementos_consumidos: data.suplementos_consumidos,
      dias_treino_semana: data.dias_treino_semana,
      frequencia_horarios_refeicoes: data.frequencia_horarios_refeicoes,
      objetivos_atuais: data.objetivos_atuais,
      toma_remedio: data.toma_remedio,
      remedios_uso: data.remedios_uso,
    }
  }

  private handleSchemaMismatchError(error: unknown) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      (error as { code?: string }).code === "P2022"
    ) {
      throw new AppError(
        "Banco desatualizado para os novos campos de aluno. Execute: pnpm db:migrate",
        500,
      )
    }
  }

  private async findProfessor(professorId: string) {
    let professor = await this.professorRepository.findById(professorId)

    if (professor) {
      return professor
    }

    professor = await this.professorRepository.findByUserId(professorId)

    if (professor) {
      return professor
    }

    professor = await this.professorRepository.findPadrao()

    if (professor) {
      return professor
    }

    throw new AppError(
      "Professor padrão não configurado. Execute o seed: pnpm run db:seed",
      500
    )
  }
}
