import {
  CheckinStatus,
  FinanceEntryCategory,
  FinanceEntryType,
  FinanceMonthStatus,
  FinanceRenewalPlanType,
  GrupamentoMuscular,
  LeadAttributionModel,
  NotificationTipo,
  ObjetivoDieta,
  OrigemAlimento,
  OrigemExercicio,
  PrismaClient,
  SexoBiologico,
  TipoArquivo,
  UserRole,
} from "@prisma/client"
import { createHash } from "node:crypto"
import { hash } from "bcryptjs"

const prisma = new PrismaClient()

const SEED_TAG = "[seed-v2]"
const SEED_SOURCE = "GFORCE_SEED"
const SEED_ASSET_BASE_URL = "https://seed-assets.local.gforce"
const NOW = new Date()

const ADMIN_EMAIL = "admin@gym.com"
const ADMIN_PASSWORD = "admin123"
const ADMIN_REFRESH_TOKEN = "seed-refresh-admin-valid"

const PROFESSOR_PADRAO_EMAIL = "professor.padrao@gym.com"
const PROFESSOR_PADRAO_PASSWORD = "senha_temporaria_123"

const PROFESSOR_EXEMPLO_EMAIL = "professor@gym.com"
const PROFESSOR_EXEMPLO_PASSWORD = "professor123"
const PROFESSOR_EXEMPLO_REFRESH_TOKEN = "seed-refresh-professor-valid"

const PROFESSOR_ESPECIALISTA_EMAIL = "marina.professora@gym.com"
const PROFESSOR_ESPECIALISTA_PASSWORD = "professor123"

const ALUNO_ANA_EMAIL = "ana.aluna@gym.com"
const ALUNO_ANA_PASSWORD = "aluno123"
const ALUNO_ANA_EXPIRED_REFRESH_TOKEN = "seed-refresh-ana-expired"

const ALUNO_BRUNO_EMAIL = "bruno.aluno@gym.com"
const ALUNO_BRUNO_PASSWORD = "aluno123"
const ALUNO_BRUNO_REFRESH_TOKEN = "seed-refresh-bruno-valid"
const ALUNO_BRUNO_REVOKED_REFRESH_TOKEN = "seed-refresh-bruno-revoked"

const ALUNO_CARLA_EMAIL = "carla.aluna@gym.com"
const ALUNO_CARLA_PASSWORD = "aluno123"

const ALUNO_DIEGO_EMAIL = "diego.aluno@gym.com"
const ALUNO_DIEGO_PASSWORD = "aluno123"

const SEED_TREINO_PLAN_NAMES = [
  "Treino Base Forca e Hipertrofia",
  "Treino anterior - adaptacao geral",
  "Treino Ana - Condicionamento e Gluteos",
]

const SEED_DIETA_PLAN_NAMES = [
  "Plano Alimentar Base - Definicao",
  "Plano anterior - ajuste calorico",
  "Plano Ana - Reposicao e Energia",
]

const SEED_TREINO_MODELO_NAMES = [
  "Molde Hipertrofia A/B",
  "Molde Condicionamento Express",
]

const round2 = (value: number) => Math.round(value * 100) / 100

const buildSeedText = (text: string) => `${SEED_TAG} ${text}`

const toDateOnly = (date: Date) =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate())

const daysAgo = (days: number, hour = 9) =>
  new Date(
    NOW.getFullYear(),
    NOW.getMonth(),
    NOW.getDate() - days,
    hour,
    0,
    0,
    0,
  )

const daysFromNow = (days: number, hour = 9) =>
  new Date(
    NOW.getFullYear(),
    NOW.getMonth(),
    NOW.getDate() + days,
    hour,
    0,
    0,
    0,
  )

const monthDate = (offset: number, day = 10, hour = 12) =>
  new Date(NOW.getFullYear(), NOW.getMonth() + offset, day, hour, 0, 0, 0)

const lastMonthSameDay = (hour = 9) => {
  const date = new Date(NOW)
  date.setMonth(date.getMonth() - 1)
  date.setHours(hour, 0, 0, 0)
  return date
}

const dateToMonth = (date: Date) => {
  const year = date.getUTCFullYear()
  const month = String(date.getUTCMonth() + 1).padStart(2, "0")
  return `${year}-${month}`
}

const hashSeedRefreshToken = (token: string) =>
  createHash("sha256").update(token).digest("hex")

function assertExists<T>(value: T | null | undefined, message: string): T {
  if (value === null || value === undefined) {
    throw new Error(message)
  }

  return value
}

function macrosByGrams(
  alimento: {
    calorias100g: number
    proteinas100g: number
    carboidratos100g: number
    gorduras100g: number
    fibras100g: number | null
  },
  grams: number,
) {
  const factor = grams / 100

  return {
    calorias: round2(alimento.calorias100g * factor),
    proteinas: round2(alimento.proteinas100g * factor),
    carboidratos: round2(alimento.carboidratos100g * factor),
    gorduras: round2(alimento.gorduras100g * factor),
    fibras: alimento.fibras100g === null ? null : round2(alimento.fibras100g * factor),
  }
}

async function upsertUser(params: {
  email: string
  nome: string
  role: UserRole
  plainPassword: string
}) {
  const password = await hash(params.plainPassword, 10)

  return prisma.user.upsert({
    where: { email: params.email },
    create: {
      email: params.email,
      nome: params.nome,
      role: params.role,
      password,
    },
    update: {
      nome: params.nome,
      role: params.role,
      password,
    },
  })
}

async function upsertProfessor(params: {
  userId: string
  telefone?: string | null
  especialidade?: string | null
  isPadrao: boolean
}) {
  return prisma.professor.upsert({
    where: { userId: params.userId },
    create: {
      userId: params.userId,
      telefone: params.telefone ?? null,
      especialidade: params.especialidade ?? null,
      isPadrao: params.isPadrao,
    },
    update: {
      telefone: params.telefone ?? null,
      especialidade: params.especialidade ?? null,
      isPadrao: params.isPadrao,
    },
  })
}

async function upsertAluno(params: {
  userId: string
  professorId: string
  ativo: boolean
  createdAt: Date
  sexoBiologico: SexoBiologico | null
  telefone: string | null
  alturaCm: number | null
  pesoKg: number | null
  idade: number | null
  cinturaCm: number | null
  quadrilCm: number | null
  pescocoCm: number | null
  diasTreinoSemana: number | null
  objetivosAtuais: string | null
  tomaRemedio: boolean | null
  remediosUso?: string | null
  alimentosQuerDiario: string[]
  alimentosNaoComem: string[]
  alergiasAlimentares: string[]
  doresArticulares?: string | null
  suplementosConsumidos: string[]
  frequenciaHorariosRefeicoes?: string | null
}) {
  return prisma.aluno.upsert({
    where: { userId: params.userId },
    create: {
      userId: params.userId,
      professorId: params.professorId,
      ativo: params.ativo,
      sexoBiologico: params.sexoBiologico,
      telefone: params.telefone,
      alturaCm: params.alturaCm,
      pesoKg: params.pesoKg,
      idade: params.idade,
      cinturaCm: params.cinturaCm,
      quadrilCm: params.quadrilCm,
      pescocoCm: params.pescocoCm,
      dias_treino_semana: params.diasTreinoSemana,
      objetivos_atuais: params.objetivosAtuais,
      toma_remedio: params.tomaRemedio,
      remedios_uso: params.remediosUso ?? null,
      alimentos_quer_diario: params.alimentosQuerDiario,
      alimentos_nao_comem: params.alimentosNaoComem,
      alergias_alimentares: params.alergiasAlimentares,
      dores_articulares: params.doresArticulares ?? null,
      suplementos_consumidos: params.suplementosConsumidos,
      frequencia_horarios_refeicoes: params.frequenciaHorariosRefeicoes ?? null,
      createdAt: params.createdAt,
    },
    update: {
      professorId: params.professorId,
      ativo: params.ativo,
      sexoBiologico: params.sexoBiologico,
      telefone: params.telefone,
      alturaCm: params.alturaCm,
      pesoKg: params.pesoKg,
      idade: params.idade,
      cinturaCm: params.cinturaCm,
      quadrilCm: params.quadrilCm,
      pescocoCm: params.pescocoCm,
      dias_treino_semana: params.diasTreinoSemana,
      objetivos_atuais: params.objetivosAtuais,
      toma_remedio: params.tomaRemedio,
      remedios_uso: params.remediosUso ?? null,
      alimentos_quer_diario: params.alimentosQuerDiario,
      alimentos_nao_comem: params.alimentosNaoComem,
      alergias_alimentares: params.alergiasAlimentares,
      dores_articulares: params.doresArticulares ?? null,
      suplementos_consumidos: params.suplementosConsumidos,
      frequencia_horarios_refeicoes: params.frequenciaHorariosRefeicoes ?? null,
      createdAt: params.createdAt,
    },
  })
}

async function upsertInviteCode(params: {
  code: string
  role: UserRole
  createdBy: string
  expiresAt?: Date | null
  usedBy?: string | null
  usedAt?: Date | null
}) {
  return prisma.inviteCode.upsert({
    where: { code: params.code },
    create: {
      code: params.code,
      role: params.role,
      createdBy: params.createdBy,
      expiresAt: params.expiresAt ?? null,
      usedBy: params.usedBy ?? null,
      usedAt: params.usedAt ?? null,
    },
    update: {
      role: params.role,
      createdBy: params.createdBy,
      expiresAt: params.expiresAt ?? null,
      usedBy: params.usedBy ?? null,
      usedAt: params.usedAt ?? null,
    },
  })
}

async function upsertExercicio(params: {
  nome: string
  descricao?: string | null
  grupamentoMuscular: GrupamentoMuscular
  origem: OrigemExercicio
  externalId: string
  externalSource?: string
  professorId?: string | null
  executionGifUrl?: string | null
  executionGifPublicId?: string | null
  equipmentImageUrl?: string | null
  equipmentImagePublicId?: string | null
}) {
  const externalSource = params.externalSource ?? SEED_SOURCE

  return prisma.exercicio.upsert({
    where: {
      origem_externalSource_externalId: {
        origem: params.origem,
        externalSource,
        externalId: params.externalId,
      },
    },
    create: {
      nome: params.nome,
      descricao: params.descricao ?? null,
      grupamentoMuscular: params.grupamentoMuscular,
      origem: params.origem,
      externalSource,
      externalId: params.externalId,
      professorId: params.professorId ?? null,
      executionGifUrl: params.executionGifUrl ?? null,
      executionGifPublicId: params.executionGifPublicId ?? null,
      equipmentImageUrl: params.equipmentImageUrl ?? null,
      equipmentImagePublicId: params.equipmentImagePublicId ?? null,
    },
    update: {
      nome: params.nome,
      descricao: params.descricao ?? null,
      grupamentoMuscular: params.grupamentoMuscular,
      professorId: params.professorId ?? null,
      executionGifUrl: params.executionGifUrl ?? null,
      executionGifPublicId: params.executionGifPublicId ?? null,
      equipmentImageUrl: params.equipmentImageUrl ?? null,
      equipmentImagePublicId: params.equipmentImagePublicId ?? null,
    },
  })
}

async function upsertAlimento(params: {
  nome: string
  descricao?: string | null
  origem: OrigemAlimento
  externalId: string
  fonteExterna?: string
  professorId?: string | null
  calorias100g: number
  proteinas100g: number
  carboidratos100g: number
  gorduras100g: number
  fibras100g?: number | null
}) {
  const fonteExterna = params.fonteExterna ?? SEED_SOURCE

  return prisma.alimento.upsert({
    where: {
      fonteExterna_externalId: {
        fonteExterna,
        externalId: params.externalId,
      },
    },
    create: {
      nome: params.nome,
      descricao: params.descricao ?? null,
      origem: params.origem,
      fonteExterna,
      externalId: params.externalId,
      professorId: params.professorId ?? null,
      calorias100g: params.calorias100g,
      proteinas100g: params.proteinas100g,
      carboidratos100g: params.carboidratos100g,
      gorduras100g: params.gorduras100g,
      fibras100g: params.fibras100g ?? null,
    },
    update: {
      nome: params.nome,
      descricao: params.descricao ?? null,
      origem: params.origem,
      professorId: params.professorId ?? null,
      calorias100g: params.calorias100g,
      proteinas100g: params.proteinas100g,
      carboidratos100g: params.carboidratos100g,
      gorduras100g: params.gorduras100g,
      fibras100g: params.fibras100g ?? null,
    },
  })
}

async function resetSeedScenarioData(params: {
  adminUserId: string
  seedUserIds: string[]
  seedAlunoIds: string[]
  seedProfessorIds: string[]
}) {
  await prisma.refreshSession.deleteMany({
    where: {
      userId: {
        in: params.seedUserIds,
      },
    },
  })

  await prisma.fotoShape.deleteMany({
    where: {
      alunoId: {
        in: params.seedAlunoIds,
      },
      publicId: {
        startsWith: "seed/",
      },
    },
  })

  await prisma.arquivoAluno.deleteMany({
    where: {
      alunoId: {
        in: params.seedAlunoIds,
      },
      publicId: {
        startsWith: "seed/",
      },
    },
  })

  await prisma.alunoHistorico.deleteMany({
    where: {
      alunoId: {
        in: params.seedAlunoIds,
      },
      observacoes: {
        startsWith: SEED_TAG,
      },
    },
  })

  await prisma.planoTreino.deleteMany({
    where: {
      alunoId: {
        in: params.seedAlunoIds,
      },
      nome: {
        in: SEED_TREINO_PLAN_NAMES,
      },
    },
  })

  await prisma.planoDieta.deleteMany({
    where: {
      alunoId: {
        in: params.seedAlunoIds,
      },
      nome: {
        in: SEED_DIETA_PLAN_NAMES,
      },
    },
  })

  await prisma.treinoModelo.deleteMany({
    where: {
      professorId: {
        in: params.seedProfessorIds,
      },
      nome: {
        in: SEED_TREINO_MODELO_NAMES,
      },
    },
  })

  await prisma.financeRenewal.deleteMany({
    where: {
      createdBy: params.adminUserId,
      observacao: {
        startsWith: SEED_TAG,
      },
    },
  })

  await prisma.financeEntry.deleteMany({
    where: {
      createdBy: params.adminUserId,
      descricao: {
        startsWith: SEED_TAG,
      },
    },
  })

  await prisma.leadClickEvent.deleteMany({
    where: {
      fingerprint: {
        startsWith: "seed-fp-",
      },
    },
  })
}

async function ensureInviteCodes(params: {
  adminUserId: string
  usedProfessorUserId?: string
}) {
  await upsertInviteCode({
    code: "PROF-BOOTSTRAP-2026",
    role: UserRole.PROFESSOR,
    createdBy: params.adminUserId,
    expiresAt: daysFromNow(365),
  })

  await upsertInviteCode({
    code: "ADMIN-BOOTSTRAP-2026",
    role: UserRole.ADMIN,
    createdBy: params.adminUserId,
    expiresAt: daysFromNow(365),
  })

  if (!params.usedProfessorUserId) {
    return
  }

  await upsertInviteCode({
    code: "PROF-USADO-2026",
    role: UserRole.PROFESSOR,
    createdBy: params.adminUserId,
    expiresAt: daysFromNow(120),
    usedBy: params.usedProfessorUserId,
    usedAt: daysAgo(20),
  })

  await upsertInviteCode({
    code: "PROF-EXPIRADO-2026",
    role: UserRole.PROFESSOR,
    createdBy: params.adminUserId,
    expiresAt: daysAgo(10),
  })
}

async function ensureRefreshSessions(params: {
  adminUserId: string
  professorUserId: string
  alunoAnaUserId: string
  alunoBrunoUserId: string
}) {
  await prisma.refreshSession.createMany({
    data: [
      {
        userId: params.adminUserId,
        tokenHash: hashSeedRefreshToken(ADMIN_REFRESH_TOKEN),
        expiresAt: daysFromNow(20),
      },
      {
        userId: params.professorUserId,
        tokenHash: hashSeedRefreshToken(PROFESSOR_EXEMPLO_REFRESH_TOKEN),
        expiresAt: daysFromNow(20),
      },
      {
        userId: params.alunoBrunoUserId,
        tokenHash: hashSeedRefreshToken(ALUNO_BRUNO_REFRESH_TOKEN),
        expiresAt: daysFromNow(14),
      },
      {
        userId: params.alunoBrunoUserId,
        tokenHash: hashSeedRefreshToken(ALUNO_BRUNO_REVOKED_REFRESH_TOKEN),
        expiresAt: daysFromNow(5),
        revokedAt: daysAgo(1),
      },
      {
        userId: params.alunoAnaUserId,
        tokenHash: hashSeedRefreshToken(ALUNO_ANA_EXPIRED_REFRESH_TOKEN),
        expiresAt: daysAgo(2),
      },
    ],
  })
}

async function ensureHistoricos(params: {
  adminUserId: string
  alunoAnaId: string
  alunoBrunoId: string
  alunoCarlaId: string
}) {
  const seedHistoricos: Array<{
    alunoId: string
    dataRegistro: Date
    pesoKg: number
    alturaCm: number
    cinturaCm: number
    quadrilCm: number
    pescocoCm: number
    bracoEsquerdoCm: number
    bracoDireitoCm: number
    pernaEsquerdaCm: number
    pernaDireitaCm: number
    percentualGordura: number
    massaMuscularKg: number
    observacoes: string
  }> = [
    {
      alunoId: params.alunoAnaId,
      dataRegistro: monthDate(-4, 8),
      pesoKg: 69.4,
      alturaCm: 166,
      cinturaCm: 81,
      quadrilCm: 103,
      pescocoCm: 33,
      bracoEsquerdoCm: 29.1,
      bracoDireitoCm: 29.4,
      pernaEsquerdaCm: 57.2,
      pernaDireitaCm: 57.5,
      percentualGordura: 29.4,
      massaMuscularKg: 49.0,
      observacoes: buildSeedText("Ana inicio do acompanhamento"),
    },
    {
      alunoId: params.alunoAnaId,
      dataRegistro: monthDate(-2, 12),
      pesoKg: 67.9,
      alturaCm: 166,
      cinturaCm: 79,
      quadrilCm: 102,
      pescocoCm: 33,
      bracoEsquerdoCm: 29.7,
      bracoDireitoCm: 30.0,
      pernaEsquerdaCm: 57.8,
      pernaDireitaCm: 58.0,
      percentualGordura: 27.8,
      massaMuscularKg: 49.9,
      observacoes: buildSeedText("Ana progresso de definicao e consistencia"),
    },
    {
      alunoId: params.alunoAnaId,
      dataRegistro: lastMonthSameDay(),
      pesoKg: 66.8,
      alturaCm: 166,
      cinturaCm: 77,
      quadrilCm: 101,
      pescocoCm: 33,
      bracoEsquerdoCm: 30.0,
      bracoDireitoCm: 30.2,
      pernaEsquerdaCm: 58.1,
      pernaDireitaCm: 58.2,
      percentualGordura: 26.3,
      massaMuscularKg: 50.5,
      observacoes: buildSeedText("Ana ultima reavaliacao elegivel para lembrete mensal"),
    },
    {
      alunoId: params.alunoBrunoId,
      dataRegistro: monthDate(-5, 10),
      pesoKg: 84.8,
      alturaCm: 178,
      cinturaCm: 95,
      quadrilCm: 101,
      pescocoCm: 39,
      bracoEsquerdoCm: 35.0,
      bracoDireitoCm: 35.3,
      pernaEsquerdaCm: 55.0,
      pernaDireitaCm: 55.2,
      percentualGordura: 23.8,
      massaMuscularKg: 59.5,
      observacoes: buildSeedText("Bruno ponto de partida"),
    },
    {
      alunoId: params.alunoBrunoId,
      dataRegistro: monthDate(-4, 10),
      pesoKg: 83.7,
      alturaCm: 178,
      cinturaCm: 93,
      quadrilCm: 101,
      pescocoCm: 39,
      bracoEsquerdoCm: 35.3,
      bracoDireitoCm: 35.6,
      pernaEsquerdaCm: 55.4,
      pernaDireitaCm: 55.6,
      percentualGordura: 22.8,
      massaMuscularKg: 60.0,
      observacoes: buildSeedText("Bruno subida inicial de massa magra"),
    },
    {
      alunoId: params.alunoBrunoId,
      dataRegistro: monthDate(-3, 10),
      pesoKg: 82.9,
      alturaCm: 178,
      cinturaCm: 92,
      quadrilCm: 100,
      pescocoCm: 39,
      bracoEsquerdoCm: 35.6,
      bracoDireitoCm: 35.9,
      pernaEsquerdaCm: 55.7,
      pernaDireitaCm: 55.8,
      percentualGordura: 21.9,
      massaMuscularKg: 60.6,
      observacoes: buildSeedText("Bruno consolidacao de ritmo"),
    },
    {
      alunoId: params.alunoBrunoId,
      dataRegistro: monthDate(-2, 10),
      pesoKg: 82.4,
      alturaCm: 178,
      cinturaCm: 91,
      quadrilCm: 100,
      pescocoCm: 39,
      bracoEsquerdoCm: 35.9,
      bracoDireitoCm: 36.1,
      pernaEsquerdaCm: 56.0,
      pernaDireitaCm: 56.1,
      percentualGordura: 21.5,
      massaMuscularKg: 60.8,
      observacoes: buildSeedText("Bruno leve estagnacao de peso com melhora de composicao"),
    },
    {
      alunoId: params.alunoBrunoId,
      dataRegistro: monthDate(-1, 10),
      pesoKg: 82.2,
      alturaCm: 178,
      cinturaCm: 90,
      quadrilCm: 100,
      pescocoCm: 39,
      bracoEsquerdoCm: 36.0,
      bracoDireitoCm: 36.2,
      pernaEsquerdaCm: 56.1,
      pernaDireitaCm: 56.3,
      percentualGordura: 21.1,
      massaMuscularKg: 61.0,
      observacoes: buildSeedText("Bruno melhor fase recente"),
    },
    {
      alunoId: params.alunoCarlaId,
      dataRegistro: monthDate(-5, 5),
      pesoKg: 72.0,
      alturaCm: 170,
      cinturaCm: 84,
      quadrilCm: 105,
      pescocoCm: 34,
      bracoEsquerdoCm: 30.4,
      bracoDireitoCm: 30.6,
      pernaEsquerdaCm: 58.0,
      pernaDireitaCm: 58.1,
      percentualGordura: 30.8,
      massaMuscularKg: 49.8,
      observacoes: buildSeedText("Carla historico antigo antes de pausar"),
    },
    {
      alunoId: params.alunoCarlaId,
      dataRegistro: monthDate(-3, 5),
      pesoKg: 71.8,
      alturaCm: 170,
      cinturaCm: 84,
      quadrilCm: 105,
      pescocoCm: 34,
      bracoEsquerdoCm: 30.2,
      bracoDireitoCm: 30.4,
      pernaEsquerdaCm: 57.9,
      pernaDireitaCm: 58.0,
      percentualGordura: 30.7,
      massaMuscularKg: 49.7,
      observacoes: buildSeedText("Carla sem evolucao relevante no periodo final"),
    },
  ]

  for (const historico of seedHistoricos) {
    await prisma.alunoHistorico.create({
      data: {
        alunoId: historico.alunoId,
        registradoPor: params.adminUserId,
        dataRegistro: historico.dataRegistro,
        pesoKg: historico.pesoKg,
        alturaCm: historico.alturaCm,
        cinturaCm: historico.cinturaCm,
        quadrilCm: historico.quadrilCm,
        pescocoCm: historico.pescocoCm,
        bracoEsquerdoCm: historico.bracoEsquerdoCm,
        bracoDireitoCm: historico.bracoDireitoCm,
        pernaEsquerdaCm: historico.pernaEsquerdaCm,
        pernaDireitaCm: historico.pernaDireitaCm,
        percentualGordura: historico.percentualGordura,
        massaMuscularKg: historico.massaMuscularKg,
        observacoes: historico.observacoes,
      },
    })
  }
}

async function ensureNotificationDispatches(params: {
  alunoAnaId: string
  alunoBrunoId: string
}) {
  const dispatches = [
    {
      alunoId: params.alunoAnaId,
      tipo: NotificationTipo.REAVALIACAO,
      referenceDate: toDateOnly(NOW),
    },
    {
      alunoId: params.alunoBrunoId,
      tipo: NotificationTipo.FOTO_SEXTA_LEMBRETE,
      referenceDate: toDateOnly(NOW),
    },
    {
      alunoId: params.alunoAnaId,
      tipo: NotificationTipo.FOTO_SEXTA_LEMBRETE,
      referenceDate: toDateOnly(daysAgo(7)),
    },
  ]

  for (const dispatch of dispatches) {
    await prisma.notificationDispatch.upsert({
      where: {
        alunoId_tipo_referenceDate: {
          alunoId: dispatch.alunoId,
          tipo: dispatch.tipo,
          referenceDate: dispatch.referenceDate,
        },
      },
      create: dispatch,
      update: dispatch,
    })
  }
}

async function ensureFotosShape(params: {
  alunoAnaId: string
  alunoBrunoId: string
}) {
  await prisma.fotoShape.createMany({
    data: [
      {
        alunoId: params.alunoAnaId,
        url: `${SEED_ASSET_BASE_URL}/fotos/ana-frontal.jpg`,
        publicId: "seed/fotos-shape/ana-frontal",
        descricao: "Frontal - semana atual",
        createdAt: daysAgo(2, 8),
      },
      {
        alunoId: params.alunoAnaId,
        url: `${SEED_ASSET_BASE_URL}/fotos/ana-lateral.jpg`,
        publicId: "seed/fotos-shape/ana-lateral",
        descricao: "Lateral - comparativo mensal",
        createdAt: daysAgo(2, 8),
      },
      {
        alunoId: params.alunoBrunoId,
        url: `${SEED_ASSET_BASE_URL}/fotos/bruno-frontal.jpg`,
        publicId: "seed/fotos-shape/bruno-frontal",
        descricao: "Frontal - pos treino",
        createdAt: daysAgo(6, 8),
      },
      {
        alunoId: params.alunoBrunoId,
        url: `${SEED_ASSET_BASE_URL}/fotos/bruno-costas.jpg`,
        publicId: "seed/fotos-shape/bruno-costas",
        descricao: "Costas - foco em dorsal",
        createdAt: daysAgo(6, 8),
      },
      {
        alunoId: params.alunoBrunoId,
        url: `${SEED_ASSET_BASE_URL}/fotos/bruno-lateral.jpg`,
        publicId: "seed/fotos-shape/bruno-lateral",
        descricao: "Lateral - comparativo composicao",
        createdAt: daysAgo(6, 8),
      },
    ],
  })
}

async function ensureArquivosAluno(params: {
  professorId: string
  alunoAnaId: string
  alunoBrunoId: string
}) {
  await prisma.arquivoAluno.createMany({
    data: [
      {
        alunoId: params.alunoAnaId,
        professorId: params.professorId,
        tipo: TipoArquivo.TREINO,
        titulo: "Treino funcional semanal",
        descricao: buildSeedText("arquivo de treino para acompanhamento da Ana"),
        url: `${SEED_ASSET_BASE_URL}/arquivos/ana-treino.pdf`,
        publicId: "seed/arquivos-aluno/ana-treino",
        createdAt: daysAgo(3, 10),
      },
      {
        alunoId: params.alunoAnaId,
        professorId: params.professorId,
        tipo: TipoArquivo.DIETA,
        titulo: "Guia de lanches praticos",
        descricao: buildSeedText("arquivo de dieta para rotina corrida"),
        url: `${SEED_ASSET_BASE_URL}/arquivos/ana-dieta.pdf`,
        publicId: "seed/arquivos-aluno/ana-dieta",
        createdAt: daysAgo(3, 10),
      },
      {
        alunoId: params.alunoBrunoId,
        professorId: params.professorId,
        tipo: TipoArquivo.TREINO,
        titulo: "Treino ABC com progressao",
        descricao: buildSeedText("arquivo de treino principal do Bruno"),
        url: `${SEED_ASSET_BASE_URL}/arquivos/bruno-treino.pdf`,
        publicId: "seed/arquivos-aluno/bruno-treino",
        createdAt: daysAgo(8, 10),
      },
      {
        alunoId: params.alunoBrunoId,
        professorId: params.professorId,
        tipo: TipoArquivo.DIETA,
        titulo: "Plano alimentar de definicao",
        descricao: buildSeedText("arquivo de dieta principal do Bruno"),
        url: `${SEED_ASSET_BASE_URL}/arquivos/bruno-dieta.pdf`,
        publicId: "seed/arquivos-aluno/bruno-dieta",
        createdAt: daysAgo(8, 10),
      },
    ],
  })
}

async function ensureExercicios(params: {
  professorExemploId: string
  professorEspecialistaId: string
}) {
  const supinoReto = await upsertExercicio({
    nome: "Supino Reto com Barra",
    descricao: "Foco em peitoral, ombro anterior e triceps.",
    grupamentoMuscular: GrupamentoMuscular.PEITO,
    origem: OrigemExercicio.SISTEMA,
    externalId: "sys-supino-reto",
    executionGifUrl: `${SEED_ASSET_BASE_URL}/exercicios/supino-reto.gif`,
    executionGifPublicId: "seed/exercicios/supino-reto-gif",
    equipmentImageUrl: `${SEED_ASSET_BASE_URL}/equipamentos/barra-reta.jpg`,
    equipmentImagePublicId: "seed/equipamentos/barra-reta",
  })

  const remadaCurvada = await upsertExercicio({
    nome: "Remada Curvada",
    descricao: "Trabalho de dorsal e estabilidade lombar.",
    grupamentoMuscular: GrupamentoMuscular.COSTAS,
    origem: OrigemExercicio.SISTEMA,
    externalId: "sys-remada-curvada",
  })

  const desenvolvimentoOmbro = await upsertExercicio({
    nome: "Desenvolvimento com Halteres",
    descricao: "Controle de descida e bloqueio no topo.",
    grupamentoMuscular: GrupamentoMuscular.OMBRO,
    origem: OrigemExercicio.SISTEMA,
    externalId: "sys-desenvolvimento-halteres",
  })

  const pranchaAbdominal = await upsertExercicio({
    nome: "Prancha Abdominal",
    descricao: "Estabilidade de core com respiracao controlada.",
    grupamentoMuscular: GrupamentoMuscular.ABDOMEN,
    origem: OrigemExercicio.SISTEMA,
    externalId: "sys-prancha-abdominal",
  })

  const bicicleta = await upsertExercicio({
    nome: "Bicicleta Ergometrica",
    descricao: "Cardio moderado com foco em recuperacao ativa.",
    grupamentoMuscular: GrupamentoMuscular.CARDIO,
    origem: OrigemExercicio.SISTEMA,
    externalId: "sys-bicicleta-ergometrica",
    equipmentImageUrl: `${SEED_ASSET_BASE_URL}/equipamentos/bike.jpg`,
    equipmentImagePublicId: "seed/equipamentos/bike",
  })

  const agachamentoLivre = await upsertExercicio({
    nome: "Agachamento Livre",
    descricao: "Priorizar amplitude segura e estabilidade.",
    grupamentoMuscular: GrupamentoMuscular.PERNAS,
    origem: OrigemExercicio.PROFESSOR,
    professorId: params.professorExemploId,
    externalId: "prof-agachamento-livre",
  })

  const levantamentoTerra = await upsertExercicio({
    nome: "Levantamento Terra",
    descricao: "Concentrar em travar escápulas antes da subida.",
    grupamentoMuscular: GrupamentoMuscular.COSTAS,
    origem: OrigemExercicio.PROFESSOR,
    professorId: params.professorExemploId,
    externalId: "prof-levantamento-terra",
  })

  const cadeiraExtensora = await upsertExercicio({
    nome: "Cadeira Extensora",
    descricao: "Pausa isometrica de 1 segundo no topo.",
    grupamentoMuscular: GrupamentoMuscular.PERNAS,
    origem: OrigemExercicio.PROFESSOR,
    professorId: params.professorExemploId,
    externalId: "prof-cadeira-extensora",
    executionGifUrl: `${SEED_ASSET_BASE_URL}/exercicios/cadeira-extensora.gif`,
    executionGifPublicId: "seed/exercicios/cadeira-extensora-gif",
  })

  const gluteBridge = await upsertExercicio({
    nome: "Glute Bridge com Mini Band",
    descricao: "Ativacao de gluteos e estabilidade de quadril.",
    grupamentoMuscular: GrupamentoMuscular.GLUTEOS,
    origem: OrigemExercicio.PROFESSOR,
    professorId: params.professorEspecialistaId,
    externalId: "prof-glute-bridge",
  })

  const legPress = await upsertExercicio({
    nome: "Leg Press 45",
    descricao: "Exercicio importado de fonte externa para testes locais.",
    grupamentoMuscular: GrupamentoMuscular.PERNAS,
    origem: OrigemExercicio.EXTERNO,
    externalSource: "HEVY",
    externalId: "hevy-leg-press-45",
  })

  return {
    supinoReto,
    remadaCurvada,
    desenvolvimentoOmbro,
    pranchaAbdominal,
    bicicleta,
    agachamentoLivre,
    levantamentoTerra,
    cadeiraExtensora,
    gluteBridge,
    legPress,
  }
}

async function ensureAlimentos(params: { professorExemploId: string }) {
  const arroz = await upsertAlimento({
    nome: "Arroz branco cozido",
    descricao: "Base de refeicao principal.",
    origem: OrigemAlimento.EXTERNO,
    fonteExterna: "TACO",
    externalId: "taco-arroz-branco",
    calorias100g: 128,
    proteinas100g: 2.5,
    carboidratos100g: 28.1,
    gorduras100g: 0.2,
    fibras100g: 1.6,
  })

  const feijao = await upsertAlimento({
    nome: "Feijao carioca cozido",
    descricao: "Fonte de carboidrato e fibras.",
    origem: OrigemAlimento.EXTERNO,
    fonteExterna: "TACO",
    externalId: "taco-feijao-carioca",
    calorias100g: 76,
    proteinas100g: 4.8,
    carboidratos100g: 13.6,
    gorduras100g: 0.5,
    fibras100g: 8.5,
  })

  const frango = await upsertAlimento({
    nome: "Peito de frango grelhado",
    descricao: "Proteina magra para almoco e jantar.",
    origem: OrigemAlimento.EXTERNO,
    fonteExterna: "TACO",
    externalId: "taco-frango-grelhado",
    calorias100g: 159,
    proteinas100g: 32,
    carboidratos100g: 0,
    gorduras100g: 2.5,
    fibras100g: 0,
  })

  const banana = await upsertAlimento({
    nome: "Banana prata",
    descricao: "Fruta simples para pre treino e cafe da manha.",
    origem: OrigemAlimento.EXTERNO,
    fonteExterna: "TACO",
    externalId: "taco-banana-prata",
    calorias100g: 98,
    proteinas100g: 1.3,
    carboidratos100g: 26,
    gorduras100g: 0.1,
    fibras100g: 2,
  })

  const aveia = await upsertAlimento({
    nome: "Aveia em flocos",
    descricao: "Alimento do sistema usado em cafes e lanches.",
    origem: OrigemAlimento.SISTEMA,
    fonteExterna: SEED_SOURCE,
    externalId: "sys-aveia-flocos",
    calorias100g: 394,
    proteinas100g: 13.9,
    carboidratos100g: 66.6,
    gorduras100g: 8.5,
    fibras100g: 9.1,
  })

  const ovo = await upsertAlimento({
    nome: "Ovo cozido",
    descricao: "Proteina pratica para cafe da manha.",
    origem: OrigemAlimento.EXTERNO,
    fonteExterna: "USDA",
    externalId: "usda-ovo-cozido",
    calorias100g: 146,
    proteinas100g: 13.3,
    carboidratos100g: 0.6,
    gorduras100g: 9.5,
    fibras100g: 0,
  })

  const iogurte = await upsertAlimento({
    nome: "Iogurte natural integral",
    descricao: "Base de lanche leve.",
    origem: OrigemAlimento.EXTERNO,
    fonteExterna: "USDA",
    externalId: "usda-iogurte-natural",
    calorias100g: 61,
    proteinas100g: 3.5,
    carboidratos100g: 4.7,
    gorduras100g: 3.3,
    fibras100g: 0,
  })

  const batataDoce = await upsertAlimento({
    nome: "Batata doce cozida",
    descricao: "Carboidrato de uso frequente no pos treino.",
    origem: OrigemAlimento.EXTERNO,
    fonteExterna: "TACO",
    externalId: "taco-batata-doce",
    calorias100g: 77,
    proteinas100g: 0.6,
    carboidratos100g: 18.4,
    gorduras100g: 0.1,
    fibras100g: 2.2,
  })

  const azeite = await upsertAlimento({
    nome: "Azeite de oliva",
    descricao: "Gordura boa para ajuste de macro.",
    origem: OrigemAlimento.SISTEMA,
    fonteExterna: SEED_SOURCE,
    externalId: "sys-azeite-oliva",
    calorias100g: 884,
    proteinas100g: 0,
    carboidratos100g: 0,
    gorduras100g: 100,
    fibras100g: 0,
  })

  const pastaAmendoim = await upsertAlimento({
    nome: "Pasta de amendoim artesanal",
    descricao: "Alimento criado pelo professor para variacao de lanche.",
    origem: OrigemAlimento.PROFESSOR,
    fonteExterna: "SEED_PROFESSOR",
    externalId: "prof-pasta-amendoim",
    professorId: params.professorExemploId,
    calorias100g: 588,
    proteinas100g: 25,
    carboidratos100g: 20,
    gorduras100g: 50,
    fibras100g: 6,
  })

  return {
    arroz,
    feijao,
    frango,
    banana,
    aveia,
    ovo,
    iogurte,
    batataDoce,
    azeite,
    pastaAmendoim,
  }
}

async function ensureTreinoModelos(params: {
  professorId: string
  exercicios: Awaited<ReturnType<typeof ensureExercicios>>
}) {
  await prisma.treinoModelo.create({
    data: {
      professorId: params.professorId,
      nome: "Molde Hipertrofia A/B",
      observacoes: buildSeedText("molde principal para copiar e adaptar"),
      dias: {
        create: [
          {
            titulo: "Dia A - Peito e Costas",
            ordem: 1,
            diaSemana: 1,
            metodo: "Carga progressiva",
            exercicios: {
              create: [
                {
                  exercicioId: params.exercicios.supinoReto.id,
                  ordem: 1,
                  series: 4,
                  repeticoes: "8-10",
                  cargaSugerida: 62.5,
                },
                {
                  exercicioId: params.exercicios.remadaCurvada.id,
                  ordem: 2,
                  series: 4,
                  repeticoes: "8-10",
                  cargaSugerida: 52,
                },
                {
                  exercicioId: params.exercicios.desenvolvimentoOmbro.id,
                  ordem: 3,
                  series: 3,
                  repeticoes: "10-12",
                  cargaSugerida: 24,
                },
              ],
            },
          },
          {
            titulo: "Dia B - Pernas",
            ordem: 2,
            diaSemana: 4,
            metodo: "Cadencia 2-0-2",
            exercicios: {
              create: [
                {
                  exercicioId: params.exercicios.agachamentoLivre.id,
                  ordem: 1,
                  series: 4,
                  repeticoes: "6-8",
                  cargaSugerida: 82,
                },
                {
                  exercicioId: params.exercicios.legPress.id,
                  ordem: 2,
                  series: 4,
                  repeticoes: "10-12",
                  cargaSugerida: 180,
                },
                {
                  exercicioId: params.exercicios.pranchaAbdominal.id,
                  ordem: 3,
                  series: 3,
                  repeticoes: "45s",
                },
              ],
            },
          },
        ],
      },
    },
  })

  await prisma.treinoModelo.create({
    data: {
      professorId: params.professorId,
      nome: "Molde Condicionamento Express",
      observacoes: buildSeedText("molde rapido para alunos com pouco tempo"),
      dias: {
        create: [
          {
            titulo: "Circuito rapido",
            ordem: 1,
            diaSemana: 6,
            metodo: "Circuito 3 voltas",
            exercicios: {
              create: [
                {
                  exercicioId: params.exercicios.bicicleta.id,
                  ordem: 1,
                  series: 1,
                  repeticoes: "12 min",
                },
                {
                  exercicioId: params.exercicios.gluteBridge.id,
                  ordem: 2,
                  series: 3,
                  repeticoes: "15",
                },
                {
                  exercicioId: params.exercicios.pranchaAbdominal.id,
                  ordem: 3,
                  series: 3,
                  repeticoes: "30s",
                },
              ],
            },
          },
        ],
      },
    },
  })
}

async function createPlanoTreino(params: {
  alunoId: string
  professorId: string
  nome: string
  observacoes: string
  ativo: boolean
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
}) {
  return prisma.planoTreino.create({
    data: {
      alunoId: params.alunoId,
      professorId: params.professorId,
      nome: params.nome,
      observacoes: params.observacoes,
      ativo: params.ativo,
      dias: {
        create: params.dias.map((dia) => ({
          titulo: dia.titulo,
          ordem: dia.ordem,
          diaSemana: dia.diaSemana,
          observacoes: dia.observacoes,
          metodo: dia.metodo,
          exercicios: {
            create: dia.exercicios.map((exercicio) => ({
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
        orderBy: { ordem: "asc" as const },
        include: {
          exercicios: {
            orderBy: { ordem: "asc" as const },
          },
        },
      },
    },
  })
}

async function createTreinoCheckin(params: {
  alunoId: string
  professorId: string
  planoTreinoId: string
  treinoDiaId: string
  status: CheckinStatus
  iniciadoEm: Date
  dataTreino: Date
  finalizadoEm?: Date | null
  comentarioAluno?: string | null
  comentarioProfessor?: string | null
  exercicios: Array<{
    treinoDiaExercicioId: string
    exercicioId: string
    concluido: boolean
    cargaReal?: number | null
    repeticoesReal?: string | null
    comentarioAluno?: string | null
  }>
}) {
  await prisma.treinoCheckin.create({
    data: {
      alunoId: params.alunoId,
      professorId: params.professorId,
      planoTreinoId: params.planoTreinoId,
      treinoDiaId: params.treinoDiaId,
      status: params.status,
      iniciadoEm: params.iniciadoEm,
      dataTreino: params.dataTreino,
      finalizadoEm: params.finalizadoEm ?? null,
      comentarioAluno: params.comentarioAluno ?? null,
      comentarioProfessor: params.comentarioProfessor ?? null,
      exercicios: {
        create: params.exercicios.map((exercicio) => ({
          treinoDiaExercicioId: exercicio.treinoDiaExercicioId,
          exercicioId: exercicio.exercicioId,
          concluido: exercicio.concluido,
          cargaReal: exercicio.cargaReal ?? null,
          repeticoesReal: exercicio.repeticoesReal ?? null,
          comentarioAluno: exercicio.comentarioAluno ?? null,
        })),
      },
    },
  })
}

async function ensurePlanosTreino(params: {
  professorExemploId: string
  professorEspecialistaId: string
  alunoAnaId: string
  alunoBrunoId: string
  exercicios: Awaited<ReturnType<typeof ensureExercicios>>
}) {
  const planoBrunoAntigo = await createPlanoTreino({
    alunoId: params.alunoBrunoId,
    professorId: params.professorExemploId,
    nome: "Treino anterior - adaptacao geral",
    observacoes: buildSeedText("plano anterior mantido inativo para comparacao"),
    ativo: false,
    dias: [
      {
        titulo: "Adaptacao full body",
        ordem: 1,
        diaSemana: 2,
        metodo: "Cadencia controlada",
        exercicios: [
          {
            exercicioId: params.exercicios.supinoReto.id,
            ordem: 1,
            series: 3,
            repeticoes: "12",
            cargaSugerida: 45,
          },
          {
            exercicioId: params.exercicios.agachamentoLivre.id,
            ordem: 2,
            series: 3,
            repeticoes: "10",
            cargaSugerida: 60,
          },
        ],
      },
    ],
  })

  const planoBrunoAtivo = await createPlanoTreino({
    alunoId: params.alunoBrunoId,
    professorId: params.professorExemploId,
    nome: "Treino Base Forca e Hipertrofia",
    observacoes: buildSeedText("plano principal para timeline, progresso e check-ins"),
    ativo: true,
    dias: [
      {
        titulo: "Treino A - Peito e Costas",
        ordem: 1,
        diaSemana: 1,
        observacoes: "Priorizar tecnica na primeira serie.",
        metodo: "Carga progressiva",
        exercicios: [
          {
            exercicioId: params.exercicios.supinoReto.id,
            ordem: 1,
            series: 4,
            repeticoes: "8-10",
            cargaSugerida: 62.5,
          },
          {
            exercicioId: params.exercicios.remadaCurvada.id,
            ordem: 2,
            series: 4,
            repeticoes: "8-10",
            cargaSugerida: 52,
          },
          {
            exercicioId: params.exercicios.desenvolvimentoOmbro.id,
            ordem: 3,
            series: 3,
            repeticoes: "10-12",
            cargaSugerida: 24,
          },
        ],
      },
      {
        titulo: "Treino B - Pernas e Core",
        ordem: 2,
        diaSemana: 3,
        metodo: "Controle de tempo 2-0-2",
        exercicios: [
          {
            exercicioId: params.exercicios.agachamentoLivre.id,
            ordem: 1,
            series: 4,
            repeticoes: "6-8",
            cargaSugerida: 82,
          },
          {
            exercicioId: params.exercicios.legPress.id,
            ordem: 2,
            series: 4,
            repeticoes: "10-12",
            cargaSugerida: 180,
          },
          {
            exercicioId: params.exercicios.pranchaAbdominal.id,
            ordem: 3,
            series: 3,
            repeticoes: "45s",
          },
        ],
      },
      {
        titulo: "Treino C - Posterior e Acessorios",
        ordem: 3,
        diaSemana: 5,
        metodo: "RPE 8",
        exercicios: [
          {
            exercicioId: params.exercicios.levantamentoTerra.id,
            ordem: 1,
            series: 4,
            repeticoes: "5",
            cargaSugerida: 95,
          },
          {
            exercicioId: params.exercicios.cadeiraExtensora.id,
            ordem: 2,
            series: 3,
            repeticoes: "12-15",
            cargaSugerida: 45,
          },
          {
            exercicioId: params.exercicios.bicicleta.id,
            ordem: 3,
            series: 1,
            repeticoes: "15 min",
          },
        ],
      },
    ],
  })

  const planoAnaAtivo = await createPlanoTreino({
    alunoId: params.alunoAnaId,
    professorId: params.professorEspecialistaId,
    nome: "Treino Ana - Condicionamento e Gluteos",
    observacoes: buildSeedText("plano ativo da Ana com check-in em andamento"),
    ativo: true,
    dias: [
      {
        titulo: "Treino A - Gluteos e Cardio",
        ordem: 1,
        diaSemana: 2,
        metodo: "Circuito",
        exercicios: [
          {
            exercicioId: params.exercicios.gluteBridge.id,
            ordem: 1,
            series: 4,
            repeticoes: "15",
          },
          {
            exercicioId: params.exercicios.bicicleta.id,
            ordem: 2,
            series: 1,
            repeticoes: "20 min",
          },
          {
            exercicioId: params.exercicios.pranchaAbdominal.id,
            ordem: 3,
            series: 3,
            repeticoes: "30s",
          },
        ],
      },
      {
        titulo: "Treino B - Pernas tecnicas",
        ordem: 2,
        diaSemana: 4,
        metodo: "Amplitude e controle",
        exercicios: [
          {
            exercicioId: params.exercicios.agachamentoLivre.id,
            ordem: 1,
            series: 3,
            repeticoes: "12",
            cargaSugerida: 32,
          },
          {
            exercicioId: params.exercicios.legPress.id,
            ordem: 2,
            series: 3,
            repeticoes: "12",
            cargaSugerida: 90,
          },
        ],
      },
    ],
  })

  const treinoDiaA = assertExists(
    planoBrunoAtivo.dias.find((dia) => dia.ordem === 1),
    "Treino A do Bruno nao encontrado",
  )
  const treinoDiaC = assertExists(
    planoBrunoAtivo.dias.find((dia) => dia.ordem === 3),
    "Treino C do Bruno nao encontrado",
  )
  const treinoDiaAna = assertExists(
    planoAnaAtivo.dias.find((dia) => dia.ordem === 1),
    "Treino A da Ana nao encontrado",
  )

  await createTreinoCheckin({
    alunoId: params.alunoBrunoId,
    professorId: params.professorExemploId,
    planoTreinoId: planoBrunoAtivo.id,
    treinoDiaId: treinoDiaA.id,
    status: CheckinStatus.CONCLUIDO,
    iniciadoEm: daysAgo(4, 7),
    dataTreino: daysAgo(4, 7),
    finalizadoEm: daysAgo(4, 8),
    comentarioAluno: buildSeedText("treino concluido com boa execucao"),
    comentarioProfessor: buildSeedText("subir 2kg no supino no proximo ciclo"),
    exercicios: treinoDiaA.exercicios.map((item, index) => ({
      treinoDiaExercicioId: item.id,
      exercicioId: item.exercicioId,
      concluido: true,
      cargaReal: item.cargaSugerida ? item.cargaSugerida + 2 : null,
      repeticoesReal: index === 0 ? "10-10-9-8" : "10-10-10",
      comentarioAluno: buildSeedText("concluido sem dor articular"),
    })),
  })

  await createTreinoCheckin({
    alunoId: params.alunoBrunoId,
    professorId: params.professorExemploId,
    planoTreinoId: planoBrunoAtivo.id,
    treinoDiaId: treinoDiaC.id,
    status: CheckinStatus.INICIADO,
    iniciadoEm: daysAgo(1, 18),
    dataTreino: daysAgo(1, 18),
    comentarioAluno: buildSeedText("interrompido por falta de tempo"),
    exercicios: treinoDiaC.exercicios.map((item, index) => ({
      treinoDiaExercicioId: item.id,
      exercicioId: item.exercicioId,
      concluido: index === 0,
      cargaReal: index === 0 ? 97 : null,
      repeticoesReal: index === 0 ? "5-5-5-4" : null,
      comentarioAluno:
        index === 0 ? buildSeedText("boa energia no primeiro exercicio") : null,
    })),
  })

  await createTreinoCheckin({
    alunoId: params.alunoAnaId,
    professorId: params.professorEspecialistaId,
    planoTreinoId: planoAnaAtivo.id,
    treinoDiaId: treinoDiaAna.id,
    status: CheckinStatus.INICIADO,
    iniciadoEm: daysAgo(0, 6),
    dataTreino: daysAgo(0, 6),
    comentarioAluno: buildSeedText("check-in aberto para testar retomada do dia"),
    exercicios: treinoDiaAna.exercicios.map((item, index) => ({
      treinoDiaExercicioId: item.id,
      exercicioId: item.exercicioId,
      concluido: index === 0,
      repeticoesReal: index === 0 ? "15-15-15-15" : null,
      comentarioAluno: index === 0 ? buildSeedText("ativacao concluida") : null,
    })),
  })

  void planoBrunoAntigo
}

async function createPlanoDieta(params: {
  alunoId: string
  professorId: string
  nome: string
  objetivo: ObjetivoDieta
  percentualGordura?: number | null
  massaMagraKg?: number | null
  tmbKcal?: number | null
  fatorAtividade?: number | null
  caloriasMeta: number
  proteinasMetaG: number
  carboidratosMetaG: number
  gordurasMetaG: number
  observacoes: string
  ativo: boolean
  dias: Array<{
    titulo: string
    ordem: number
    diaSemana?: number
    observacoes?: string
    refeicoes: Array<{
      nome: string
      ordem: number
      horario?: string
      observacoes?: string
      itens: Array<{
        alimentoId: string
        ordem: number
        quantidadeGramas: number
        calorias: number
        proteinas: number
        carboidratos: number
        gorduras: number
        fibras: number | null
        observacoes?: string
      }>
    }>
  }>
}) {
  return prisma.planoDieta.create({
    data: {
      alunoId: params.alunoId,
      professorId: params.professorId,
      nome: params.nome,
      objetivo: params.objetivo,
      percentualGordura: params.percentualGordura ?? null,
      massaMagraKg: params.massaMagraKg ?? null,
      tmbKcal: params.tmbKcal ?? null,
      fatorAtividade: params.fatorAtividade ?? null,
      caloriasMeta: params.caloriasMeta,
      proteinasMetaG: params.proteinasMetaG,
      carboidratosMetaG: params.carboidratosMetaG,
      gordurasMetaG: params.gordurasMetaG,
      observacoes: params.observacoes,
      ativo: params.ativo,
      dias: {
        create: params.dias.map((dia) => ({
          titulo: dia.titulo,
          ordem: dia.ordem,
          diaSemana: dia.diaSemana,
          observacoes: dia.observacoes,
          refeicoes: {
            create: dia.refeicoes.map((refeicao) => ({
              nome: refeicao.nome,
              ordem: refeicao.ordem,
              horario: refeicao.horario,
              observacoes: refeicao.observacoes,
              itens: {
                create: refeicao.itens.map((item) => ({
                  alimentoId: item.alimentoId,
                  ordem: item.ordem,
                  quantidadeGramas: item.quantidadeGramas,
                  calorias: item.calorias,
                  proteinas: item.proteinas,
                  carboidratos: item.carboidratos,
                  gorduras: item.gorduras,
                  fibras: item.fibras,
                  observacoes: item.observacoes,
                })),
              },
            })),
          },
        })),
      },
    },
    include: {
      dias: {
        orderBy: { ordem: "asc" as const },
        include: {
          refeicoes: {
            orderBy: { ordem: "asc" as const },
            include: {
              itens: {
                orderBy: { ordem: "asc" as const },
              },
            },
          },
        },
      },
    },
  })
}

async function createDietaCheckin(params: {
  alunoId: string
  professorId: string
  planoDietaId: string
  dietaDiaId: string
  status: CheckinStatus
  iniciadoEm: Date
  dataDieta: Date
  finalizadoEm?: Date | null
  observacaoDia?: string | null
  comentarioProfessor?: string | null
  refeicoes: Array<{
    dietaRefeicaoId: string
    concluida: boolean
    observacaoAluno?: string | null
  }>
}) {
  await prisma.dietaCheckin.create({
    data: {
      alunoId: params.alunoId,
      professorId: params.professorId,
      planoDietaId: params.planoDietaId,
      dietaDiaId: params.dietaDiaId,
      status: params.status,
      iniciadoEm: params.iniciadoEm,
      dataDieta: params.dataDieta,
      finalizadoEm: params.finalizadoEm ?? null,
      observacaoDia: params.observacaoDia ?? null,
      comentarioProfessor: params.comentarioProfessor ?? null,
      refeicoes: {
        create: params.refeicoes.map((refeicao) => ({
          dietaRefeicaoId: refeicao.dietaRefeicaoId,
          concluida: refeicao.concluida,
          observacaoAluno: refeicao.observacaoAluno ?? null,
        })),
      },
    },
  })
}

async function ensurePlanosDieta(params: {
  professorExemploId: string
  professorEspecialistaId: string
  alunoAnaId: string
  alunoBrunoId: string
  alimentos: Awaited<ReturnType<typeof ensureAlimentos>>
}) {
  const arroz = params.alimentos.arroz
  const feijao = params.alimentos.feijao
  const frango = params.alimentos.frango
  const banana = params.alimentos.banana
  const aveia = params.alimentos.aveia
  const ovo = params.alimentos.ovo
  const iogurte = params.alimentos.iogurte
  const batataDoce = params.alimentos.batataDoce
  const azeite = params.alimentos.azeite
  const pastaAmendoim = params.alimentos.pastaAmendoim

  const macros = {
    banana120: macrosByGrams(banana, 120),
    aveia40: macrosByGrams(aveia, 40),
    ovo100: macrosByGrams(ovo, 100),
    arroz180: macrosByGrams(arroz, 180),
    feijao120: macrosByGrams(feijao, 120),
    frango180: macrosByGrams(frango, 180),
    batataDoce200: macrosByGrams(batataDoce, 200),
    frango160: macrosByGrams(frango, 160),
    iogurte170: macrosByGrams(iogurte, 170),
    pasta20: macrosByGrams(pastaAmendoim, 20),
    azeite10: macrosByGrams(azeite, 10),
  }

  await createPlanoDieta({
    alunoId: params.alunoBrunoId,
    professorId: params.professorExemploId,
    nome: "Plano anterior - ajuste calorico",
    objetivo: ObjetivoDieta.MANTER,
    percentualGordura: 22.2,
    massaMagraKg: 60.1,
    tmbKcal: 1760,
    fatorAtividade: 1.5,
    caloriasMeta: 2550,
    proteinasMetaG: 170,
    carboidratosMetaG: 280,
    gordurasMetaG: 70,
    observacoes: buildSeedText("plano anterior mantido inativo para comparacao"),
    ativo: false,
    dias: [
      {
        titulo: "Base antiga",
        ordem: 1,
        diaSemana: 1,
        refeicoes: [
          {
            nome: "Cafe da manha",
            ordem: 1,
            horario: "07:30",
            itens: [
              {
                alimentoId: banana.id,
                ordem: 1,
                quantidadeGramas: 120,
                ...macros.banana120,
              },
              {
                alimentoId: ovo.id,
                ordem: 2,
                quantidadeGramas: 100,
                ...macros.ovo100,
              },
            ],
          },
        ],
      },
    ],
  })

  const planoBrunoAtivo = await createPlanoDieta({
    alunoId: params.alunoBrunoId,
    professorId: params.professorExemploId,
    nome: "Plano Alimentar Base - Definicao",
    objetivo: ObjetivoDieta.PERDER,
    percentualGordura: 21.1,
    massaMagraKg: 61.0,
    tmbKcal: 1750,
    fatorAtividade: 1.55,
    caloriasMeta: 2300,
    proteinasMetaG: 180,
    carboidratosMetaG: 220,
    gordurasMetaG: 65,
    observacoes: buildSeedText(
      "plano principal com refeicoes e macros consistentes para check-ins e recomendacao",
    ),
    ativo: true,
    dias: [
      {
        titulo: "Segunda a Sexta",
        ordem: 1,
        diaSemana: 1,
        observacoes: "Manter horarios consistentes.",
        refeicoes: [
          {
            nome: "Cafe da manha",
            ordem: 1,
            horario: "07:30",
            itens: [
              {
                alimentoId: banana.id,
                ordem: 1,
                quantidadeGramas: 120,
                ...macros.banana120,
              },
              {
                alimentoId: aveia.id,
                ordem: 2,
                quantidadeGramas: 40,
                ...macros.aveia40,
              },
              {
                alimentoId: ovo.id,
                ordem: 3,
                quantidadeGramas: 100,
                ...macros.ovo100,
              },
            ],
          },
          {
            nome: "Almoco",
            ordem: 2,
            horario: "12:30",
            itens: [
              {
                alimentoId: arroz.id,
                ordem: 1,
                quantidadeGramas: 180,
                ...macros.arroz180,
              },
              {
                alimentoId: feijao.id,
                ordem: 2,
                quantidadeGramas: 120,
                ...macros.feijao120,
              },
              {
                alimentoId: frango.id,
                ordem: 3,
                quantidadeGramas: 180,
                ...macros.frango180,
              },
              {
                alimentoId: azeite.id,
                ordem: 4,
                quantidadeGramas: 10,
                ...macros.azeite10,
              },
            ],
          },
          {
            nome: "Jantar",
            ordem: 3,
            horario: "20:00",
            itens: [
              {
                alimentoId: batataDoce.id,
                ordem: 1,
                quantidadeGramas: 200,
                ...macros.batataDoce200,
              },
              {
                alimentoId: frango.id,
                ordem: 2,
                quantidadeGramas: 160,
                ...macros.frango160,
              },
            ],
          },
        ],
      },
      {
        titulo: "Sabado e Domingo",
        ordem: 2,
        diaSemana: 6,
        observacoes: "Flexibilizar sem perder proteina diaria.",
        refeicoes: [
          {
            nome: "Lanche pratico",
            ordem: 1,
            horario: "09:00",
            itens: [
              {
                alimentoId: iogurte.id,
                ordem: 1,
                quantidadeGramas: 170,
                ...macros.iogurte170,
              },
              {
                alimentoId: pastaAmendoim.id,
                ordem: 2,
                quantidadeGramas: 20,
                ...macros.pasta20,
              },
            ],
          },
          {
            nome: "Almoco livre controlado",
            ordem: 2,
            horario: "13:00",
            itens: [
              {
                alimentoId: arroz.id,
                ordem: 1,
                quantidadeGramas: 180,
                ...macros.arroz180,
              },
              {
                alimentoId: frango.id,
                ordem: 2,
                quantidadeGramas: 160,
                ...macros.frango160,
              },
            ],
          },
        ],
      },
    ],
  })

  const planoAnaAtivo = await createPlanoDieta({
    alunoId: params.alunoAnaId,
    professorId: params.professorEspecialistaId,
    nome: "Plano Ana - Reposicao e Energia",
    objetivo: ObjetivoDieta.MANTER,
    percentualGordura: 26.3,
    massaMagraKg: 50.5,
    tmbKcal: 1430,
    fatorAtividade: 1.45,
    caloriasMeta: 1900,
    proteinasMetaG: 120,
    carboidratosMetaG: 210,
    gordurasMetaG: 55,
    observacoes: buildSeedText("plano com check-in do dia em andamento"),
    ativo: true,
    dias: [
      {
        titulo: "Dia util padrao",
        ordem: 1,
        diaSemana: 1,
        refeicoes: [
          {
            nome: "Cafe da manha",
            ordem: 1,
            horario: "07:00",
            itens: [
              {
                alimentoId: iogurte.id,
                ordem: 1,
                quantidadeGramas: 170,
                ...macros.iogurte170,
              },
              {
                alimentoId: banana.id,
                ordem: 2,
                quantidadeGramas: 120,
                ...macros.banana120,
              },
            ],
          },
          {
            nome: "Lanche",
            ordem: 2,
            horario: "16:30",
            itens: [
              {
                alimentoId: pastaAmendoim.id,
                ordem: 1,
                quantidadeGramas: 20,
                ...macros.pasta20,
              },
              {
                alimentoId: banana.id,
                ordem: 2,
                quantidadeGramas: 120,
                ...macros.banana120,
              },
            ],
          },
        ],
      },
    ],
  })

  const dietaDiaBrunoSemana = assertExists(
    planoBrunoAtivo.dias.find((dia) => dia.ordem === 1),
    "Dia principal da dieta do Bruno nao encontrado",
  )
  const dietaDiaBrunoFimSemana = assertExists(
    planoBrunoAtivo.dias.find((dia) => dia.ordem === 2),
    "Dia alternativo da dieta do Bruno nao encontrado",
  )
  const dietaDiaAna = assertExists(
    planoAnaAtivo.dias.find((dia) => dia.ordem === 1),
    "Dia principal da dieta da Ana nao encontrado",
  )

  await createDietaCheckin({
    alunoId: params.alunoBrunoId,
    professorId: params.professorExemploId,
    planoDietaId: planoBrunoAtivo.id,
    dietaDiaId: dietaDiaBrunoSemana.id,
    status: CheckinStatus.CONCLUIDO,
    iniciadoEm: daysAgo(2, 7),
    dataDieta: daysAgo(2, 7),
    finalizadoEm: daysAgo(2, 21),
    observacaoDia: buildSeedText("aderencia de 90% ao plano"),
    comentarioProfessor: buildSeedText("manter consistencia e hidratacao"),
    refeicoes: dietaDiaBrunoSemana.refeicoes.map((refeicao) => ({
      dietaRefeicaoId: refeicao.id,
      concluida: true,
      observacaoAluno: buildSeedText("refeicao concluida no horario previsto"),
    })),
  })

  await createDietaCheckin({
    alunoId: params.alunoBrunoId,
    professorId: params.professorExemploId,
    planoDietaId: planoBrunoAtivo.id,
    dietaDiaId: dietaDiaBrunoFimSemana.id,
    status: CheckinStatus.INICIADO,
    iniciadoEm: daysAgo(1, 9),
    dataDieta: daysAgo(1, 9),
    observacaoDia: buildSeedText("dia flexivel ainda em andamento"),
    refeicoes: dietaDiaBrunoFimSemana.refeicoes.map((refeicao, index) => ({
      dietaRefeicaoId: refeicao.id,
      concluida: index === 0,
      observacaoAluno:
        index === 0 ? buildSeedText("lanche pratico concluido") : null,
    })),
  })

  await createDietaCheckin({
    alunoId: params.alunoAnaId,
    professorId: params.professorEspecialistaId,
    planoDietaId: planoAnaAtivo.id,
    dietaDiaId: dietaDiaAna.id,
    status: CheckinStatus.INICIADO,
    iniciadoEm: daysAgo(0, 8),
    dataDieta: daysAgo(0, 8),
    observacaoDia: buildSeedText("check-in aberto para testar marcacao parcial"),
    refeicoes: dietaDiaAna.refeicoes.map((refeicao, index) => ({
      dietaRefeicaoId: refeicao.id,
      concluida: index === 0,
      observacaoAluno:
        index === 0 ? buildSeedText("cafe da manha concluido") : null,
    })),
  })
}

async function ensureLeadData(params: {
  adminUserId: string
  alunoAnaUserId: string
  alunoBrunoUserId: string
  alunoDiegoUserId: string
}) {
  const instagram = await prisma.leadLink.upsert({
    where: { slug: "instagram-bio-gforce" },
    create: {
      slug: "instagram-bio-gforce",
      nome: "Instagram Bio",
      canal: "Instagram",
      origem: "Bio",
      ativo: true,
      createdBy: params.adminUserId,
    },
    update: {
      nome: "Instagram Bio",
      canal: "Instagram",
      origem: "Bio",
      ativo: true,
      createdBy: params.adminUserId,
    },
  })

  const parceria = await prisma.leadLink.upsert({
    where: { slug: "parceria-personal-2026" },
    create: {
      slug: "parceria-personal-2026",
      nome: "Parceria Personal",
      canal: "Indicacao",
      origem: "Parceria",
      ativo: true,
      createdBy: params.adminUserId,
    },
    update: {
      nome: "Parceria Personal",
      canal: "Indicacao",
      origem: "Parceria",
      ativo: true,
      createdBy: params.adminUserId,
    },
  })

  const panfleto = await prisma.leadLink.upsert({
    where: { slug: "panfleto-bairro-2026" },
    create: {
      slug: "panfleto-bairro-2026",
      nome: "Panfleto Bairro",
      canal: "Offline",
      origem: "Academia parceira",
      ativo: false,
      createdBy: params.adminUserId,
    },
    update: {
      nome: "Panfleto Bairro",
      canal: "Offline",
      origem: "Academia parceira",
      ativo: false,
      createdBy: params.adminUserId,
    },
  })

  await prisma.leadClickEvent.createMany({
    data: [
      {
        leadLinkId: instagram.id,
        clickedAt: daysAgo(18, 10),
        ipHash: "seed-ip-a",
        uaHash: "seed-ua-a",
        fingerprint: "seed-fp-instagram-a",
        referrer: "https://instagram.com",
        path: "/landing",
        utmSource: "instagram",
        utmMedium: "bio",
        utmCampaign: "abril-2026",
      },
      {
        leadLinkId: instagram.id,
        clickedAt: daysAgo(16, 12),
        ipHash: "seed-ip-b",
        uaHash: "seed-ua-b",
        fingerprint: "seed-fp-instagram-b",
        referrer: "https://instagram.com",
        path: "/landing",
        utmSource: "instagram",
        utmMedium: "story",
        utmCampaign: "abril-2026",
      },
      {
        leadLinkId: parceria.id,
        clickedAt: daysAgo(11, 14),
        ipHash: "seed-ip-c",
        uaHash: "seed-ua-c",
        fingerprint: "seed-fp-parceria-c",
        referrer: "https://wa.me",
        path: "/landing",
        utmSource: "whatsapp",
        utmMedium: "indicacao",
        utmCampaign: "parceria-2026",
      },
      {
        leadLinkId: parceria.id,
        clickedAt: daysAgo(4, 11),
        ipHash: "seed-ip-d",
        uaHash: "seed-ua-d",
        fingerprint: "seed-fp-parceria-d",
        referrer: "https://wa.me",
        path: "/landing",
        utmSource: "whatsapp",
        utmMedium: "grupo",
        utmCampaign: "parceria-2026",
      },
      {
        leadLinkId: panfleto.id,
        clickedAt: daysAgo(26, 9),
        ipHash: "seed-ip-e",
        uaHash: "seed-ua-e",
        fingerprint: "seed-fp-panfleto-e",
        referrer: null,
        path: "/landing",
        utmSource: "offline",
        utmMedium: "flyer",
        utmCampaign: "bairro-2026",
      },
    ],
  })

  await prisma.leadAttribution.upsert({
    where: { userId: params.alunoAnaUserId },
    create: {
      leadLinkId: instagram.id,
      userId: params.alunoAnaUserId,
      modelo: LeadAttributionModel.FIRST_TOUCH,
      attributedAt: monthDate(-4, 12),
    },
    update: {
      leadLinkId: instagram.id,
      modelo: LeadAttributionModel.FIRST_TOUCH,
      attributedAt: monthDate(-4, 12),
    },
  })

  await prisma.leadAttribution.upsert({
    where: { userId: params.alunoBrunoUserId },
    create: {
      leadLinkId: parceria.id,
      userId: params.alunoBrunoUserId,
      modelo: LeadAttributionModel.FIRST_TOUCH,
      attributedAt: monthDate(-2, 15),
    },
    update: {
      leadLinkId: parceria.id,
      modelo: LeadAttributionModel.FIRST_TOUCH,
      attributedAt: monthDate(-2, 15),
    },
  })

  await prisma.leadAttribution.upsert({
    where: { userId: params.alunoDiegoUserId },
    create: {
      leadLinkId: panfleto.id,
      userId: params.alunoDiegoUserId,
      modelo: LeadAttributionModel.FIRST_TOUCH,
      attributedAt: monthDate(0, 4),
    },
    update: {
      leadLinkId: panfleto.id,
      modelo: LeadAttributionModel.FIRST_TOUCH,
      attributedAt: monthDate(0, 4),
    },
  })
}

async function ensureFinanceData(params: {
  adminUserId: string
  alunoAnaId: string
  alunoBrunoId: string
  alunoCarlaId: string
  alunoDiegoId: string
}) {
  const months = [
    { key: dateToMonth(monthDate(-5, 10)), status: FinanceMonthStatus.FECHADO },
    { key: dateToMonth(monthDate(-4, 10)), status: FinanceMonthStatus.FECHADO },
    { key: dateToMonth(monthDate(-3, 10)), status: FinanceMonthStatus.FECHADO },
    { key: dateToMonth(monthDate(-2, 10)), status: FinanceMonthStatus.ABERTO },
    { key: dateToMonth(monthDate(-1, 10)), status: FinanceMonthStatus.ABERTO },
    { key: dateToMonth(monthDate(0, 10)), status: FinanceMonthStatus.ABERTO },
  ]

  for (let index = 0; index < months.length; index += 1) {
    const month = months[index]

    await prisma.financeMonth.upsert({
      where: { month: month.key },
      create: {
        month: month.key,
        status: month.status,
        closedAt: month.status === FinanceMonthStatus.FECHADO ? daysAgo(90 - index * 7) : null,
        closedBy: month.status === FinanceMonthStatus.FECHADO ? params.adminUserId : null,
        reopenedAt:
          month.status === FinanceMonthStatus.ABERTO && index === 3 ? daysAgo(25) : null,
        reopenedBy:
          month.status === FinanceMonthStatus.ABERTO && index === 3 ? params.adminUserId : null,
      },
      update: {
        status: month.status,
        closedAt: month.status === FinanceMonthStatus.FECHADO ? daysAgo(90 - index * 7) : null,
        closedBy: month.status === FinanceMonthStatus.FECHADO ? params.adminUserId : null,
        reopenedAt:
          month.status === FinanceMonthStatus.ABERTO && index === 3 ? daysAgo(25) : null,
        reopenedBy:
          month.status === FinanceMonthStatus.ABERTO && index === 3 ? params.adminUserId : null,
      },
    })
  }

  await prisma.financeRenewal.createMany({
    data: [
      {
        alunoId: params.alunoCarlaId,
        month: months[0].key,
        tipoPlano: FinanceRenewalPlanType.COMPLETO,
        valor: 179.9,
        renovadoEm: monthDate(-5, 8),
        observacao: buildSeedText("renovacao antiga da Carla antes de pausar"),
        createdBy: params.adminUserId,
      },
      {
        alunoId: params.alunoAnaId,
        month: months[1].key,
        tipoPlano: FinanceRenewalPlanType.TREINO,
        valor: 129.9,
        renovadoEm: monthDate(-4, 12),
        observacao: buildSeedText("renovacao treino da Ana"),
        createdBy: params.adminUserId,
      },
      {
        alunoId: params.alunoBrunoId,
        month: months[2].key,
        tipoPlano: FinanceRenewalPlanType.COMPLETO,
        valor: 199.9,
        renovadoEm: monthDate(-3, 6),
        observacao: buildSeedText("renovacao completa do Bruno"),
        createdBy: params.adminUserId,
      },
      {
        alunoId: params.alunoBrunoId,
        month: months[3].key,
        tipoPlano: FinanceRenewalPlanType.DIETA,
        valor: 99.9,
        renovadoEm: monthDate(-2, 18),
        observacao: buildSeedText("upgrade parcial da dieta do Bruno"),
        createdBy: params.adminUserId,
      },
      {
        alunoId: params.alunoDiegoId,
        month: months[4].key,
        tipoPlano: FinanceRenewalPlanType.TREINO,
        valor: 139.9,
        renovadoEm: monthDate(-1, 7),
        observacao: buildSeedText("renovacao treino do Diego"),
        createdBy: params.adminUserId,
      },
      {
        alunoId: params.alunoAnaId,
        month: months[5].key,
        tipoPlano: FinanceRenewalPlanType.COMPLETO,
        valor: 189.9,
        renovadoEm: monthDate(0, 5),
        observacao: buildSeedText("renovacao completa mais recente da Ana"),
        createdBy: params.adminUserId,
      },
    ],
  })

  await prisma.financeEntry.createMany({
    data: [
      {
        month: months[0].key,
        tipo: FinanceEntryType.RECEITA,
        categoria: FinanceEntryCategory.CAMISA,
        valor: 180,
        quantidade: 6,
        descricao: buildSeedText("venda de camisas do mes"),
        dataLancamento: monthDate(-5, 9),
        createdBy: params.adminUserId,
      },
      {
        month: months[0].key,
        tipo: FinanceEntryType.DESPESA,
        categoria: FinanceEntryCategory.CUSTO_OPERACIONAL,
        valor: 240,
        descricao: buildSeedText("assinaturas e custos operacionais"),
        dataLancamento: monthDate(-5, 20),
        createdBy: params.adminUserId,
      },
      {
        month: months[1].key,
        tipo: FinanceEntryType.RECEITA,
        categoria: FinanceEntryCategory.YOUTUBE,
        valor: 320,
        descricao: buildSeedText("receita de conteudo no YouTube"),
        dataLancamento: monthDate(-4, 11),
        createdBy: params.adminUserId,
      },
      {
        month: months[1].key,
        tipo: FinanceEntryType.DESPESA,
        categoria: FinanceEntryCategory.OUTRA_DESPESA,
        valor: 90,
        descricao: buildSeedText("despesa pontual com design"),
        dataLancamento: monthDate(-4, 21),
        createdBy: params.adminUserId,
      },
      {
        month: months[2].key,
        tipo: FinanceEntryType.RECEITA,
        categoria: FinanceEntryCategory.PARCERIA,
        valor: 450,
        descricao: buildSeedText("repasse de parceria local"),
        dataLancamento: monthDate(-3, 14),
        createdBy: params.adminUserId,
      },
      {
        month: months[2].key,
        tipo: FinanceEntryType.DESPESA,
        categoria: FinanceEntryCategory.CUSTO_OPERACIONAL,
        valor: 260,
        descricao: buildSeedText("plataformas e ferramentas"),
        dataLancamento: monthDate(-3, 22),
        createdBy: params.adminUserId,
      },
      {
        month: months[3].key,
        tipo: FinanceEntryType.RECEITA,
        categoria: FinanceEntryCategory.OUTRA_RECEITA,
        valor: 150,
        descricao: buildSeedText("ebook e material complementar"),
        dataLancamento: monthDate(-2, 10),
        createdBy: params.adminUserId,
      },
      {
        month: months[3].key,
        tipo: FinanceEntryType.DESPESA,
        categoria: FinanceEntryCategory.OUTRA_DESPESA,
        valor: 120,
        descricao: buildSeedText("reembolso de evento"),
        dataLancamento: monthDate(-2, 18),
        createdBy: params.adminUserId,
      },
      {
        month: months[4].key,
        tipo: FinanceEntryType.RECEITA,
        categoria: FinanceEntryCategory.CAMISA,
        valor: 90,
        quantidade: 3,
        descricao: buildSeedText("venda de camisas do mes corrente-1"),
        dataLancamento: monthDate(-1, 8),
        createdBy: params.adminUserId,
      },
      {
        month: months[4].key,
        tipo: FinanceEntryType.DESPESA,
        categoria: FinanceEntryCategory.CUSTO_OPERACIONAL,
        valor: 210,
        descricao: buildSeedText("infra e ferramentas do mes"),
        dataLancamento: monthDate(-1, 19),
        createdBy: params.adminUserId,
      },
      {
        month: months[5].key,
        tipo: FinanceEntryType.RECEITA,
        categoria: FinanceEntryCategory.OUTRA_RECEITA,
        valor: 110,
        descricao: buildSeedText("avulso de consultoria"),
        dataLancamento: monthDate(0, 6),
        createdBy: params.adminUserId,
      },
      {
        month: months[5].key,
        tipo: FinanceEntryType.DESPESA,
        categoria: FinanceEntryCategory.CUSTO_OPERACIONAL,
        valor: 205,
        descricao: buildSeedText("ferramentas do mes atual"),
        dataLancamento: monthDate(0, 16),
        createdBy: params.adminUserId,
      },
    ],
  })
}

async function runSeed() {
  console.log("\n🌱 Iniciando seed do banco de dados...\n")

  const isDevLike = process.env.NODE_ENV !== "production"

  const adminUser = await upsertUser({
    email: ADMIN_EMAIL,
    nome: "Administrador",
    role: UserRole.ADMIN,
    plainPassword: ADMIN_PASSWORD,
  })

  const professorPadraoUser = await upsertUser({
    email: PROFESSOR_PADRAO_EMAIL,
    nome: "Professor Padrao (Sistema)",
    role: UserRole.PROFESSOR,
    plainPassword: PROFESSOR_PADRAO_PASSWORD,
  })

  await upsertProfessor({
    userId: professorPadraoUser.id,
    especialidade: "Professor padrao para novos alunos",
    isPadrao: true,
  })

  if (!isDevLike) {
    await ensureInviteCodes({ adminUserId: adminUser.id })
  }

  if (isDevLike) {
    const professorExemploUser = await upsertUser({
      email: PROFESSOR_EXEMPLO_EMAIL,
      nome: "Carlos Silva",
      role: UserRole.PROFESSOR,
      plainPassword: PROFESSOR_EXEMPLO_PASSWORD,
    })

    const professorEspecialistaUser = await upsertUser({
      email: PROFESSOR_ESPECIALISTA_EMAIL,
      nome: "Marina Costa",
      role: UserRole.PROFESSOR,
      plainPassword: PROFESSOR_ESPECIALISTA_PASSWORD,
    })

    const professorExemplo = await upsertProfessor({
      userId: professorExemploUser.id,
      telefone: "11987654321",
      especialidade: "Musculacao e Hipertrofia",
      isPadrao: false,
    })

    const professorEspecialista = await upsertProfessor({
      userId: professorEspecialistaUser.id,
      telefone: "11988776655",
      especialidade: "Condicionamento e acompanhamento feminino",
      isPadrao: false,
    })

    const alunoAnaUser = await upsertUser({
      email: ALUNO_ANA_EMAIL,
      nome: "Ana Oliveira",
      role: UserRole.ALUNO,
      plainPassword: ALUNO_ANA_PASSWORD,
    })

    const alunoBrunoUser = await upsertUser({
      email: ALUNO_BRUNO_EMAIL,
      nome: "Bruno Martins",
      role: UserRole.ALUNO,
      plainPassword: ALUNO_BRUNO_PASSWORD,
    })

    const alunoCarlaUser = await upsertUser({
      email: ALUNO_CARLA_EMAIL,
      nome: "Carla Souza",
      role: UserRole.ALUNO,
      plainPassword: ALUNO_CARLA_PASSWORD,
    })

    const alunoDiegoUser = await upsertUser({
      email: ALUNO_DIEGO_EMAIL,
      nome: "Diego Pereira",
      role: UserRole.ALUNO,
      plainPassword: ALUNO_DIEGO_PASSWORD,
    })

    const alunoAna = await upsertAluno({
      userId: alunoAnaUser.id,
      professorId: professorEspecialista.id,
      ativo: true,
      createdAt: monthDate(-4, 12),
      sexoBiologico: SexoBiologico.FEMININO,
      telefone: "11999998888",
      alturaCm: 166,
      pesoKg: 66.8,
      idade: 29,
      cinturaCm: 77,
      quadrilCm: 101,
      pescocoCm: 33,
      diasTreinoSemana: 4,
      objetivosAtuais: "Perder gordura e melhorar condicionamento",
      tomaRemedio: false,
      alimentosQuerDiario: ["Iogurte", "Banana", "Frango"],
      alimentosNaoComem: ["Frituras"],
      alergiasAlimentares: [],
      doresArticulares: null,
      suplementosConsumidos: ["Creatina"],
      frequenciaHorariosRefeicoes: "07h, 12h30, 16h30 e 20h",
    })

    const alunoBruno = await upsertAluno({
      userId: alunoBrunoUser.id,
      professorId: professorExemplo.id,
      ativo: true,
      createdAt: monthDate(-2, 15),
      sexoBiologico: SexoBiologico.MASCULINO,
      telefone: "11999997777",
      alturaCm: 178,
      pesoKg: 82.2,
      idade: 33,
      cinturaCm: 90,
      quadrilCm: 100,
      pescocoCm: 39,
      diasTreinoSemana: 5,
      objetivosAtuais: "Aumentar massa magra com controle de gordura",
      tomaRemedio: true,
      remediosUso: "Losartana 50mg",
      alimentosQuerDiario: ["Arroz", "Feijao", "Frango", "Ovos"],
      alimentosNaoComem: ["Refrigerante"],
      alergiasAlimentares: [],
      doresArticulares: "Leve sensibilidade no ombro direito em dias de volume alto",
      suplementosConsumidos: ["Whey", "Creatina", "Cafeina"],
      frequenciaHorariosRefeicoes: "07h30, 12h30, 16h e 20h",
    })

    const alunoCarla = await upsertAluno({
      userId: alunoCarlaUser.id,
      professorId: professorExemplo.id,
      ativo: false,
      createdAt: monthDate(-5, 5),
      sexoBiologico: SexoBiologico.FEMININO,
      telefone: "11999887766",
      alturaCm: 170,
      pesoKg: 71.8,
      idade: 35,
      cinturaCm: 84,
      quadrilCm: 105,
      pescocoCm: 34,
      diasTreinoSemana: 2,
      objetivosAtuais: "Pausou temporariamente o acompanhamento",
      tomaRemedio: false,
      alimentosQuerDiario: ["Cafe", "Frutas"],
      alimentosNaoComem: ["Frutos do mar"],
      alergiasAlimentares: ["Camarao"],
      doresArticulares: null,
      suplementosConsumidos: [],
      frequenciaHorariosRefeicoes: "Sem rotina fixa no momento",
    })

    const alunoDiego = await upsertAluno({
      userId: alunoDiegoUser.id,
      professorId: professorEspecialista.id,
      ativo: true,
      createdAt: monthDate(0, 4),
      sexoBiologico: SexoBiologico.MASCULINO,
      telefone: "11999112233",
      alturaCm: 181,
      pesoKg: null,
      idade: 27,
      cinturaCm: null,
      quadrilCm: null,
      pescocoCm: null,
      diasTreinoSemana: 1,
      objetivosAtuais: "Acabou de entrar e ainda nao concluiu avaliacao",
      tomaRemedio: null,
      remediosUso: null,
      alimentosQuerDiario: ["Lanche rapido"],
      alimentosNaoComem: [],
      alergiasAlimentares: [],
      doresArticulares: null,
      suplementosConsumidos: [],
      frequenciaHorariosRefeicoes: null,
    })

    await resetSeedScenarioData({
      adminUserId: adminUser.id,
      seedUserIds: [
        adminUser.id,
        professorExemploUser.id,
        professorEspecialistaUser.id,
        alunoAnaUser.id,
        alunoBrunoUser.id,
        alunoCarlaUser.id,
        alunoDiegoUser.id,
      ],
      seedAlunoIds: [alunoAna.id, alunoBruno.id, alunoCarla.id, alunoDiego.id],
      seedProfessorIds: [professorExemplo.id, professorEspecialista.id],
    })

    await ensureInviteCodes({
      adminUserId: adminUser.id,
      usedProfessorUserId: professorEspecialistaUser.id,
    })

    await ensureRefreshSessions({
      adminUserId: adminUser.id,
      professorUserId: professorExemploUser.id,
      alunoAnaUserId: alunoAnaUser.id,
      alunoBrunoUserId: alunoBrunoUser.id,
    })

    await ensureHistoricos({
      adminUserId: adminUser.id,
      alunoAnaId: alunoAna.id,
      alunoBrunoId: alunoBruno.id,
      alunoCarlaId: alunoCarla.id,
    })

    await ensureNotificationDispatches({
      alunoAnaId: alunoAna.id,
      alunoBrunoId: alunoBruno.id,
    })

    await ensureFotosShape({
      alunoAnaId: alunoAna.id,
      alunoBrunoId: alunoBruno.id,
    })

    await ensureArquivosAluno({
      professorId: professorExemplo.id,
      alunoAnaId: alunoAna.id,
      alunoBrunoId: alunoBruno.id,
    })

    const exercicios = await ensureExercicios({
      professorExemploId: professorExemplo.id,
      professorEspecialistaId: professorEspecialista.id,
    })

    const alimentos = await ensureAlimentos({
      professorExemploId: professorExemplo.id,
    })

    await ensureTreinoModelos({
      professorId: professorExemplo.id,
      exercicios,
    })

    await ensurePlanosTreino({
      professorExemploId: professorExemplo.id,
      professorEspecialistaId: professorEspecialista.id,
      alunoAnaId: alunoAna.id,
      alunoBrunoId: alunoBruno.id,
      exercicios,
    })

    await ensurePlanosDieta({
      professorExemploId: professorExemplo.id,
      professorEspecialistaId: professorEspecialista.id,
      alunoAnaId: alunoAna.id,
      alunoBrunoId: alunoBruno.id,
      alimentos,
    })

    await ensureLeadData({
      adminUserId: adminUser.id,
      alunoAnaUserId: alunoAnaUser.id,
      alunoBrunoUserId: alunoBrunoUser.id,
      alunoDiegoUserId: alunoDiegoUser.id,
    })

    await ensureFinanceData({
      adminUserId: adminUser.id,
      alunoAnaId: alunoAna.id,
      alunoBrunoId: alunoBruno.id,
      alunoCarlaId: alunoCarla.id,
      alunoDiegoId: alunoDiego.id,
    })
  }

  const [
    usersCount,
    professoresCount,
    alunosCount,
    historicosCount,
    planosTreinoCount,
    treinoCheckinsCount,
    treinoModelosCount,
    alimentosCount,
    planosDietaCount,
    dietaCheckinsCount,
    refreshSessionsCount,
    inviteCodesCount,
    leadLinksCount,
    leadClicksCount,
    leadAttributionsCount,
    notificationDispatchesCount,
    fotosShapeCount,
    arquivosAlunoCount,
    financeMonthsCount,
    financeRenewalsCount,
    financeEntriesCount,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.professor.count(),
    prisma.aluno.count(),
    prisma.alunoHistorico.count(),
    prisma.planoTreino.count(),
    prisma.treinoCheckin.count(),
    prisma.treinoModelo.count(),
    prisma.alimento.count(),
    prisma.planoDieta.count(),
    prisma.dietaCheckin.count(),
    prisma.refreshSession.count(),
    prisma.inviteCode.count(),
    prisma.leadLink.count(),
    prisma.leadClickEvent.count(),
    prisma.leadAttribution.count(),
    prisma.notificationDispatch.count(),
    prisma.fotoShape.count(),
    prisma.arquivoAluno.count(),
    prisma.financeMonth.count(),
    prisma.financeRenewal.count(),
    prisma.financeEntry.count(),
  ])

  console.log("\n" + "=".repeat(64))
  console.log("RESUMO DO SEED")
  console.log("=".repeat(64))
  console.log(`Usuarios: ${usersCount}`)
  console.log(`Professores: ${professoresCount}`)
  console.log(`Alunos: ${alunosCount}`)
  console.log(`Historicos: ${historicosCount}`)
  console.log(`Planos de treino: ${planosTreinoCount}`)
  console.log(`Check-ins de treino: ${treinoCheckinsCount}`)
  console.log(`Moldes de treino: ${treinoModelosCount}`)
  console.log(`Alimentos: ${alimentosCount}`)
  console.log(`Planos de dieta: ${planosDietaCount}`)
  console.log(`Check-ins de dieta: ${dietaCheckinsCount}`)
  console.log(`Refresh sessions: ${refreshSessionsCount}`)
  console.log(`Convites: ${inviteCodesCount}`)
  console.log(`Lead links: ${leadLinksCount}`)
  console.log(`Lead clicks: ${leadClicksCount}`)
  console.log(`Lead attributions: ${leadAttributionsCount}`)
  console.log(`Notification dispatches: ${notificationDispatchesCount}`)
  console.log(`Fotos shape: ${fotosShapeCount}`)
  console.log(`Arquivos do aluno: ${arquivosAlunoCount}`)
  console.log(`Meses financeiros: ${financeMonthsCount}`)
  console.log(`Renovacoes financeiras: ${financeRenewalsCount}`)
  console.log(`Lancamentos financeiros: ${financeEntriesCount}`)
  console.log("=".repeat(64))

  console.log("\nCredenciais padrao")
  console.log(`Admin: ${ADMIN_EMAIL}`)
  console.log(`Professor padrao: ${PROFESSOR_PADRAO_EMAIL}`)

  if (isDevLike) {
    console.log(`Professor exemplo: ${PROFESSOR_EXEMPLO_EMAIL}`)
    console.log(`Professor especialista: ${PROFESSOR_ESPECIALISTA_EMAIL}`)
    console.log(`Aluno Ana: ${ALUNO_ANA_EMAIL}`)
    console.log(`Aluno Bruno: ${ALUNO_BRUNO_EMAIL}`)
    console.log(`Aluno Carla: ${ALUNO_CARLA_EMAIL}`)
    console.log(`Aluno Diego: ${ALUNO_DIEGO_EMAIL}`)
    console.log("\nRefresh tokens de teste")
    console.log(`Admin valido: ${ADMIN_REFRESH_TOKEN}`)
    console.log(`Professor valido: ${PROFESSOR_EXEMPLO_REFRESH_TOKEN}`)
    console.log(`Aluno Bruno valido: ${ALUNO_BRUNO_REFRESH_TOKEN}`)
    console.log(`Aluno Bruno revogado: ${ALUNO_BRUNO_REVOKED_REFRESH_TOKEN}`)
    console.log(`Aluno Ana expirado: ${ALUNO_ANA_EXPIRED_REFRESH_TOKEN}`)
    console.log("\nInvite codes de teste")
    console.log("PROF-BOOTSTRAP-2026")
    console.log("ADMIN-BOOTSTRAP-2026")
    console.log("PROF-USADO-2026")
    console.log("PROF-EXPIRADO-2026")
  }

  console.log("As senhas padrao ficam apenas no codigo do seed para uso local.")
  console.log("\nSeed finalizado com sucesso.\n")
}

runSeed()
  .catch((error) => {
    console.error("Erro ao executar seed:", error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
