import { prisma } from "@/infraestructure/database/prisma"
import { AppError } from "@/shared/errors/app-error"
import { UserRole } from "@/domain/entities/user"

interface AuthContext {
  userId: string
  role: UserRole
}

interface TreinoModeloInput {
  nome: string
  observacoes?: string
  dias: Array<{
    titulo: string
    ordem: number
    diaSemana?: number
    observacoes?: string
    metodo?: string
    exercicios: Array<{
      exercicioId: string
      ordem: number
      series?: number
      repeticoes?: string
      cargaSugerida?: number
      observacoes?: string
      metodo?: string
    }>
  }>
}

export class TreinoModeloService {
  async create(auth: AuthContext, input: TreinoModeloInput) {
    const professor = await this.resolveProfessor(auth)
    const exerciseIds = this.collectExerciseIds(input)

    await this.ensureExerciseIdsExist(exerciseIds)

    return prisma.treinoModelo.create({
      data: {
        professorId: professor.id,
        nome: input.nome,
        observacoes: input.observacoes,
        dias: {
          create: input.dias
            .sort((a, b) => a.ordem - b.ordem)
            .map((dia) => ({
              titulo: dia.titulo,
              ordem: dia.ordem,
              diaSemana: dia.diaSemana,
              observacoes: dia.observacoes,
              metodo: dia.metodo,
              exercicios: {
                create: dia.exercicios
                  .sort((a, b) => a.ordem - b.ordem)
                  .map((exercicio) => ({
                    exercicioId: exercicio.exercicioId,
                    ordem: exercicio.ordem,
                    series: exercicio.series,
                    repeticoes: exercicio.repeticoes,
                    cargaSugerida: exercicio.cargaSugerida,
                    observacoes: exercicio.observacoes,
                    metodo: exercicio.metodo,
                  })),
              },
            })),
        },
      },
      include: this.defaultInclude(),
    })
  }

  async list(auth: AuthContext) {
    const professor = await this.resolveProfessor(auth)

    return prisma.treinoModelo.findMany({
      where: {
        professorId: professor.id,
      },
      orderBy: {
        updatedAt: "desc",
      },
      include: this.defaultInclude(),
    })
  }

  async getById(auth: AuthContext, modeloId: string) {
    const professor = await this.resolveProfessor(auth)

    const modelo = await prisma.treinoModelo.findFirst({
      where: {
        id: modeloId,
        professorId: professor.id,
      },
      include: this.defaultInclude(),
    })

    if (!modelo) {
      throw new AppError("Molde de treino não encontrado", 404)
    }

    return modelo
  }

  private collectExerciseIds(input: TreinoModeloInput) {
    return input.dias
      .flatMap((dia) => dia.exercicios.map((item) => item.exercicioId))
      .filter((id, index, list) => list.indexOf(id) === index)
  }

  private async ensureExerciseIdsExist(exerciseIds: string[]) {
    const exercicios = await prisma.exercicio.findMany({
      where: {
        id: {
          in: exerciseIds,
        },
      },
    })

    if (exercicios.length !== exerciseIds.length) {
      throw new AppError("Um ou mais exercícios não foram encontrados", 404)
    }
  }

  private async resolveProfessor(auth: AuthContext) {
    if (auth.role !== UserRole.PROFESSOR) {
      throw new AppError("Somente professores podem gerenciar moldes de treino", 403)
    }

    const professor = await prisma.professor.findUnique({
      where: { userId: auth.userId },
    })

    if (!professor) {
      throw new AppError("Professor não encontrado", 404)
    }

    return professor
  }

  private defaultInclude() {
    return {
      dias: {
        orderBy: { ordem: "asc" as const },
        include: {
          exercicios: {
            orderBy: { ordem: "asc" as const },
            include: {
              exercicio: true,
            },
          },
        },
      },
    }
  }
}
