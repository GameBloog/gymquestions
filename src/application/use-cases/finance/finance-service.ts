import {
  FinanceEntryCategory,
  FinanceEntryType,
  FinanceMonthStatus,
  FinanceRenewalPlanType,
} from "@prisma/client"
import { prisma } from "@/infraestructure/database/prisma"
import { AppError } from "@/shared/errors/app-error"

const MONTH_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/

const round2 = (value: number) => Math.round(value * 100) / 100

const assertValidMonth = (month: string): string => {
  if (!MONTH_PATTERN.test(month)) {
    throw new AppError("Mês inválido. Use o formato YYYY-MM", 400)
  }

  return month
}

const monthToDateUtc = (month: string): Date => {
  const [yearRaw, monthRaw] = assertValidMonth(month).split("-")
  const year = Number(yearRaw)
  const monthIndex = Number(monthRaw) - 1
  return new Date(Date.UTC(year, monthIndex, 1, 0, 0, 0, 0))
}

const addMonthsUtc = (date: Date, months: number): Date =>
  new Date(
    Date.UTC(
      date.getUTCFullYear(),
      date.getUTCMonth() + months,
      1,
      0,
      0,
      0,
      0,
    ),
  )

const dateToMonthUtc = (date: Date): string => {
  const year = date.getUTCFullYear()
  const month = String(date.getUTCMonth() + 1).padStart(2, "0")
  return `${year}-${month}`
}

const buildMonthRange = (from: string, to: string): string[] => {
  const start = monthToDateUtc(from)
  const end = monthToDateUtc(to)

  if (start.getTime() > end.getTime()) {
    throw new AppError("Período inválido: 'from' deve ser <= 'to'", 400)
  }

  const months: string[] = []
  let current = start

  while (current.getTime() <= end.getTime()) {
    months.push(dateToMonthUtc(current))
    current = addMonthsUtc(current, 1)
  }

  return months
}

interface MonthAggregation {
  month: string
  status: FinanceMonthStatus
  receitas: number
  despesas: number
  saldo: number
  saldoAcumulado: number
  renewals: {
    total: number
    completo: number
    treino: number
    dieta: number
  }
  camisasVendidas: number
}

interface ProjectionTotals {
  receitas: number
  despesas: number
  saldo: number
}

export interface FinanceDashboardInput {
  from?: string
  to?: string
}

export interface ListFinanceRenewalsInput {
  month: string
}

export interface CreateFinanceRenewalInput {
  alunoId: string
  tipoPlano: FinanceRenewalPlanType
  valor: number
  renovadoEm: Date
  observacao?: string | null
}

export interface UpdateFinanceRenewalInput {
  alunoId?: string
  tipoPlano?: FinanceRenewalPlanType
  valor?: number
  renovadoEm?: Date
  observacao?: string | null
}

export interface ListFinanceEntriesInput {
  month: string
  type?: FinanceEntryType
}

export interface CreateFinanceEntryInput {
  tipo: FinanceEntryType
  categoria: FinanceEntryCategory
  valor: number
  quantidade?: number | null
  descricao?: string | null
  dataLancamento: Date
}

export interface UpdateFinanceEntryInput {
  tipo?: FinanceEntryType
  categoria?: FinanceEntryCategory
  valor?: number
  quantidade?: number | null
  descricao?: string | null
  dataLancamento?: Date
}

const resolvePeriod = (input: FinanceDashboardInput): { from: string; to: string } => {
  const nowMonth = dateToMonthUtc(new Date())

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

  const end = monthToDateUtc(nowMonth)
  const start = addMonthsUtc(end, -5)

  return {
    from: dateToMonthUtc(start),
    to: dateToMonthUtc(end),
  }
}

export class FinanceService {
  async getDashboard(input: FinanceDashboardInput) {
    const period = resolvePeriod(input)
    const months = buildMonthRange(period.from, period.to)

    const [monthsStatusRows, renewals, entries, alunos, professores, leadAttributions] =
      await Promise.all([
        prisma.financeMonth.findMany({
          where: { month: { in: months } },
          select: { month: true, status: true },
        }),
        prisma.financeRenewal.findMany({
          where: { month: { in: months } },
          select: {
            month: true,
            tipoPlano: true,
            valor: true,
          },
        }),
        prisma.financeEntry.findMany({
          where: { month: { in: months } },
          select: {
            month: true,
            tipo: true,
            categoria: true,
            valor: true,
            quantidade: true,
          },
        }),
        prisma.aluno.findMany({
          select: {
            id: true,
            ativo: true,
            professorId: true,
            createdAt: true,
          },
        }),
        prisma.professor.findMany({
          select: {
            id: true,
            user: {
              select: {
                nome: true,
              },
            },
          },
        }),
        prisma.leadAttribution.findMany({
          where: {
            attributedAt: {
              gte: monthToDateUtc(period.from),
              lt: addMonthsUtc(monthToDateUtc(period.to), 1),
            },
          },
          select: {
            leadLink: {
              select: {
                canal: true,
                origem: true,
                nome: true,
              },
            },
          },
        }),
      ])

    const monthStatusMap = new Map(monthsStatusRows.map((item) => [item.month, item.status]))

    const aggregates = new Map<string, MonthAggregation>()
    months.forEach((month) => {
      aggregates.set(month, {
        month,
        status: monthStatusMap.get(month) ?? FinanceMonthStatus.ABERTO,
        receitas: 0,
        despesas: 0,
        saldo: 0,
        saldoAcumulado: 0,
        renewals: {
          total: 0,
          completo: 0,
          treino: 0,
          dieta: 0,
        },
        camisasVendidas: 0,
      })
    })

    const composicaoReceitasMap = new Map<string, number>()

    renewals.forEach((item) => {
      const target = aggregates.get(item.month)
      if (!target) return

      target.receitas += item.valor
      target.renewals.total += 1

      if (item.tipoPlano === FinanceRenewalPlanType.COMPLETO) {
        target.renewals.completo += 1
      } else if (item.tipoPlano === FinanceRenewalPlanType.TREINO) {
        target.renewals.treino += 1
      } else if (item.tipoPlano === FinanceRenewalPlanType.DIETA) {
        target.renewals.dieta += 1
      }
    })

    entries.forEach((item) => {
      const target = aggregates.get(item.month)
      if (!target) return

      if (item.tipo === FinanceEntryType.RECEITA) {
        target.receitas += item.valor

        const key = item.categoria
        composicaoReceitasMap.set(key, (composicaoReceitasMap.get(key) ?? 0) + item.valor)

        if (item.categoria === FinanceEntryCategory.CAMISA) {
          target.camisasVendidas += item.quantidade ?? 0
        }
      } else {
        target.despesas += item.valor
      }
    })

    const monthRows: MonthAggregation[] = []
    let saldoAcumulado = 0

    months.forEach((month) => {
      const item = aggregates.get(month)!
      item.receitas = round2(item.receitas)
      item.despesas = round2(item.despesas)
      item.saldo = round2(item.receitas - item.despesas)
      saldoAcumulado += item.saldo
      item.saldoAcumulado = round2(saldoAcumulado)
      monthRows.push(item)
    })

    const totals = monthRows.reduce(
      (acc, item) => {
        acc.receitas += item.receitas
        acc.despesas += item.despesas
        acc.renewals.total += item.renewals.total
        acc.renewals.completo += item.renewals.completo
        acc.renewals.treino += item.renewals.treino
        acc.renewals.dieta += item.renewals.dieta
        acc.camisasVendidas += item.camisasVendidas
        return acc
      },
      {
        receitas: 0,
        despesas: 0,
        saldo: 0,
        camisasVendidas: 0,
        renewals: {
          total: 0,
          completo: 0,
          treino: 0,
          dieta: 0,
        },
      },
    )

    totals.receitas = round2(totals.receitas)
    totals.despesas = round2(totals.despesas)
    totals.saldo = round2(totals.receitas - totals.despesas)

    const closedBaseMonths = await this.getLastClosedMonths(3)
    const projectionAverages = await this.computeAverageFromMonths(closedBaseMonths)

    const projection3: ProjectionTotals = {
      receitas: round2(projectionAverages.receitas * 3),
      despesas: round2(projectionAverages.despesas * 3),
      saldo: round2((projectionAverages.receitas - projectionAverages.despesas) * 3),
    }

    const projection6: ProjectionTotals = {
      receitas: round2(projectionAverages.receitas * 6),
      despesas: round2(projectionAverages.despesas * 6),
      saldo: round2((projectionAverages.receitas - projectionAverages.despesas) * 6),
    }

    const alunosTotal = alunos.length
    const alunosAtivos = alunos.filter((aluno) => aluno.ativo).length
    const alunosInativos = alunosTotal - alunosAtivos

    const novosAlunosPorMesMap = new Map(months.map((month) => [month, 0]))
    alunos.forEach((aluno) => {
      const month = dateToMonthUtc(aluno.createdAt)
      if (novosAlunosPorMesMap.has(month)) {
        novosAlunosPorMesMap.set(month, (novosAlunosPorMesMap.get(month) ?? 0) + 1)
      }
    })

    const alunosByProfessor = new Map<
      string,
      {
        total: number
        ativos: number
        inativos: number
      }
    >()

    alunos.forEach((aluno) => {
      const item =
        alunosByProfessor.get(aluno.professorId) ||
        {
          total: 0,
          ativos: 0,
          inativos: 0,
        }

      item.total += 1
      if (aluno.ativo) {
        item.ativos += 1
      } else {
        item.inativos += 1
      }

      alunosByProfessor.set(aluno.professorId, item)
    })

    const professoresComMetricas = professores
      .map((professor) => {
        const data =
          alunosByProfessor.get(professor.id) ||
          ({ total: 0, ativos: 0, inativos: 0 } as const)

        return {
          professorId: professor.id,
          professorNome: professor.user?.nome || "Professor",
          total: data.total,
          ativos: data.ativos,
          inativos: data.inativos,
        }
      })
      .sort((a, b) => b.total - a.total || a.professorNome.localeCompare(b.professorNome))

    const aquisicaoPorCanalMap = new Map<string, number>()

    leadAttributions.forEach((item) => {
      const canal = item.leadLink?.canal || item.leadLink?.origem || item.leadLink?.nome || "Sem canal"
      aquisicaoPorCanalMap.set(canal, (aquisicaoPorCanalMap.get(canal) ?? 0) + 1)
    })

    return {
      period,
      months: monthRows,
      totals,
      charts: {
        receitasVsDespesas: monthRows.map((item) => ({
          month: item.month,
          receitas: item.receitas,
          despesas: item.despesas,
        })),
        saldoAcumulado: monthRows.map((item) => ({
          month: item.month,
          saldoAcumulado: item.saldoAcumulado,
        })),
        composicaoReceitas: Array.from(composicaoReceitasMap.entries())
          .map(([categoria, valor]) => ({ categoria, valor: round2(valor) }))
          .sort((a, b) => b.valor - a.valor),
        projecoes: [
          {
            horizonMonths: 3,
            ...projection3,
          },
          {
            horizonMonths: 6,
            ...projection6,
          },
        ],
      },
      projections: {
        method: "MEDIA_MOVEL_3_MESES_FECHADOS",
        baseMonths: closedBaseMonths,
        months3: projection3,
        months6: projection6,
      },
      systemMetrics: {
        alunos: {
          total: alunosTotal,
          ativos: alunosAtivos,
          inativos: alunosInativos,
        },
        novosAlunosPorMes: Array.from(novosAlunosPorMesMap.entries()).map(
          ([month, count]) => ({ month, count }),
        ),
        professores: professoresComMetricas,
        aquisicaoPorCanal: Array.from(aquisicaoPorCanalMap.entries())
          .map(([canal, cadastros]) => ({ canal, cadastros }))
          .sort((a, b) => b.cadastros - a.cadastros),
      },
    }
  }

  async listRenewals(input: ListFinanceRenewalsInput) {
    const month = assertValidMonth(input.month)

    return prisma.financeRenewal.findMany({
      where: { month },
      orderBy: [{ renovadoEm: "desc" }, { createdAt: "desc" }],
      include: {
        aluno: {
          include: {
            user: {
              select: {
                nome: true,
                email: true,
              },
            },
          },
        },
      },
    })
  }

  async createRenewal(createdBy: string, input: CreateFinanceRenewalInput) {
    const aluno = await prisma.aluno.findUnique({ where: { id: input.alunoId }, select: { id: true } })

    if (!aluno) {
      throw new AppError("Aluno não encontrado", 404)
    }

    const month = dateToMonthUtc(input.renovadoEm)
    await this.assertOpenMonth(month)

    return prisma.financeRenewal.create({
      data: {
        alunoId: input.alunoId,
        month,
        tipoPlano: input.tipoPlano,
        valor: input.valor,
        renovadoEm: input.renovadoEm,
        observacao: input.observacao?.trim() || null,
        createdBy,
      },
      include: {
        aluno: {
          include: {
            user: {
              select: {
                nome: true,
                email: true,
              },
            },
          },
        },
      },
    })
  }

  async updateRenewal(id: string, input: UpdateFinanceRenewalInput) {
    const existing = await prisma.financeRenewal.findUnique({ where: { id } })

    if (!existing) {
      throw new AppError("Renovação não encontrada", 404)
    }

    await this.assertOpenMonth(existing.month)

    const targetMonth = input.renovadoEm
      ? dateToMonthUtc(input.renovadoEm)
      : existing.month

    if (targetMonth !== existing.month) {
      await this.assertOpenMonth(targetMonth)
    }

    if (input.alunoId && input.alunoId !== existing.alunoId) {
      const aluno = await prisma.aluno.findUnique({ where: { id: input.alunoId }, select: { id: true } })
      if (!aluno) {
        throw new AppError("Aluno não encontrado", 404)
      }
    }

    return prisma.financeRenewal.update({
      where: { id },
      data: {
        ...(input.alunoId !== undefined && { alunoId: input.alunoId }),
        ...(input.tipoPlano !== undefined && { tipoPlano: input.tipoPlano }),
        ...(input.valor !== undefined && { valor: input.valor }),
        ...(input.renovadoEm !== undefined && {
          renovadoEm: input.renovadoEm,
          month: targetMonth,
        }),
        ...(input.observacao !== undefined && {
          observacao: input.observacao?.trim() || null,
        }),
      },
      include: {
        aluno: {
          include: {
            user: {
              select: {
                nome: true,
                email: true,
              },
            },
          },
        },
      },
    })
  }

  async deleteRenewal(id: string) {
    const existing = await prisma.financeRenewal.findUnique({ where: { id } })

    if (!existing) {
      throw new AppError("Renovação não encontrada", 404)
    }

    await this.assertOpenMonth(existing.month)
    await prisma.financeRenewal.delete({ where: { id } })
  }

  async listEntries(input: ListFinanceEntriesInput) {
    const month = assertValidMonth(input.month)

    return prisma.financeEntry.findMany({
      where: {
        month,
        ...(input.type && { tipo: input.type }),
      },
      orderBy: [{ dataLancamento: "desc" }, { createdAt: "desc" }],
    })
  }

  async createEntry(createdBy: string, input: CreateFinanceEntryInput) {
    const month = dateToMonthUtc(input.dataLancamento)
    await this.assertOpenMonth(month)

    return prisma.financeEntry.create({
      data: {
        month,
        tipo: input.tipo,
        categoria: input.categoria,
        valor: input.valor,
        quantidade: input.quantidade ?? null,
        descricao: input.descricao?.trim() || null,
        dataLancamento: input.dataLancamento,
        createdBy,
      },
    })
  }

  async updateEntry(id: string, input: UpdateFinanceEntryInput) {
    const existing = await prisma.financeEntry.findUnique({ where: { id } })

    if (!existing) {
      throw new AppError("Lançamento não encontrado", 404)
    }

    await this.assertOpenMonth(existing.month)

    const targetMonth = input.dataLancamento
      ? dateToMonthUtc(input.dataLancamento)
      : existing.month

    if (targetMonth !== existing.month) {
      await this.assertOpenMonth(targetMonth)
    }

    return prisma.financeEntry.update({
      where: { id },
      data: {
        ...(input.tipo !== undefined && { tipo: input.tipo }),
        ...(input.categoria !== undefined && { categoria: input.categoria }),
        ...(input.valor !== undefined && { valor: input.valor }),
        ...(input.quantidade !== undefined && { quantidade: input.quantidade }),
        ...(input.descricao !== undefined && {
          descricao: input.descricao?.trim() || null,
        }),
        ...(input.dataLancamento !== undefined && {
          dataLancamento: input.dataLancamento,
          month: targetMonth,
        }),
      },
    })
  }

  async deleteEntry(id: string) {
    const existing = await prisma.financeEntry.findUnique({ where: { id } })

    if (!existing) {
      throw new AppError("Lançamento não encontrado", 404)
    }

    await this.assertOpenMonth(existing.month)
    await prisma.financeEntry.delete({ where: { id } })
  }

  async closeMonth(month: string, userId: string) {
    const monthKey = assertValidMonth(month)

    return prisma.financeMonth.upsert({
      where: { month: monthKey },
      update: {
        status: FinanceMonthStatus.FECHADO,
        closedAt: new Date(),
        closedBy: userId,
      },
      create: {
        month: monthKey,
        status: FinanceMonthStatus.FECHADO,
        closedAt: new Date(),
        closedBy: userId,
      },
    })
  }

  async reopenMonth(month: string, userId: string) {
    const monthKey = assertValidMonth(month)

    return prisma.financeMonth.upsert({
      where: { month: monthKey },
      update: {
        status: FinanceMonthStatus.ABERTO,
        reopenedAt: new Date(),
        reopenedBy: userId,
      },
      create: {
        month: monthKey,
        status: FinanceMonthStatus.ABERTO,
        reopenedAt: new Date(),
        reopenedBy: userId,
      },
    })
  }

  private async assertOpenMonth(month: string) {
    const monthKey = assertValidMonth(month)

    const monthState = await prisma.financeMonth.upsert({
      where: { month: monthKey },
      update: {},
      create: {
        month: monthKey,
      },
      select: {
        status: true,
      },
    })

    if (monthState.status === FinanceMonthStatus.FECHADO) {
      throw new AppError("Mês fechado. Reabra o mês para editar registros.", 409)
    }
  }

  private async getLastClosedMonths(limit: number): Promise<string[]> {
    const rows = await prisma.financeMonth.findMany({
      where: {
        status: FinanceMonthStatus.FECHADO,
      },
      orderBy: {
        month: "desc",
      },
      take: limit,
      select: {
        month: true,
      },
    })

    return rows.map((row) => row.month).sort((a, b) => a.localeCompare(b))
  }

  private async computeAverageFromMonths(months: string[]): Promise<{ receitas: number; despesas: number }> {
    if (months.length === 0) {
      return { receitas: 0, despesas: 0 }
    }

    const [renewals, entries] = await Promise.all([
      prisma.financeRenewal.findMany({
        where: { month: { in: months } },
        select: { month: true, valor: true },
      }),
      prisma.financeEntry.findMany({
        where: { month: { in: months } },
        select: { month: true, tipo: true, valor: true },
      }),
    ])

    const totalsByMonth = new Map<string, { receitas: number; despesas: number }>()

    months.forEach((month) => {
      totalsByMonth.set(month, { receitas: 0, despesas: 0 })
    })

    renewals.forEach((item) => {
      const target = totalsByMonth.get(item.month)
      if (!target) return
      target.receitas += item.valor
    })

    entries.forEach((item) => {
      const target = totalsByMonth.get(item.month)
      if (!target) return
      if (item.tipo === FinanceEntryType.RECEITA) {
        target.receitas += item.valor
      } else {
        target.despesas += item.valor
      }
    })

    const summary = Array.from(totalsByMonth.values()).reduce(
      (acc, item) => {
        acc.receitas += item.receitas
        acc.despesas += item.despesas
        return acc
      },
      {
        receitas: 0,
        despesas: 0,
      },
    )

    return {
      receitas: round2(summary.receitas / months.length),
      despesas: round2(summary.despesas / months.length),
    }
  }
}
