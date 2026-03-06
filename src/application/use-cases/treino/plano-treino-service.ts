import { CheckinStatus, type Prisma } from "@prisma/client"
import { UserRole } from "@/domain/entities/user"
import { prisma } from "@/infraestructure/database/prisma"
import { AppError } from "@/shared/errors/app-error"

interface AuthContext {
  userId: string
  role: UserRole
}

interface UpsertPlanoTreinoInput {
  alunoId: string
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

interface StartCheckinInput {
  treinoDiaId: string
}

interface UpdateExercicioCheckinInput {
  checkinId: string
  treinoDiaExercicioId: string
  concluido?: boolean
  cargaReal?: number
  repeticoesReal?: string
  comentarioAluno?: string
}

interface FinalizeCheckinInput {
  checkinId: string
  comentarioAluno?: string
}

interface ComentarioProfessorInput {
  checkinId: string
  comentarioProfessor: string
}

export class PlanoTreinoService {
  async upsertPlanoTreino(auth: AuthContext, input: UpsertPlanoTreinoInput) {
    if (auth.role === UserRole.ALUNO) {
      throw new AppError("Alunos não podem editar planos de treino", 403)
    }

    const aluno = await this.ensureAlunoAccess(auth, input.alunoId)
    const professorId = await this.resolveProfessorIdForPlan(auth, aluno.professorId)

    const allExerciseIds = input.dias
      .flatMap((dia) => dia.exercicios.map((item) => item.exercicioId))
      .filter((id, index, list) => list.indexOf(id) === index)

    await this.validateExerciseAccess(auth, professorId, allExerciseIds)

    return prisma.$transaction(async (tx) => {
      await tx.planoTreino.updateMany({
        where: {
          alunoId: input.alunoId,
          ativo: true,
        },
        data: {
          ativo: false,
        },
      })

      const plano = await tx.planoTreino.create({
        data: {
          alunoId: input.alunoId,
          professorId,
          nome: input.nome,
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
        include: {
          dias: {
            orderBy: { ordem: "asc" },
            include: {
              exercicios: {
                orderBy: { ordem: "asc" },
                include: {
                  exercicio: true,
                },
              },
            },
          },
        },
      })

      return plano
    })
  }

  async getPlanoAtivoByAluno(alunoId: string, auth: AuthContext) {
    await this.ensureAlunoAccess(auth, alunoId)

    return prisma.planoTreino.findFirst({
      where: {
        alunoId,
        ativo: true,
      },
      orderBy: {
        updatedAt: "desc",
      },
      include: {
        dias: {
          orderBy: { ordem: "asc" },
          include: {
            exercicios: {
              orderBy: { ordem: "asc" },
              include: {
                exercicio: true,
              },
            },
          },
        },
      },
    })
  }

  async startCheckin(auth: AuthContext, input: StartCheckinInput) {
    if (auth.role !== UserRole.ALUNO) {
      throw new AppError("Somente alunos podem iniciar treino", 403)
    }

    const aluno = await prisma.aluno.findUnique({
      where: { userId: auth.userId },
    })

    if (!aluno) {
      throw new AppError("Aluno não encontrado", 404)
    }

    const treinoDia = await prisma.treinoDia.findUnique({
      where: { id: input.treinoDiaId },
      include: {
        planoTreino: true,
        exercicios: {
          orderBy: { ordem: "asc" },
        },
      },
    })

    if (!treinoDia || !treinoDia.planoTreino.ativo) {
      throw new AppError("Dia de treino não encontrado", 404)
    }

    if (treinoDia.planoTreino.alunoId !== aluno.id) {
      throw new AppError("Você não tem permissão para iniciar este treino", 403)
    }

    const dayStart = this.getStartOfDay(new Date())
    const dayEnd = this.getEndOfDay(new Date())

    const existing = await prisma.treinoCheckin.findFirst({
      where: {
        alunoId: aluno.id,
        treinoDiaId: treinoDia.id,
        dataTreino: {
          gte: dayStart,
          lte: dayEnd,
        },
      },
      include: {
        treinoDia: true,
        exercicios: {
          include: {
            exercicio: true,
            treinoDiaExercicio: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    })

    if (existing) {
      return existing
    }

    const checkin = await prisma.treinoCheckin.create({
      data: {
        alunoId: aluno.id,
        professorId: treinoDia.planoTreino.professorId,
        planoTreinoId: treinoDia.planoTreino.id,
        treinoDiaId: treinoDia.id,
        status: CheckinStatus.INICIADO,
        dataTreino: new Date(),
        exercicios: {
          create: treinoDia.exercicios.map((item) => ({
            treinoDiaExercicioId: item.id,
            exercicioId: item.exercicioId,
          })),
        },
      },
      include: {
        treinoDia: true,
        exercicios: {
          include: {
            exercicio: true,
            treinoDiaExercicio: true,
          },
        },
      },
    })

    return checkin
  }

  async updateExercicioCheckin(auth: AuthContext, input: UpdateExercicioCheckinInput) {
    if (auth.role !== UserRole.ALUNO) {
      throw new AppError("Somente alunos podem atualizar execução", 403)
    }

    const checkin = await prisma.treinoCheckin.findUnique({
      where: { id: input.checkinId },
      include: {
        aluno: true,
      },
    })

    if (!checkin) {
      throw new AppError("Check-in não encontrado", 404)
    }

    if (checkin.aluno.userId !== auth.userId) {
      throw new AppError("Você não pode atualizar este check-in", 403)
    }

    if (checkin.status === CheckinStatus.CONCLUIDO) {
      throw new AppError("Este treino já foi finalizado", 400)
    }

    const exercicioCheckin = await prisma.treinoExercicioCheckin.findUnique({
      where: {
        checkinId_treinoDiaExercicioId: {
          checkinId: input.checkinId,
          treinoDiaExercicioId: input.treinoDiaExercicioId,
        },
      },
    })

    if (!exercicioCheckin) {
      throw new AppError("Exercício do check-in não encontrado", 404)
    }

    return prisma.treinoExercicioCheckin.update({
      where: { id: exercicioCheckin.id },
      data: {
        ...(input.concluido !== undefined && { concluido: input.concluido }),
        ...(input.cargaReal !== undefined && { cargaReal: input.cargaReal }),
        ...(input.repeticoesReal !== undefined && {
          repeticoesReal: input.repeticoesReal,
        }),
        ...(input.comentarioAluno !== undefined && {
          comentarioAluno: input.comentarioAluno,
        }),
      },
      include: {
        exercicio: true,
        treinoDiaExercicio: true,
      },
    })
  }

  async finalizeCheckin(auth: AuthContext, input: FinalizeCheckinInput) {
    if (auth.role !== UserRole.ALUNO) {
      throw new AppError("Somente alunos podem finalizar treino", 403)
    }

    const checkin = await prisma.treinoCheckin.findUnique({
      where: { id: input.checkinId },
      include: {
        aluno: true,
        exercicios: true,
      },
    })

    if (!checkin) {
      throw new AppError("Check-in não encontrado", 404)
    }

    if (checkin.aluno.userId !== auth.userId) {
      throw new AppError("Você não pode finalizar este check-in", 403)
    }

    if (checkin.status === CheckinStatus.CONCLUIDO) {
      return checkin
    }

    return prisma.treinoCheckin.update({
      where: { id: checkin.id },
      data: {
        status: CheckinStatus.CONCLUIDO,
        finalizadoEm: new Date(),
        ...(input.comentarioAluno !== undefined && {
          comentarioAluno: input.comentarioAluno,
        }),
      },
      include: {
        treinoDia: true,
        exercicios: {
          include: {
            exercicio: true,
            treinoDiaExercicio: true,
          },
        },
      },
    })
  }

  async comentarCheckinComoProfessor(
    auth: AuthContext,
    input: ComentarioProfessorInput,
  ) {
    if (auth.role === UserRole.ALUNO) {
      throw new AppError("Alunos não podem comentar check-ins como professor", 403)
    }

    const checkin = await prisma.treinoCheckin.findUnique({
      where: { id: input.checkinId },
      include: {
        aluno: true,
      },
    })

    if (!checkin) {
      throw new AppError("Check-in não encontrado", 404)
    }

    if (auth.role === UserRole.PROFESSOR) {
      const professor = await prisma.professor.findUnique({
        where: { userId: auth.userId },
      })

      if (!professor || professor.id !== checkin.professorId) {
        throw new AppError("Você não pode comentar este check-in", 403)
      }
    }

    return prisma.treinoCheckin.update({
      where: { id: checkin.id },
      data: {
        comentarioProfessor: input.comentarioProfessor,
      },
      include: {
        treinoDia: true,
      },
    })
  }

  async listCheckinsByAluno(auth: AuthContext, alunoId: string, limit = 50) {
    await this.ensureAlunoAccess(auth, alunoId)

    return prisma.treinoCheckin.findMany({
      where: {
        alunoId,
      },
      orderBy: {
        iniciadoEm: "desc",
      },
      take: limit,
      include: {
        treinoDia: true,
        exercicios: {
          include: {
            exercicio: true,
            treinoDiaExercicio: true,
          },
          orderBy: {
            updatedAt: "desc",
          },
        },
      },
    })
  }

  async getTimelineByAluno(auth: AuthContext, alunoId: string, limit = 80) {
    await this.ensureAlunoAccess(auth, alunoId)

    const checkins = await prisma.treinoCheckin.findMany({
      where: { alunoId },
      orderBy: { iniciadoEm: "desc" },
      take: Math.max(20, Math.ceil(limit / 2)),
      include: {
        treinoDia: true,
        exercicios: {
          include: {
            exercicio: true,
          },
        },
      },
    })

    const timeline: Array<{
      id: string
      tipo: "TREINO_INICIADO" | "EXERCICIO_CONCLUIDO" | "TREINO_FINALIZADO" | "COMENTARIO_PROFESSOR"
      dataHora: string
      checkinId: string
      treinoDiaTitulo: string
      descricao: string
      exercicioNome?: string
      cargaReal?: number | null
      repeticoesReal?: string | null
    }> = []

    for (const checkin of checkins) {
      timeline.push({
        id: `start-${checkin.id}`,
        tipo: "TREINO_INICIADO",
        dataHora: checkin.iniciadoEm.toISOString(),
        checkinId: checkin.id,
        treinoDiaTitulo: checkin.treinoDia.titulo,
        descricao: "Treino iniciado",
      })

      for (const exercicio of checkin.exercicios.filter((e) => e.concluido)) {
        timeline.push({
          id: `exercise-${exercicio.id}`,
          tipo: "EXERCICIO_CONCLUIDO",
          dataHora: exercicio.updatedAt.toISOString(),
          checkinId: checkin.id,
          treinoDiaTitulo: checkin.treinoDia.titulo,
          descricao: "Exercício concluído",
          exercicioNome: exercicio.exercicio.nome,
          cargaReal: exercicio.cargaReal,
          repeticoesReal: exercicio.repeticoesReal,
        })
      }

      if (checkin.finalizadoEm) {
        timeline.push({
          id: `finish-${checkin.id}`,
          tipo: "TREINO_FINALIZADO",
          dataHora: checkin.finalizadoEm.toISOString(),
          checkinId: checkin.id,
          treinoDiaTitulo: checkin.treinoDia.titulo,
          descricao: "Treino finalizado",
        })
      }

      if (checkin.comentarioProfessor) {
        timeline.push({
          id: `prof-comment-${checkin.id}`,
          tipo: "COMENTARIO_PROFESSOR",
          dataHora: checkin.updatedAt.toISOString(),
          checkinId: checkin.id,
          treinoDiaTitulo: checkin.treinoDia.titulo,
          descricao: checkin.comentarioProfessor,
        })
      }
    }

    timeline.sort((a, b) => new Date(b.dataHora).getTime() - new Date(a.dataHora).getTime())

    return timeline.slice(0, limit)
  }

  async getProgressByAluno(auth: AuthContext, alunoId: string, exercicioId?: string) {
    await this.ensureAlunoAccess(auth, alunoId)

    const where: Prisma.TreinoExercicioCheckinWhereInput = {
      checkin: {
        alunoId,
      },
      concluido: true,
      ...(exercicioId ? { exercicioId } : {}),
    }

    const checkins = await prisma.treinoExercicioCheckin.findMany({
      where,
      include: {
        exercicio: true,
        checkin: {
          select: {
            dataTreino: true,
          },
        },
      },
      orderBy: {
        createdAt: "asc",
      },
    })

    const grouped = new Map<
      string,
      {
        exercicioId: string
        exercicioNome: string
        grupamentoMuscular: string
        pontos: Array<{
          data: string
          cargaReal: number | null
          repeticoesReal: string | null
        }>
      }
    >()

    for (const item of checkins) {
      if (!grouped.has(item.exercicioId)) {
        grouped.set(item.exercicioId, {
          exercicioId: item.exercicioId,
          exercicioNome: item.exercicio.nome,
          grupamentoMuscular: item.exercicio.grupamentoMuscular,
          pontos: [],
        })
      }

      grouped.get(item.exercicioId)!.pontos.push({
        data: item.checkin.dataTreino.toISOString(),
        cargaReal: item.cargaReal,
        repeticoesReal: item.repeticoesReal,
      })
    }

    return Array.from(grouped.values())
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

  private async validateExerciseAccess(
    auth: AuthContext,
    professorId: string,
    exerciseIds: string[],
  ) {
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

    if (auth.role !== UserRole.PROFESSOR) {
      return
    }

    for (const exercicio of exercicios) {
      if (exercicio.professorId && exercicio.professorId !== professorId) {
        throw new AppError(
          "Você não pode usar exercícios personalizados de outro professor",
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
