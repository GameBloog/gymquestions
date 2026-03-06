import { CheckinStatus, type ObjetivoDieta, SexoBiologico } from "@prisma/client"
import { prisma } from "@/infraestructure/database/prisma"
import { AppError } from "@/shared/errors/app-error"
import { UserRole } from "@/domain/entities/user"
import {
  calculateBmr,
  calculateFoodMacrosByQuantity,
  calculateLeanMassKg,
  calculateMacroTargets,
  calculateNavyBodyFat,
  calculateTargetCalories,
  resolveActivityFactor,
} from "./nutrition-calculator"

interface AuthContext {
  userId: string
  role: UserRole
}

interface PlanoDietaItemInput {
  alimentoId: string
  ordem: number
  quantidadeGramas: number
  observacoes?: string
}

interface PlanoDietaRefeicaoInput {
  nome: string
  ordem: number
  horario?: string
  observacoes?: string
  itens: PlanoDietaItemInput[]
}

interface PlanoDietaDiaInput {
  titulo: string
  ordem: number
  diaSemana?: number
  observacoes?: string
  refeicoes: PlanoDietaRefeicaoInput[]
}

interface UpsertPlanoDietaInput {
  alunoId: string
  nome: string
  objetivo: ObjetivoDieta
  fatorAtividade?: number
  caloriasMeta?: number
  proteinasMetaG?: number
  carboidratosMetaG?: number
  gordurasMetaG?: number
  observacoes?: string
  dias: PlanoDietaDiaInput[]
}

interface StartDietaCheckinInput {
  dietaDiaId: string
}

interface UpdateRefeicaoCheckinInput {
  checkinId: string
  dietaRefeicaoId: string
  concluida?: boolean
  observacaoAluno?: string
}

interface FinalizeDietaCheckinInput {
  checkinId: string
  observacaoDia?: string
}

interface ComentarioProfessorInput {
  checkinId: string
  comentarioProfessor: string
}

export class PlanoDietaService {
  async upsertPlanoDieta(auth: AuthContext, input: UpsertPlanoDietaInput) {
    if (auth.role === UserRole.ALUNO) {
      throw new AppError("Alunos não podem editar planos de dieta", 403)
    }

    const aluno = await this.ensureAlunoAccess(auth, input.alunoId)
    const professorId = await this.resolveProfessorIdForPlan(auth, aluno.professorId)

    const allFoodIds = input.dias
      .flatMap((dia) => dia.refeicoes.flatMap((ref) => ref.itens.map((item) => item.alimentoId)))
      .filter((id, index, list) => list.indexOf(id) === index)

    await this.validateFoodAccess(auth, professorId, allFoodIds)

    const recomendacao = await this.getRecommendationByAluno(
      auth,
      input.alunoId,
      input.objetivo,
      input.fatorAtividade,
    )

    const foodMap = await this.loadFoodMap(allFoodIds)

    return prisma.$transaction(async (tx) => {
      await tx.planoDieta.updateMany({
        where: {
          alunoId: input.alunoId,
          ativo: true,
        },
        data: {
          ativo: false,
        },
      })

      const plano = await tx.planoDieta.create({
        data: {
          alunoId: input.alunoId,
          professorId,
          nome: input.nome,
          objetivo: input.objetivo,
          percentualGordura: recomendacao.percentualGordura ?? null,
          massaMagraKg: recomendacao.massaMagraKg ?? null,
          tmbKcal: recomendacao.tmbKcal ?? null,
          fatorAtividade: recomendacao.fatorAtividade ?? null,
          caloriasMeta: input.caloriasMeta ?? recomendacao.caloriasMeta ?? 0,
          proteinasMetaG:
            input.proteinasMetaG ?? recomendacao.proteinasMetaG ?? 0,
          carboidratosMetaG:
            input.carboidratosMetaG ?? recomendacao.carboidratosMetaG ?? 0,
          gordurasMetaG: input.gordurasMetaG ?? recomendacao.gordurasMetaG ?? 0,
          observacoes: input.observacoes,
          ativo: true,
          dias: {
            create: input.dias
              .sort((a, b) => a.ordem - b.ordem)
              .map((dia) => ({
                titulo: dia.titulo,
                ordem: dia.ordem,
                diaSemana: dia.diaSemana,
                observacoes: dia.observacoes,
                refeicoes: {
                  create: dia.refeicoes
                    .sort((a, b) => a.ordem - b.ordem)
                    .map((refeicao) => ({
                      nome: refeicao.nome,
                      ordem: refeicao.ordem,
                      horario: refeicao.horario,
                      observacoes: refeicao.observacoes,
                      itens: {
                        create: refeicao.itens
                          .sort((a, b) => a.ordem - b.ordem)
                          .map((item) => {
                            const alimento = foodMap.get(item.alimentoId)
                            if (!alimento) {
                              throw new AppError("Alimento não encontrado", 404)
                            }

                            const macros = calculateFoodMacrosByQuantity(
                              item.quantidadeGramas,
                              {
                                calorias100g: alimento.calorias100g,
                                proteinas100g: alimento.proteinas100g,
                                carboidratos100g: alimento.carboidratos100g,
                                gorduras100g: alimento.gorduras100g,
                                fibras100g: alimento.fibras100g,
                              },
                            )

                            return {
                              alimentoId: item.alimentoId,
                              ordem: item.ordem,
                              quantidadeGramas: item.quantidadeGramas,
                              calorias: macros.calorias,
                              proteinas: macros.proteinas,
                              carboidratos: macros.carboidratos,
                              gorduras: macros.gorduras,
                              fibras: macros.fibras,
                              observacoes: item.observacoes,
                            }
                          }),
                      },
                    })),
                },
              })),
          },
        },
        include: this.defaultPlanoInclude(),
      })

      return plano
    })
  }

  async getPlanoAtivoByAluno(alunoId: string, auth: AuthContext) {
    await this.ensureAlunoAccess(auth, alunoId)

    return prisma.planoDieta.findFirst({
      where: {
        alunoId,
        ativo: true,
      },
      orderBy: {
        updatedAt: "desc",
      },
      include: this.defaultPlanoInclude(),
    })
  }

  async getRecommendationByAluno(
    auth: AuthContext,
    alunoId: string,
    objetivo: ObjetivoDieta,
    fatorAtividadeOverride?: number,
  ) {
    const aluno = await this.ensureAlunoAccess(auth, alunoId)

    const latest = await prisma.alunoHistorico.findFirst({
      where: { alunoId },
      orderBy: { dataRegistro: "desc" },
    })

    const pesoKg = latest?.pesoKg ?? aluno.pesoKg ?? null
    const alturaCm = latest?.alturaCm ?? aluno.alturaCm ?? null
    const idade = aluno.idade ?? null
    const cinturaCm = latest?.cinturaCm ?? aluno.cinturaCm ?? null
    const quadrilCm = latest?.quadrilCm ?? aluno.quadrilCm ?? null
    const pescocoCm = latest?.pescocoCm ?? aluno.pescocoCm ?? null
    const sexoBiologico = aluno.sexoBiologico ?? null

    const missingFields: string[] = []
    if (!sexoBiologico) missingFields.push("sexoBiologico")
    if (!pesoKg) missingFields.push("pesoKg")
    if (!alturaCm) missingFields.push("alturaCm")
    if (!idade) missingFields.push("idade")
    if (!cinturaCm) missingFields.push("cinturaCm")
    if (!pescocoCm) missingFields.push("pescocoCm")
    if (sexoBiologico === SexoBiologico.FEMININO && !quadrilCm) {
      missingFields.push("quadrilCm")
    }

    const percentualFromNavy =
      sexoBiologico && alturaCm && cinturaCm && pescocoCm
        ? calculateNavyBodyFat({
            sexoBiologico,
            alturaCm,
            cinturaCm,
            pescocoCm,
            quadrilCm,
          })
        : null

    const percentualGordura = percentualFromNavy ?? latest?.percentualGordura ?? null
    const massaMagraKg = calculateLeanMassKg(pesoKg, percentualGordura)
    const tmbKcal =
      sexoBiologico && pesoKg && alturaCm && idade
        ? calculateBmr({
            sexoBiologico,
            pesoKg,
            alturaCm,
            idade,
          })
        : null

    const fatorAtividade =
      fatorAtividadeOverride ?? resolveActivityFactor(aluno.dias_treino_semana)
    const caloriasManutencao =
      tmbKcal !== null ? tmbKcal * fatorAtividade : null
    const caloriasMeta =
      caloriasManutencao !== null
        ? calculateTargetCalories(objetivo, caloriasManutencao)
        : null

    const macros =
      pesoKg && caloriasMeta
        ? calculateMacroTargets({
            objetivo,
            pesoKg,
            caloriasMeta,
          })
        : {
            proteinasG: 0,
            carboidratosG: 0,
            gordurasG: 0,
          }

    return {
      alunoId,
      objetivo,
      origemHistoricoId: latest?.id ?? null,
      percentualGordura,
      massaMagraKg,
      tmbKcal,
      fatorAtividade,
      caloriasManutencao,
      caloriasMeta,
      proteinasMetaG: macros.proteinasG,
      carboidratosMetaG: macros.carboidratosG,
      gordurasMetaG: macros.gordurasG,
      missingFields,
      dadosBase: {
        pesoKg,
        alturaCm,
        idade,
        cinturaCm,
        quadrilCm,
        pescocoCm,
        sexoBiologico,
      },
    }
  }

  async startCheckin(auth: AuthContext, input: StartDietaCheckinInput) {
    if (auth.role !== UserRole.ALUNO) {
      throw new AppError("Somente alunos podem iniciar check-in da dieta", 403)
    }

    const aluno = await prisma.aluno.findUnique({
      where: { userId: auth.userId },
    })
    if (!aluno) {
      throw new AppError("Aluno não encontrado", 404)
    }

    const dietaDia = await prisma.dietaDia.findUnique({
      where: { id: input.dietaDiaId },
      include: {
        planoDieta: true,
        refeicoes: { orderBy: { ordem: "asc" } },
      },
    })

    if (!dietaDia || !dietaDia.planoDieta.ativo) {
      throw new AppError("Dia de dieta não encontrado", 404)
    }

    if (dietaDia.planoDieta.alunoId !== aluno.id) {
      throw new AppError("Você não tem permissão para iniciar este dia", 403)
    }

    const dayStart = this.getStartOfDay(new Date())
    const dayEnd = this.getEndOfDay(new Date())

    const existing = await prisma.dietaCheckin.findFirst({
      where: {
        alunoId: aluno.id,
        dietaDiaId: dietaDia.id,
        dataDieta: {
          gte: dayStart,
          lte: dayEnd,
        },
      },
      include: this.defaultCheckinInclude(),
      orderBy: { createdAt: "desc" },
    })

    if (existing) {
      return existing
    }

    return prisma.dietaCheckin.create({
      data: {
        alunoId: aluno.id,
        professorId: dietaDia.planoDieta.professorId,
        planoDietaId: dietaDia.planoDieta.id,
        dietaDiaId: dietaDia.id,
        status: CheckinStatus.INICIADO,
        dataDieta: new Date(),
        refeicoes: {
          create: dietaDia.refeicoes.map((ref) => ({
            dietaRefeicaoId: ref.id,
          })),
        },
      },
      include: this.defaultCheckinInclude(),
    })
  }

  async updateRefeicaoCheckin(auth: AuthContext, input: UpdateRefeicaoCheckinInput) {
    if (auth.role !== UserRole.ALUNO) {
      throw new AppError("Somente alunos podem atualizar a dieta", 403)
    }

    const checkin = await prisma.dietaCheckin.findUnique({
      where: { id: input.checkinId },
      include: { aluno: true },
    })

    if (!checkin) {
      throw new AppError("Check-in de dieta não encontrado", 404)
    }

    if (checkin.aluno.userId !== auth.userId) {
      throw new AppError("Você não pode atualizar este check-in", 403)
    }

    if (checkin.status === CheckinStatus.CONCLUIDO) {
      throw new AppError("Este dia de dieta já foi finalizado", 400)
    }

    const refeicaoCheckin = await prisma.dietaRefeicaoCheckin.findUnique({
      where: {
        checkinId_dietaRefeicaoId: {
          checkinId: input.checkinId,
          dietaRefeicaoId: input.dietaRefeicaoId,
        },
      },
    })

    if (!refeicaoCheckin) {
      throw new AppError("Refeição do check-in não encontrada", 404)
    }

    return prisma.dietaRefeicaoCheckin.update({
      where: { id: refeicaoCheckin.id },
      data: {
        ...(input.concluida !== undefined && { concluida: input.concluida }),
        ...(input.observacaoAluno !== undefined && {
          observacaoAluno: input.observacaoAluno,
        }),
      },
      include: {
        dietaRefeicao: true,
      },
    })
  }

  async finalizeCheckin(auth: AuthContext, input: FinalizeDietaCheckinInput) {
    if (auth.role !== UserRole.ALUNO) {
      throw new AppError("Somente alunos podem finalizar a dieta", 403)
    }

    const checkin = await prisma.dietaCheckin.findUnique({
      where: { id: input.checkinId },
      include: { aluno: true },
    })

    if (!checkin) {
      throw new AppError("Check-in de dieta não encontrado", 404)
    }

    if (checkin.aluno.userId !== auth.userId) {
      throw new AppError("Você não pode finalizar este check-in", 403)
    }

    if (checkin.status === CheckinStatus.CONCLUIDO) {
      return checkin
    }

    return prisma.dietaCheckin.update({
      where: { id: checkin.id },
      data: {
        status: CheckinStatus.CONCLUIDO,
        finalizadoEm: new Date(),
        ...(input.observacaoDia !== undefined && {
          observacaoDia: input.observacaoDia,
        }),
      },
      include: this.defaultCheckinInclude(),
    })
  }

  async listCheckinsByAluno(auth: AuthContext, alunoId: string, limit = 40) {
    await this.ensureAlunoAccess(auth, alunoId)

    return prisma.dietaCheckin.findMany({
      where: { alunoId },
      orderBy: { iniciadoEm: "desc" },
      take: limit,
      include: this.defaultCheckinInclude(),
    })
  }

  async comentarCheckinComoProfessor(
    auth: AuthContext,
    input: ComentarioProfessorInput,
  ) {
    if (auth.role === UserRole.ALUNO) {
      throw new AppError("Alunos não podem comentar check-ins como professor", 403)
    }

    const checkin = await prisma.dietaCheckin.findUnique({
      where: { id: input.checkinId },
      include: { aluno: true },
    })

    if (!checkin) {
      throw new AppError("Check-in de dieta não encontrado", 404)
    }

    if (auth.role === UserRole.PROFESSOR) {
      const professor = await prisma.professor.findUnique({
        where: { userId: auth.userId },
      })

      if (!professor || professor.id !== checkin.professorId) {
        throw new AppError("Você não pode comentar este check-in", 403)
      }
    }

    return prisma.dietaCheckin.update({
      where: { id: checkin.id },
      data: {
        comentarioProfessor: input.comentarioProfessor,
      },
      include: this.defaultCheckinInclude(),
    })
  }

  private defaultPlanoInclude() {
    return {
      dias: {
        orderBy: { ordem: "asc" as const },
        include: {
          refeicoes: {
            orderBy: { ordem: "asc" as const },
            include: {
              itens: {
                orderBy: { ordem: "asc" as const },
                include: {
                  alimento: true,
                },
              },
            },
          },
        },
      },
    }
  }

  private defaultCheckinInclude() {
    return {
      dietaDia: true,
      refeicoes: {
        include: {
          dietaRefeicao: {
            include: {
              itens: {
                include: {
                  alimento: true,
                },
                orderBy: { ordem: "asc" as const },
              },
            },
          },
        },
        orderBy: {
          updatedAt: "desc" as const,
        },
      },
    }
  }

  private async loadFoodMap(foodIds: string[]) {
    const foods = await prisma.alimento.findMany({
      where: {
        id: { in: foodIds },
      },
    })

    if (foods.length !== foodIds.length) {
      throw new AppError("Um ou mais alimentos não foram encontrados", 404)
    }

    return new Map(foods.map((food) => [food.id, food]))
  }

  private async ensureAlunoAccess(auth: AuthContext, alunoId: string) {
    const aluno = await prisma.aluno.findUnique({
      where: { id: alunoId },
      include: {
        professor: true,
      },
    })

    if (!aluno) {
      throw new AppError("Aluno não encontrado", 404)
    }

    if (auth.role === UserRole.ALUNO && aluno.userId !== auth.userId) {
      throw new AppError("Você não tem permissão para acessar este aluno", 403)
    }

    if (auth.role === UserRole.PROFESSOR) {
      const professor = await prisma.professor.findUnique({
        where: { userId: auth.userId },
      })

      if (!professor || professor.id !== aluno.professorId) {
        throw new AppError("Você não tem permissão para acessar este aluno", 403)
      }
    }

    return aluno
  }

  private async resolveProfessorIdForPlan(auth: AuthContext, alunoProfessorId: string) {
    if (auth.role === UserRole.PROFESSOR) {
      const professor = await prisma.professor.findUnique({
        where: { userId: auth.userId },
      })

      if (!professor) {
        throw new AppError("Professor não encontrado", 404)
      }

      return professor.id
    }

    return alunoProfessorId
  }

  private async validateFoodAccess(
    auth: AuthContext,
    professorId: string,
    foodIds: string[],
  ) {
    const foods = await prisma.alimento.findMany({
      where: {
        id: {
          in: foodIds,
        },
      },
    })

    if (foods.length !== foodIds.length) {
      throw new AppError("Um ou mais alimentos não foram encontrados", 404)
    }

    if (auth.role !== UserRole.PROFESSOR) {
      return
    }

    for (const food of foods) {
      if (food.professorId && food.professorId !== professorId) {
        throw new AppError(
          "Você não pode usar alimentos personalizados de outro professor",
          403,
        )
      }
    }
  }

  private getStartOfDay(date: Date) {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0)
  }

  private getEndOfDay(date: Date) {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999)
  }
}
