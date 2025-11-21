import { AlunoRepository } from "@/application/repositories/aluno-repository"
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
}

export class CreateAlunoUseCase {
  constructor(
    private alunoRepository: AlunoRepository,
    private userRepository: UserRepository,
    private professorRepository: ProfessorRepository
  ) {}

  async execute(data: CreateAlunoInput): Promise<Aluno> {
    const userExists = await this.userRepository.findByEmail(data.email)
    if (userExists) {
      throw new AppError("Email já cadastrado", 409)
    }

    const professorExists = await this.professorRepository.findById(
      data.professorId
    )
    if (!professorExists) {
      throw new AppError("Professor não encontrado", 404)
    }

    const user = await this.userRepository.create({
      nome: data.nome,
      email: data.email,
      password: data.password,
      role: UserRole.ALUNO,
    })

    const aluno = await this.alunoRepository.create({
      userId: user.id,
      professorId: data.professorId,
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
    })

    return aluno
  }
}
