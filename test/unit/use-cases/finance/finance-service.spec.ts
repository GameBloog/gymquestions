import { beforeEach, describe, expect, it, vi } from "vitest"

interface PrismaFinanceMonthMock {
  findMany: ReturnType<typeof vi.fn>
  upsert: ReturnType<typeof vi.fn>
}

interface PrismaFinanceRenewalMock {
  findMany: ReturnType<typeof vi.fn>
  findUnique: ReturnType<typeof vi.fn>
  create: ReturnType<typeof vi.fn>
  update: ReturnType<typeof vi.fn>
  delete: ReturnType<typeof vi.fn>
}

interface PrismaFinanceEntryMock {
  findMany: ReturnType<typeof vi.fn>
  findUnique: ReturnType<typeof vi.fn>
  create: ReturnType<typeof vi.fn>
  update: ReturnType<typeof vi.fn>
  delete: ReturnType<typeof vi.fn>
}

interface PrismaAlunoMock {
  findMany: ReturnType<typeof vi.fn>
  findUnique: ReturnType<typeof vi.fn>
}

interface PrismaProfessorMock {
  findMany: ReturnType<typeof vi.fn>
}

interface PrismaLeadAttributionMock {
  findMany: ReturnType<typeof vi.fn>
}

interface PrismaMock {
  financeMonth: PrismaFinanceMonthMock
  financeRenewal: PrismaFinanceRenewalMock
  financeEntry: PrismaFinanceEntryMock
  aluno: PrismaAlunoMock
  professor: PrismaProfessorMock
  leadAttribution: PrismaLeadAttributionMock
}

const buildPrismaMock = (): PrismaMock => ({
  financeMonth: {
    findMany: vi.fn(),
    upsert: vi.fn(),
  },
  financeRenewal: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  financeEntry: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  aluno: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
  },
  professor: {
    findMany: vi.fn(),
  },
  leadAttribution: {
    findMany: vi.fn(),
  },
})

let prismaMock: PrismaMock

const importService = async () => {
  vi.resetModules()

  vi.doMock("@/infraestructure/database/prisma", () => ({
    prisma: prismaMock,
  }))

  const module = await import(
    "../../../../src/application/use-cases/finance/finance-service"
  )

  return module.FinanceService
}

describe("FinanceService", () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    prismaMock = buildPrismaMock()
  })

  it("should aggregate mensal totals and projection from closed months", async () => {
    prismaMock.financeMonth.findMany
      .mockResolvedValueOnce([
        { month: "2026-01", status: "ABERTO" },
        { month: "2026-02", status: "ABERTO" },
      ])
      .mockResolvedValueOnce([{ month: "2026-02" }, { month: "2026-01" }])

    prismaMock.financeRenewal.findMany
      .mockResolvedValueOnce([
        { month: "2026-01", tipoPlano: "COMPLETO", valor: 300 },
        { month: "2026-02", tipoPlano: "TREINO", valor: 200 },
      ])
      .mockResolvedValueOnce([
        { month: "2026-01", valor: 300 },
        { month: "2026-02", valor: 200 },
      ])

    prismaMock.financeEntry.findMany
      .mockResolvedValueOnce([
        {
          month: "2026-01",
          tipo: "RECEITA",
          categoria: "CAMISA",
          valor: 150,
          quantidade: 3,
        },
        {
          month: "2026-02",
          tipo: "DESPESA",
          categoria: "CUSTO_OPERACIONAL",
          valor: 120,
          quantidade: null,
        },
      ])
      .mockResolvedValueOnce([
        { month: "2026-01", tipo: "RECEITA", valor: 150 },
        { month: "2026-02", tipo: "DESPESA", valor: 120 },
      ])

    prismaMock.aluno.findMany.mockResolvedValue([
      {
        id: "aluno-1",
        ativo: true,
        professorId: "prof-1",
        createdAt: new Date("2026-01-05T10:00:00Z"),
      },
      {
        id: "aluno-2",
        ativo: false,
        professorId: "prof-1",
        createdAt: new Date("2026-02-10T10:00:00Z"),
      },
    ])

    prismaMock.professor.findMany.mockResolvedValue([
      { id: "prof-1", user: { nome: "Professor Teste" } },
    ])

    prismaMock.leadAttribution.findMany.mockResolvedValue([
      { leadLink: { canal: "Instagram", origem: "Bio", nome: "Campanha IG" } },
      { leadLink: { canal: "Instagram", origem: "Bio", nome: "Campanha IG" } },
    ])

    const FinanceService = await importService()
    const service = new FinanceService()

    const result = await service.getDashboard({
      from: "2026-01",
      to: "2026-02",
    })

    expect(result.totals.receitas).toBe(650)
    expect(result.totals.despesas).toBe(120)
    expect(result.totals.saldo).toBe(530)
    expect(result.totals.renewals.total).toBe(2)
    expect(result.totals.renewals.completo).toBe(1)
    expect(result.totals.renewals.treino).toBe(1)
    expect(result.totals.camisasVendidas).toBe(3)

    expect(result.months).toHaveLength(2)
    expect(result.months[0].saldoAcumulado).toBe(450)
    expect(result.months[1].saldoAcumulado).toBe(530)

    expect(result.projections.baseMonths).toEqual(["2026-01", "2026-02"])
    expect(result.projections.months3).toEqual({
      receitas: 975,
      despesas: 180,
      saldo: 795,
    })
    expect(result.projections.months6).toEqual({
      receitas: 1950,
      despesas: 360,
      saldo: 1590,
    })

    expect(result.systemMetrics.alunos).toEqual({
      total: 2,
      ativos: 1,
      inativos: 1,
    })
    expect(result.systemMetrics.professores[0]).toEqual({
      professorId: "prof-1",
      professorNome: "Professor Teste",
      total: 2,
      ativos: 1,
      inativos: 1,
    })
  })

  it("should block create entry when month is closed", async () => {
    prismaMock.financeMonth.upsert.mockResolvedValue({
      status: "FECHADO",
    })

    const FinanceService = await importService()
    const service = new FinanceService()

    await expect(
      service.createEntry("admin-1", {
        tipo: "RECEITA",
        categoria: "YOUTUBE",
        valor: 500,
        dataLancamento: new Date("2026-03-05T10:00:00Z"),
      }),
    ).rejects.toMatchObject({
      message: "Mês fechado. Reabra o mês para editar registros.",
      statusCode: 409,
    })

    expect(prismaMock.financeEntry.create).not.toHaveBeenCalled()
  })

  it("should return zero projections when there are no closed months", async () => {
    prismaMock.financeMonth.findMany
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])

    prismaMock.financeRenewal.findMany.mockResolvedValueOnce([])
    prismaMock.financeEntry.findMany.mockResolvedValueOnce([])
    prismaMock.aluno.findMany.mockResolvedValue([])
    prismaMock.professor.findMany.mockResolvedValue([])
    prismaMock.leadAttribution.findMany.mockResolvedValue([])

    const FinanceService = await importService()
    const service = new FinanceService()

    const result = await service.getDashboard({
      from: "2026-01",
      to: "2026-01",
    })

    expect(result.projections.baseMonths).toEqual([])
    expect(result.projections.months3).toEqual({
      receitas: 0,
      despesas: 0,
      saldo: 0,
    })
    expect(result.projections.months6).toEqual({
      receitas: 0,
      despesas: 0,
      saldo: 0,
    })
  })
})
