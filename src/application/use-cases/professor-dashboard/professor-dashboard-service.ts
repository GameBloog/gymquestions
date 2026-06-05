import { addMonths, differenceInCalendarDays, differenceInDays } from "@/shared/utils/date-utils"
import { prisma } from "@/infraestructure/database/prisma"
import { AppError } from "@/shared/errors/app-error"

type FeedbackStatus = "AGUARDANDO_RESPOSTA" | "RESPONDIDO"

interface DashboardInput {
  userId: string
  feedbackLimit: number
  recentDays: number
  reavaliacaoWindowDays: number
}

const trimText = (value?: string | null) => value?.trim() || ""

const summarize = (parts: Array<string | null | undefined>, fallback: string) => {
  const text = parts.map(trimText).filter(Boolean).join(" | ")
  if (!text) return fallback
  return text.length > 180 ? `${text.slice(0, 177)}...` : text
}

const toIso = (date: Date) => date.toISOString()

export class ProfessorDashboardService {
  async getDashboard(input: DashboardInput) {
    const professor = await this.resolveProfessor(input.userId)
    const today = new Date()
    const recentCutoff = new Date(today)
    recentCutoff.setDate(recentCutoff.getDate() - input.recentDays)

    const [
      alunos,
      activeWorkoutPlans,
      activeDietPlans,
      recentWorkoutStudentIds,
      recentDietStudentIds,
      workoutFeedbackRows,
      dietFeedbackRows,
    ] = await Promise.all([
      prisma.aluno.findMany({
        where: { professorId: professor.id },
        include: {
          user: { select: { nome: true, email: true } },
          historico: {
            orderBy: { dataRegistro: "desc" },
            take: 1,
            select: { dataRegistro: true },
          },
        },
        orderBy: { createdAt: "asc" },
      }),
      prisma.planoTreino.findMany({
        where: { professorId: professor.id, ativo: true },
        select: { alunoId: true },
      }),
      prisma.planoDieta.findMany({
        where: { professorId: professor.id, ativo: true },
        select: { alunoId: true },
      }),
      prisma.treinoCheckin.findMany({
        where: {
          professorId: professor.id,
          dataTreino: { gte: recentCutoff },
        },
        distinct: ["alunoId"],
        select: { alunoId: true },
      }),
      prisma.dietaCheckin.findMany({
        where: {
          professorId: professor.id,
          dataDieta: { gte: recentCutoff },
        },
        distinct: ["alunoId"],
        select: { alunoId: true },
      }),
      prisma.treinoCheckin.findMany({
        where: {
          professorId: professor.id,
          OR: [
            { comentarioAluno: { not: null } },
            { exercicios: { some: { comentarioAluno: { not: null } } } },
          ],
        },
        orderBy: [{ dataTreino: "desc" }, { createdAt: "desc" }],
        take: input.feedbackLimit,
        include: {
          aluno: { include: { user: { select: { nome: true } } } },
          exercicios: {
            where: { comentarioAluno: { not: null } },
            take: 3,
            include: { exercicio: { select: { nome: true } } },
          },
        },
      }),
      prisma.dietaCheckin.findMany({
        where: {
          professorId: professor.id,
          OR: [
            { observacaoDia: { not: null } },
            { refeicoes: { some: { observacaoAluno: { not: null } } } },
          ],
        },
        orderBy: [{ dataDieta: "desc" }, { createdAt: "desc" }],
        take: input.feedbackLimit,
        include: {
          aluno: { include: { user: { select: { nome: true } } } },
          refeicoes: {
            where: { observacaoAluno: { not: null } },
            take: 3,
            include: { dietaRefeicao: { select: { nome: true } } },
          },
        },
      }),
    ])

    const activeStudents = alunos.filter((aluno) => aluno.ativo)
    const activeWorkoutStudentIds = new Set(activeWorkoutPlans.map((plan) => plan.alunoId))
    const activeDietStudentIds = new Set(activeDietPlans.map((plan) => plan.alunoId))
    const recentStudentIds = new Set([
      ...recentWorkoutStudentIds.map((item) => item.alunoId),
      ...recentDietStudentIds.map((item) => item.alunoId),
    ])

    const reavaliacoesProximas = activeStudents
      .map((aluno) => {
        const latestHistory = aluno.historico[0]
        if (!latestHistory) return null

        const nextDate = addMonths(latestHistory.dataRegistro, 1)
        const daysRemaining = differenceInCalendarDays(nextDate, today)

        if (daysRemaining < 0 || daysRemaining >= input.reavaliacaoWindowDays) {
          return null
        }

        return {
          alunoId: aluno.id,
          alunoNome: aluno.user?.nome || "Aluno",
          ultimaAvaliacaoEm: toIso(latestHistory.dataRegistro),
          proximaAvaliacaoEm: toIso(nextDate),
          diasRestantes: daysRemaining,
          detailPath: `/professor/alunos/${aluno.id}/evolucao`,
        }
      })
      .filter((item): item is NonNullable<typeof item> => Boolean(item))
      .sort((a, b) => a.diasRestantes - b.diasRestantes || a.alunoNome.localeCompare(b.alunoNome))

    const workoutFeedbacks = workoutFeedbackRows.map((checkin) => ({
      id: `treino-${checkin.id}`,
      checkinId: checkin.id,
      alunoId: checkin.alunoId,
      alunoNome: checkin.aluno.user?.nome || "Aluno",
      data: toIso(checkin.dataTreino),
      status: this.feedbackStatus(checkin.comentarioProfessor),
      resumo: summarize(
        [
          checkin.comentarioAluno,
          ...checkin.exercicios.map((item) =>
            item.comentarioAluno
              ? `${item.exercicio?.nome || "Exercício"}: ${item.comentarioAluno}`
              : null,
          ),
        ],
        "Feedback de treino enviado pelo aluno",
      ),
      detailPath: `/professor/alunos/${checkin.alunoId}/treino`,
    }))

    const dietFeedbacks = dietFeedbackRows.map((checkin) => ({
      id: `dieta-${checkin.id}`,
      checkinId: checkin.id,
      alunoId: checkin.alunoId,
      alunoNome: checkin.aluno.user?.nome || "Aluno",
      data: toIso(checkin.dataDieta),
      status: this.feedbackStatus(checkin.comentarioProfessor),
      resumo: summarize(
        [
          checkin.observacaoDia,
          ...checkin.refeicoes.map((item) =>
            item.observacaoAluno
              ? `${item.dietaRefeicao?.nome || "Refeição"}: ${item.observacaoAluno}`
              : null,
          ),
        ],
        "Feedback de dieta enviado pelo aluno",
      ),
      detailPath: `/professor/alunos/${checkin.alunoId}/dieta`,
    }))

    return {
      summary: {
        alunosAtivos: activeStudents.length,
        alunosInativos: alunos.length - activeStudents.length,
        alunosRecemCadastrados: alunos.filter(
          (aluno) => differenceInDays(today, aluno.createdAt) <= 30,
        ).length,
        semTreinoAtivo: activeStudents.filter(
          (aluno) => !activeWorkoutStudentIds.has(aluno.id),
        ).length,
        semDietaAtiva: activeStudents.filter(
          (aluno) => !activeDietStudentIds.has(aluno.id),
        ).length,
        semFeedbackRecente: activeStudents.filter(
          (aluno) => !recentStudentIds.has(aluno.id),
        ).length,
        aguardandoResposta: [...workoutFeedbacks, ...dietFeedbacks].filter(
          (item) => item.status === "AGUARDANDO_RESPOSTA",
        ).length,
        reavaliacoesProximas: reavaliacoesProximas.length,
        maiorTempoAcompanhamento: activeStudents
          .slice(0, 5)
          .map((aluno) => ({
            alunoId: aluno.id,
            alunoNome: aluno.user?.nome || "Aluno",
            desde: toIso(aluno.createdAt),
            dias: Math.max(0, differenceInDays(today, aluno.createdAt)),
            detailPath: `/professor/alunos/${aluno.id}/edit`,
          })),
      },
      feedbacks: {
        treino: workoutFeedbacks,
        dieta: dietFeedbacks,
      },
      reavaliacoesProximas,
    }
  }

  private async resolveProfessor(userId: string) {
    const professor = await prisma.professor.findUnique({
      where: { userId },
      select: { id: true },
    })

    if (!professor) {
      throw new AppError("Professor não encontrado", 404)
    }

    return professor
  }

  private feedbackStatus(comentarioProfessor?: string | null): FeedbackStatus {
    return trimText(comentarioProfessor) ? "RESPONDIDO" : "AGUARDANDO_RESPOSTA"
  }
}
