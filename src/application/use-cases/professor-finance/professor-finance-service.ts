import { FinanceMonthStatus, FinanceRenewalPlanType } from "@prisma/client"
import { prisma } from "@/infraestructure/database/prisma"
import { AppError } from "@/shared/errors/app-error"

const MONTH_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/

const round2 = (value: number) => Math.round(value * 100) / 100

const assertValidMonth = (month: string) => {
  if (!MONTH_PATTERN.test(month)) {
    throw new AppError("Mês inválido. Use o formato YYYY-MM", 400)
  }

  return month
}

const dateToMonthUtc = (date: Date) => {
  const year = date.getUTCFullYear()
  const month = String(date.getUTCMonth() + 1).padStart(2, "0")
  return `${year}-${month}`
}

const monthToDateUtc = (month: string) => {
  const [yearRaw, monthRaw] = assertValidMonth(month).split("-")
  return new Date(Date.UTC(Number(yearRaw), Number(monthRaw) - 1, 1, 0, 0, 0, 0))
}

const addMonthsUtc = (date: Date, months: number) =>
  new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + months, 1, 0, 0, 0, 0))

const buildMonthRange = (from: string, to: string) => {
  const start = monthToDateUtc(from)
  const end = monthToDateUtc(to)

  if (start.getTime() > end.getTime()) {
    throw new AppError("Período inválido: 'from' deve ser <= 'to'", 400)
  }

  const months: string[] = []
  let cursor = start

  while (cursor.getTime() <= end.getTime()) {
    months.push(dateToMonthUtc(cursor))
    cursor = addMonthsUtc(cursor, 1)
  }

  return months
}

interface FinanceInput {
  userId: string
  from?: string
  to?: string
}

interface PlanAggregation {
  total: number
  valor: number
}

const emptyRenewals = () => ({
  total: 0,
  completo: 0,
  treino: 0,
  dieta: 0,
})

const planKey = (plan: FinanceRenewalPlanType) => {
  if (plan === FinanceRenewalPlanType.COMPLETO) return "completo"
  if (plan === FinanceRenewalPlanType.TREINO) return "treino"
  return "dieta"
}

export class ProfessorFinanceService {
  async getDashboard(input: FinanceInput) {
    const professor = await this.resolveProfessor(input.userId)
    const now = new Date()
    const currentMonth = dateToMonthUtc(now)
    const period = this.resolvePeriod(input, currentMonth)
    const months = buildMonthRange(period.from, period.to)
    const yearStart = `${now.getUTCFullYear()}-01`
    const yearEnd = `${now.getUTCFullYear()}-12`

    const [renewals, currentMonthRenewals, annualRenewals, activeStudents, monthsStatusRows] =
      await Promise.all([
        prisma.financeRenewal.findMany({
          where: {
            month: { in: months },
            aluno: { professorId: professor.id },
          },
          orderBy: [{ renovadoEm: "desc" }, { createdAt: "desc" }],
          include: {
            aluno: { include: { user: { select: { nome: true, email: true } } } },
          },
        }),
        prisma.financeRenewal.findMany({
          where: {
            month: currentMonth,
            aluno: { professorId: professor.id },
          },
          select: { alunoId: true, valor: true },
        }),
        prisma.financeRenewal.findMany({
          where: {
            month: { gte: yearStart, lte: yearEnd },
            aluno: { professorId: professor.id },
          },
          select: { valor: true },
        }),
        prisma.aluno.findMany({
          where: { professorId: professor.id, ativo: true },
          include: { user: { select: { nome: true } } },
          orderBy: { createdAt: "asc" },
        }),
        prisma.financeMonth.findMany({
          where: { month: { in: months } },
          select: { month: true, status: true },
        }),
      ])

    const monthStatusMap = new Map(monthsStatusRows.map((item) => [item.month, item.status]))
    const currentMonthStatus = monthStatusMap.get(currentMonth) ?? FinanceMonthStatus.ABERTO

    const monthMap = new Map(
      months.map((month) => [
        month,
        {
          month,
          receita: 0,
          alunosPagantesSet: new Set<string>(),
          renewals: emptyRenewals(),
        },
      ]),
    )

    const planMap = new Map<FinanceRenewalPlanType, PlanAggregation>([
      [FinanceRenewalPlanType.COMPLETO, { total: 0, valor: 0 }],
      [FinanceRenewalPlanType.TREINO, { total: 0, valor: 0 }],
      [FinanceRenewalPlanType.DIETA, { total: 0, valor: 0 }],
    ])

    renewals.forEach((renewal) => {
      const target = monthMap.get(renewal.month)
      if (!target) return

      target.receita += renewal.valor
      target.alunosPagantesSet.add(renewal.alunoId)
      target.renewals.total += 1
      target.renewals[planKey(renewal.tipoPlano)] += 1

      const planTarget = planMap.get(renewal.tipoPlano)
      if (planTarget) {
        planTarget.total += 1
        planTarget.valor += renewal.valor
      }
    })

    const monthsRows = Array.from(monthMap.values()).map((item) => {
      const alunosPagantes = item.alunosPagantesSet.size
      return {
        month: item.month,
        status: monthStatusMap.get(item.month) ?? FinanceMonthStatus.ABERTO,
        receita: round2(item.receita),
        alunosPagantes,
        ticketMedio: alunosPagantes > 0 ? round2(item.receita / alunosPagantes) : 0,
        renewals: item.renewals,
      }
    })

    const totalReceita = renewals.reduce((acc, item) => acc + item.valor, 0)
    const payingStudentsPeriod = new Set(renewals.map((item) => item.alunoId))
    const currentMonthPayingStudentIds = new Set(currentMonthRenewals.map((item) => item.alunoId))
    const pendingStudents = activeStudents.filter(
      (aluno) => !currentMonthPayingStudentIds.has(aluno.id),
    )

    const totalRenewals = renewals.reduce((acc, item) => {
      acc.total += 1
      acc[planKey(item.tipoPlano)] += 1
      return acc
    }, emptyRenewals())

    return {
      period,
      currentMonth,
      currentMonthStatus,
      totals: {
        receita: round2(totalReceita),
        receitaMensalAtual: round2(
          currentMonthRenewals.reduce((acc, item) => acc + item.valor, 0),
        ),
        receitaAnual: round2(annualRenewals.reduce((acc, item) => acc + item.valor, 0)),
        alunosAtivos: activeStudents.length,
        alunosPagantesPeriodo: payingStudentsPeriod.size,
        pendentesMesAtual: pendingStudents.length,
        ticketMedio:
          payingStudentsPeriod.size > 0 ? round2(totalReceita / payingStudentsPeriod.size) : 0,
        renewals: totalRenewals,
      },
      months: monthsRows,
      charts: {
        evolucaoMensal: monthsRows.map((item) => ({
          month: item.month,
          receita: item.receita,
          alunosPagantes: item.alunosPagantes,
        })),
        composicaoPlanos: Array.from(planMap.entries()).map(([tipoPlano, data]) => ({
          tipoPlano,
          total: data.total,
          valor: round2(data.valor),
        })),
      },
      pendencias: pendingStudents.slice(0, 20).map((aluno) => ({
        alunoId: aluno.id,
        alunoNome: aluno.user?.nome || "Aluno",
        motivo: "SEM_RENOVACAO_NO_MES" as const,
        detailPath: `/professor/alunos/${aluno.id}/edit`,
      })),
      ultimasRenovacoes: renewals.slice(0, 10).map((renewal) => ({
        id: renewal.id,
        alunoId: renewal.alunoId,
        alunoNome: renewal.aluno.user?.nome || "Aluno",
        tipoPlano: renewal.tipoPlano,
        valor: renewal.valor,
        month: renewal.month,
        renovadoEm: renewal.renovadoEm.toISOString(),
        observacao: renewal.observacao,
        detailPath: `/professor/alunos/${renewal.alunoId}/edit`,
      })),
    }
  }

  private resolvePeriod(input: FinanceInput, currentMonth: string) {
    if (input.from && input.to) {
      return {
        from: assertValidMonth(input.from),
        to: assertValidMonth(input.to),
      }
    }

    if (input.from) {
      const from = assertValidMonth(input.from)
      return { from, to: from }
    }

    if (input.to) {
      const to = assertValidMonth(input.to)
      return { from: to, to }
    }

    const end = monthToDateUtc(currentMonth)
    const start = addMonthsUtc(end, -5)
    return {
      from: dateToMonthUtc(start),
      to: dateToMonthUtc(end),
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
}
