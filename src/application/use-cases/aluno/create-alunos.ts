import { AlunoRepository } from "@/application/repositories/aluno-repository"
import { UserRepository } from "@/application/repositories/user-repository"
import { ProfessorRepository } from "@/application/repositories/professor-repository"
import { Aluno } from "@/domain/entities/aluno"
import { AppError } from "@/shared/errors/app-error"
import { UserRole } from "@/domain/entities/user"
import { PROFESSOR_PADRAO, ERROR_MESSAGES } from "@/shared/constants"

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
      throw new AppError(ERROR_MESSAGES.EMAIL_JA_CADASTRADO, 409)
    }

    const professor = await this.findProfessor(data.professorId)

    const user = await this.userRepository.create({
      nome: data.nome,
      email: data.email,
      password: data.password,
      role: UserRole.ALUNO,
    })

    const aluno = await this.alunoRepository.create({
      userId: user.id,
      professorId: professor.id,
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


  private async findProfessor(professorId: string) {
    let professor = await this.professorRepository.findById(professorId)

    if (professor) {
      console.log(`✓ Professor encontrado por ID: ${professor.id}`)
      return professor
    }

    console.log(`⚠ Professor não encontrado por ID: ${professorId}`)
    console.log(`→ Tentando buscar por userId...`)

    professor = await this.professorRepository.findByUserId(professorId)

    if (professor) {
      console.log(`✓ Professor encontrado por userId: ${professor.id}`)
      return professor
    }

    console.log(`⚠ Professor não encontrado por userId`)
    console.log(`→ Buscando professor padrão (${PROFESSOR_PADRAO.EMAIL})...`)

    const professorPadraoUser = await this.userRepository.findByEmail(
      PROFESSOR_PADRAO.EMAIL
    )

    if (professorPadraoUser) {
      professor = await this.professorRepository.findByUserId(
        professorPadraoUser.id
      )

      if (professor) {
        console.log(`✓ Usando professor padrão: ${professor.id}`)
        return professor
      }
    }

    throw new AppError(ERROR_MESSAGES.PROFESSOR_PADRAO_NAO_ENCONTRADO, 404)
  }
}
