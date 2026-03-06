import {
  CheckinStatus,
  GrupamentoMuscular,
  LeadAttributionModel,
  ObjetivoDieta,
  OrigemAlimento,
  OrigemExercicio,
  PrismaClient,
  SexoBiologico,
  UserRole,
} from "@prisma/client"
import { hash } from "bcryptjs"

const prisma = new PrismaClient()

const ADMIN_EMAIL = "admin@gym.com"
const ADMIN_PASSWORD = "admin123"

const PROFESSOR_PADRAO_EMAIL = "professor.padrao@gym.com"
const PROFESSOR_PADRAO_PASSWORD = "senha_temporaria_123"

const PROFESSOR_EXEMPLO_EMAIL = "professor@gym.com"
const PROFESSOR_EXEMPLO_PASSWORD = "professor123"

const ALUNO_ANA_EMAIL = "ana.aluna@gym.com"
const ALUNO_ANA_PASSWORD = "aluno123"

const ALUNO_BRUNO_EMAIL = "bruno.aluno@gym.com"
const ALUNO_BRUNO_PASSWORD = "aluno123"

const round2 = (value: number) => Math.round(value * 100) / 100
const todayMinus = (days: number) => {
  const date = new Date()
  date.setDate(date.getDate() - days)
  return date
}

async function upsertUser(params: {
  email: string
  nome: string
  role: UserRole
  plainPassword: string
}) {
  const existing = await prisma.user.findUnique({
    where: { email: params.email },
  })

  if (existing) {
    return prisma.user.update({
      where: { id: existing.id },
      data: {
        nome: params.nome,
        role: params.role,
      },
    })
  }

  return prisma.user.create({
    data: {
      email: params.email,
      nome: params.nome,
      role: params.role,
      password: await hash(params.plainPassword, 10),
    },
  })
}

async function upsertProfessor(params: {
  userId: string
  telefone?: string
  especialidade?: string
  isPadrao: boolean
}) {
  return prisma.professor.upsert({
    where: { userId: params.userId },
    create: {
      userId: params.userId,
      telefone: params.telefone,
      especialidade: params.especialidade,
      isPadrao: params.isPadrao,
    },
    update: {
      telefone: params.telefone,
      especialidade: params.especialidade,
      isPadrao: params.isPadrao,
    },
  })
}

async function upsertAluno(params: {
  userId: string
  professorId: string
  sexoBiologico: SexoBiologico
  telefone: string
  alturaCm: number
  pesoKg: number
  idade: number
  cinturaCm: number
  quadrilCm: number
  pescocoCm: number
  diasTreinoSemana: number
  objetivosAtuais: string
  tomaRemedio: boolean
  remediosUso?: string
}) {
  return prisma.aluno.upsert({
    where: { userId: params.userId },
    create: {
      userId: params.userId,
      professorId: params.professorId,
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
      alimentos_quer_diario: ["Frango", "Arroz", "Ovos"],
      alimentos_nao_comem: ["Frituras"],
      alergias_alimentares: [],
      dores_articulares: null,
      suplementos_consumidos: ["Whey", "Creatina"],
      frequencia_horarios_refeicoes: "Cafe 07h, Almoço 12h, Jantar 20h",
    },
    update: {
      professorId: params.professorId,
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
    },
  })
}

async function ensureInviteCodes(adminUserId: string) {
  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + 365)

  await prisma.inviteCode.upsert({
    where: { code: "PROF-BOOTSTRAP-2026" },
    create: {
      code: "PROF-BOOTSTRAP-2026",
      role: UserRole.PROFESSOR,
      createdBy: adminUserId,
      expiresAt,
    },
    update: {
      role: UserRole.PROFESSOR,
      createdBy: adminUserId,
      expiresAt,
    },
  })

  await prisma.inviteCode.upsert({
    where: { code: "ADMIN-BOOTSTRAP-2026" },
    create: {
      code: "ADMIN-BOOTSTRAP-2026",
      role: UserRole.ADMIN,
      createdBy: adminUserId,
      expiresAt,
    },
    update: {
      role: UserRole.ADMIN,
      createdBy: adminUserId,
      expiresAt,
    },
  })
}

async function ensureHistorico(alunoId: string, adminUserId: string) {
  const existing = await prisma.alunoHistorico.count({ where: { alunoId } })
  if (existing >= 6) {
    return
  }

  await prisma.alunoHistorico.deleteMany({ where: { alunoId } })

  for (let month = 5; month >= 0; month -= 1) {
    const dataRegistro = new Date()
    dataRegistro.setMonth(dataRegistro.getMonth() - month)

    const progress = 5 - month

    await prisma.alunoHistorico.create({
      data: {
        alunoId,
        registradoPor: adminUserId,
        dataRegistro,
        pesoKg: round2(82 - progress * 1.4),
        alturaCm: 178,
        cinturaCm: 92 - progress * 2,
        quadrilCm: 100,
        pescocoCm: 39,
        bracoEsquerdoCm: round2(34 + progress * 0.4),
        bracoDireitoCm: round2(34.5 + progress * 0.4),
        pernaEsquerdaCm: round2(54 + progress * 0.6),
        pernaDireitaCm: round2(54.2 + progress * 0.6),
        percentualGordura: round2(22 - progress * 1.2),
        massaMuscularKg: round2(58 + progress * 1),
        observacoes:
          month === 0
            ? "Melhor fase fisica dos ultimos meses"
            : `Evolucao mensal ${6 - month}/6`,
      },
    })
  }
}

async function ensureExercicio(params: {
  nome: string
  descricao?: string
  grupamentoMuscular: GrupamentoMuscular
  origem: OrigemExercicio
  professorId?: string
  externalId?: string
  externalSource?: string
}) {
  const existing = await prisma.exercicio.findFirst({
    where: {
      origem: params.origem,
      externalId: params.externalId ?? null,
      externalSource: params.externalSource ?? null,
      professorId: params.professorId ?? null,
    },
  })

  if (existing) {
    return existing
  }

  return prisma.exercicio.create({
    data: {
      nome: params.nome,
      descricao: params.descricao,
      grupamentoMuscular: params.grupamentoMuscular,
      origem: params.origem,
      professorId: params.professorId ?? null,
      externalId: params.externalId ?? null,
      externalSource: params.externalSource ?? null,
    },
  })
}

async function ensureAlimento(params: {
  nome: string
  descricao?: string
  origem: OrigemAlimento
  calorias100g: number
  proteinas100g: number
  carboidratos100g: number
  gorduras100g: number
  fibras100g?: number
  professorId?: string
  externalId?: string
  fonteExterna?: string
}) {
  const existing = await prisma.alimento.findFirst({
    where: {
      origem: params.origem,
      professorId: params.professorId ?? null,
      externalId: params.externalId ?? null,
      fonteExterna: params.fonteExterna ?? null,
    },
  })

  if (existing) {
    return existing
  }

  return prisma.alimento.create({
    data: {
      nome: params.nome,
      descricao: params.descricao,
      origem: params.origem,
      calorias100g: params.calorias100g,
      proteinas100g: params.proteinas100g,
      carboidratos100g: params.carboidratos100g,
      gorduras100g: params.gorduras100g,
      fibras100g: params.fibras100g ?? null,
      professorId: params.professorId ?? null,
      externalId: params.externalId ?? null,
      fonteExterna: params.fonteExterna ?? null,
    },
  })
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

async function ensurePlanoTreino(params: {
  alunoId: string
  professorId: string
  exercicios: {
    supinoRetoId: string
    remadaCurvadaId: string
    agachamentoLivreId: string
    levantamentoTerraId: string
    desenvolvimentoOmbroId: string
    pranchaAbdominalId: string
  }
}) {
  const existing = await prisma.planoTreino.findFirst({
    where: {
      alunoId: params.alunoId,
      nome: "Treino Base Forca e Hipertrofia",
    },
    include: {
      dias: {
        include: {
          exercicios: true,
        },
      },
    },
  })

  if (existing) {
    return existing
  }

  return prisma.planoTreino.create({
    data: {
      alunoId: params.alunoId,
      professorId: params.professorId,
      nome: "Treino Base Forca e Hipertrofia",
      observacoes: "Treino em 3 dias com foco em progressao de carga.",
      ativo: true,
      dias: {
        create: [
          {
            titulo: "Treino A - Peito e Costas",
            ordem: 1,
            diaSemana: 1,
            observacoes: "Priorizar tecnica na primeira serie.",
            metodo: "Carga progressiva",
            exercicios: {
              create: [
                {
                  exercicioId: params.exercicios.supinoRetoId,
                  ordem: 1,
                  series: 4,
                  repeticoes: "8-10",
                  cargaSugerida: 60,
                },
                {
                  exercicioId: params.exercicios.remadaCurvadaId,
                  ordem: 2,
                  series: 4,
                  repeticoes: "8-10",
                  cargaSugerida: 50,
                },
                {
                  exercicioId: params.exercicios.desenvolvimentoOmbroId,
                  ordem: 3,
                  series: 3,
                  repeticoes: "10-12",
                  cargaSugerida: 24,
                },
              ],
            },
          },
          {
            titulo: "Treino B - Pernas e Core",
            ordem: 2,
            diaSemana: 3,
            metodo: "Controle de tempo 2-0-2",
            exercicios: {
              create: [
                {
                  exercicioId: params.exercicios.agachamentoLivreId,
                  ordem: 1,
                  series: 4,
                  repeticoes: "6-8",
                  cargaSugerida: 80,
                },
                {
                  exercicioId: params.exercicios.levantamentoTerraId,
                  ordem: 2,
                  series: 3,
                  repeticoes: "5-6",
                  cargaSugerida: 90,
                },
                {
                  exercicioId: params.exercicios.pranchaAbdominalId,
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
    include: {
      dias: {
        include: {
          exercicios: true,
        },
      },
    },
  })
}

async function ensureTreinoCheckin(params: {
  alunoId: string
  professorId: string
  planoTreinoId: string
  treinoDiaId: string
  exercicios: Array<{
    treinoDiaExercicioId: string
    exercicioId: string
    cargaReal?: number
    repeticoesReal?: string
  }>
}) {
  const existing = await prisma.treinoCheckin.findFirst({
    where: {
      alunoId: params.alunoId,
      treinoDiaId: params.treinoDiaId,
      status: CheckinStatus.CONCLUIDO,
    },
  })

  if (existing) {
    return existing
  }

  return prisma.treinoCheckin.create({
    data: {
      alunoId: params.alunoId,
      professorId: params.professorId,
      planoTreinoId: params.planoTreinoId,
      treinoDiaId: params.treinoDiaId,
      status: CheckinStatus.CONCLUIDO,
      iniciadoEm: todayMinus(3),
      finalizadoEm: todayMinus(3),
      dataTreino: todayMinus(3),
      comentarioAluno: "Treino intenso, consegui manter execucao.",
      comentarioProfessor: "Boa execucao. Vamos subir 2kg no proximo ciclo.",
      exercicios: {
        create: params.exercicios.map((item) => ({
          treinoDiaExercicioId: item.treinoDiaExercicioId,
          exercicioId: item.exercicioId,
          concluido: true,
          cargaReal: item.cargaReal,
          repeticoesReal: item.repeticoesReal,
          comentarioAluno: "Concluido sem dor articular",
        })),
      },
    },
  })
}

async function ensurePlanoDieta(params: {
  alunoId: string
  professorId: string
  arrozId: string
  frangoId: string
  bananaId: string
  aveiaId: string
  ovoId: string
}) {
  const existing = await prisma.planoDieta.findFirst({
    where: {
      alunoId: params.alunoId,
      nome: "Plano Alimentar Base - Definicao",
    },
    include: {
      dias: {
        include: {
          refeicoes: {
            include: {
              itens: true,
            },
          },
        },
      },
    },
  })

  if (existing) {
    return existing
  }

  const arroz = await prisma.alimento.findUniqueOrThrow({ where: { id: params.arrozId } })
  const frango = await prisma.alimento.findUniqueOrThrow({ where: { id: params.frangoId } })
  const banana = await prisma.alimento.findUniqueOrThrow({ where: { id: params.bananaId } })
  const aveia = await prisma.alimento.findUniqueOrThrow({ where: { id: params.aveiaId } })
  const ovo = await prisma.alimento.findUniqueOrThrow({ where: { id: params.ovoId } })

  const cafeBanana = macrosByGrams(banana, 120)
  const cafeAveia = macrosByGrams(aveia, 40)
  const cafeOvo = macrosByGrams(ovo, 100)

  const almocoArroz = macrosByGrams(arroz, 180)
  const almocoFrango = macrosByGrams(frango, 180)

  return prisma.planoDieta.create({
    data: {
      alunoId: params.alunoId,
      professorId: params.professorId,
      nome: "Plano Alimentar Base - Definicao",
      objetivo: ObjetivoDieta.PERDER,
      percentualGordura: 18.5,
      massaMagraKg: 63.2,
      tmbKcal: 1750,
      fatorAtividade: 1.55,
      caloriasMeta: 2300,
      proteinasMetaG: 180,
      carboidratosMetaG: 220,
      gordurasMetaG: 65,
      observacoes: "Hidratacao minima de 3L/dia e ajuste semanal conforme check-ins.",
      ativo: true,
      dias: {
        create: [
          {
            titulo: "Segunda a Sexta",
            ordem: 1,
            diaSemana: 1,
            observacoes: "Manter horarios consistentes",
            refeicoes: {
              create: [
                {
                  nome: "Cafe da manha",
                  ordem: 1,
                  horario: "07:30",
                  itens: {
                    create: [
                      {
                        alimentoId: banana.id,
                        ordem: 1,
                        quantidadeGramas: 120,
                        calorias: cafeBanana.calorias,
                        proteinas: cafeBanana.proteinas,
                        carboidratos: cafeBanana.carboidratos,
                        gorduras: cafeBanana.gorduras,
                        fibras: cafeBanana.fibras,
                      },
                      {
                        alimentoId: aveia.id,
                        ordem: 2,
                        quantidadeGramas: 40,
                        calorias: cafeAveia.calorias,
                        proteinas: cafeAveia.proteinas,
                        carboidratos: cafeAveia.carboidratos,
                        gorduras: cafeAveia.gorduras,
                        fibras: cafeAveia.fibras,
                      },
                      {
                        alimentoId: ovo.id,
                        ordem: 3,
                        quantidadeGramas: 100,
                        calorias: cafeOvo.calorias,
                        proteinas: cafeOvo.proteinas,
                        carboidratos: cafeOvo.carboidratos,
                        gorduras: cafeOvo.gorduras,
                        fibras: cafeOvo.fibras,
                      },
                    ],
                  },
                },
                {
                  nome: "Almoco",
                  ordem: 2,
                  horario: "12:30",
                  itens: {
                    create: [
                      {
                        alimentoId: arroz.id,
                        ordem: 1,
                        quantidadeGramas: 180,
                        calorias: almocoArroz.calorias,
                        proteinas: almocoArroz.proteinas,
                        carboidratos: almocoArroz.carboidratos,
                        gorduras: almocoArroz.gorduras,
                        fibras: almocoArroz.fibras,
                      },
                      {
                        alimentoId: frango.id,
                        ordem: 2,
                        quantidadeGramas: 180,
                        calorias: almocoFrango.calorias,
                        proteinas: almocoFrango.proteinas,
                        carboidratos: almocoFrango.carboidratos,
                        gorduras: almocoFrango.gorduras,
                        fibras: almocoFrango.fibras,
                      },
                    ],
                  },
                },
              ],
            },
          },
        ],
      },
    },
    include: {
      dias: {
        include: {
          refeicoes: {
            include: {
              itens: true,
            },
          },
        },
      },
    },
  })
}

async function ensureDietaCheckin(params: {
  alunoId: string
  professorId: string
  planoDietaId: string
  dietaDiaId: string
  refeicoes: Array<{ dietaRefeicaoId: string }>
}) {
  const existing = await prisma.dietaCheckin.findFirst({
    where: {
      alunoId: params.alunoId,
      dietaDiaId: params.dietaDiaId,
      status: CheckinStatus.CONCLUIDO,
    },
  })

  if (existing) {
    return existing
  }

  return prisma.dietaCheckin.create({
    data: {
      alunoId: params.alunoId,
      professorId: params.professorId,
      planoDietaId: params.planoDietaId,
      dietaDiaId: params.dietaDiaId,
      status: CheckinStatus.CONCLUIDO,
      iniciadoEm: todayMinus(2),
      finalizadoEm: todayMinus(2),
      dataDieta: todayMinus(2),
      observacaoDia: "Consegui seguir 90% do plano alimentar.",
      comentarioProfessor: "Excelente adesao. Manter consistencia.",
      refeicoes: {
        create: params.refeicoes.map((item) => ({
          dietaRefeicaoId: item.dietaRefeicaoId,
          concluida: true,
          observacaoAluno: "Refeicao concluida no horario planejado",
        })),
      },
    },
  })
}

async function ensureLeadData(params: {
  adminUserId: string
  alunoUserId: string
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

  const clicksCount = await prisma.leadClickEvent.count({
    where: { leadLinkId: instagram.id },
  })

  if (clicksCount === 0) {
    await prisma.leadClickEvent.createMany({
      data: [
        {
          leadLinkId: instagram.id,
          clickedAt: todayMinus(6),
          ipHash: "seed-ip-a",
          uaHash: "seed-ua-a",
          fingerprint: "seed-fp-instagram-a",
          referrer: "https://instagram.com",
          path: "/landing",
          utmSource: "instagram",
          utmMedium: "bio",
          utmCampaign: "marco-2026",
        },
        {
          leadLinkId: instagram.id,
          clickedAt: todayMinus(5),
          ipHash: "seed-ip-a",
          uaHash: "seed-ua-a",
          fingerprint: "seed-fp-instagram-a",
          referrer: "https://instagram.com",
          path: "/landing",
          utmSource: "instagram",
          utmMedium: "bio",
          utmCampaign: "marco-2026",
        },
        {
          leadLinkId: instagram.id,
          clickedAt: todayMinus(3),
          ipHash: "seed-ip-b",
          uaHash: "seed-ua-b",
          fingerprint: "seed-fp-instagram-b",
          referrer: "https://instagram.com",
          path: "/landing",
          utmSource: "instagram",
          utmMedium: "story",
          utmCampaign: "marco-2026",
        },
        {
          leadLinkId: parceria.id,
          clickedAt: todayMinus(2),
          ipHash: "seed-ip-c",
          uaHash: "seed-ua-c",
          fingerprint: "seed-fp-parceria-c",
          referrer: "https://whatsapp.com",
          path: "/landing",
          utmSource: "whatsapp",
          utmMedium: "indicacao",
          utmCampaign: "parceria-2026",
        },
      ],
    })
  }

  await prisma.leadAttribution.upsert({
    where: { userId: params.alunoUserId },
    create: {
      leadLinkId: instagram.id,
      userId: params.alunoUserId,
      modelo: LeadAttributionModel.FIRST_TOUCH,
    },
    update: {
      leadLinkId: instagram.id,
      modelo: LeadAttributionModel.FIRST_TOUCH,
    },
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

  const professorPadrao = await upsertProfessor({
    userId: professorPadraoUser.id,
    especialidade: "Professor padrao para novos alunos",
    isPadrao: true,
  })

  await ensureInviteCodes(adminUser.id)

  if (isDevLike) {
    const professorExemploUser = await upsertUser({
      email: PROFESSOR_EXEMPLO_EMAIL,
      nome: "Carlos Silva",
      role: UserRole.PROFESSOR,
      plainPassword: PROFESSOR_EXEMPLO_PASSWORD,
    })

    const professorExemplo = await upsertProfessor({
      userId: professorExemploUser.id,
      telefone: "11987654321",
      especialidade: "Musculacao e Hipertrofia",
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

    const alunoAna = await upsertAluno({
      userId: alunoAnaUser.id,
      professorId: professorExemplo.id,
      sexoBiologico: SexoBiologico.FEMININO,
      telefone: "11999998888",
      alturaCm: 166,
      pesoKg: 67.2,
      idade: 29,
      cinturaCm: 78,
      quadrilCm: 102,
      pescocoCm: 33,
      diasTreinoSemana: 4,
      objetivosAtuais: "Perder gordura e melhorar condicionamento",
      tomaRemedio: false,
    })

    const alunoBruno = await upsertAluno({
      userId: alunoBrunoUser.id,
      professorId: professorExemplo.id,
      sexoBiologico: SexoBiologico.MASCULINO,
      telefone: "11999997777",
      alturaCm: 178,
      pesoKg: 82,
      idade: 33,
      cinturaCm: 92,
      quadrilCm: 100,
      pescocoCm: 39,
      diasTreinoSemana: 3,
      objetivosAtuais: "Aumentar massa magra com controle de gordura",
      tomaRemedio: true,
      remediosUso: "Losartana 50mg",
    })

    await ensureHistorico(alunoAna.id, adminUser.id)
    await ensureHistorico(alunoBruno.id, adminUser.id)

    const supinoReto = await ensureExercicio({
      nome: "Supino Reto com Barra",
      descricao: "Foco em peitoral, ombro anterior e triceps",
      grupamentoMuscular: GrupamentoMuscular.PEITO,
      origem: OrigemExercicio.SISTEMA,
      externalSource: "SEED",
      externalId: "sys-supino-reto",
    })
    const remadaCurvada = await ensureExercicio({
      nome: "Remada Curvada",
      grupamentoMuscular: GrupamentoMuscular.COSTAS,
      origem: OrigemExercicio.SISTEMA,
      externalSource: "SEED",
      externalId: "sys-remada-curvada",
    })
    const agachamentoLivre = await ensureExercicio({
      nome: "Agachamento Livre",
      grupamentoMuscular: GrupamentoMuscular.PERNAS,
      origem: OrigemExercicio.PROFESSOR,
      professorId: professorExemplo.id,
      externalSource: "SEED",
      externalId: "prof-agachamento-livre",
    })
    const levantamentoTerra = await ensureExercicio({
      nome: "Levantamento Terra",
      grupamentoMuscular: GrupamentoMuscular.COSTAS,
      origem: OrigemExercicio.PROFESSOR,
      professorId: professorExemplo.id,
      externalSource: "SEED",
      externalId: "prof-levantamento-terra",
    })
    const desenvolvimentoOmbro = await ensureExercicio({
      nome: "Desenvolvimento com Halteres",
      grupamentoMuscular: GrupamentoMuscular.OMBRO,
      origem: OrigemExercicio.SISTEMA,
      externalSource: "SEED",
      externalId: "sys-desenvolvimento-halteres",
    })
    const pranchaAbdominal = await ensureExercicio({
      nome: "Prancha Abdominal",
      grupamentoMuscular: GrupamentoMuscular.ABDOMEN,
      origem: OrigemExercicio.SISTEMA,
      externalSource: "SEED",
      externalId: "sys-prancha-abdominal",
    })

    const planoTreino = await ensurePlanoTreino({
      alunoId: alunoBruno.id,
      professorId: professorExemplo.id,
      exercicios: {
        supinoRetoId: supinoReto.id,
        remadaCurvadaId: remadaCurvada.id,
        agachamentoLivreId: agachamentoLivre.id,
        levantamentoTerraId: levantamentoTerra.id,
        desenvolvimentoOmbroId: desenvolvimentoOmbro.id,
        pranchaAbdominalId: pranchaAbdominal.id,
      },
    })

    const treinoDiaA = planoTreino.dias.find((dia) => dia.ordem === 1)
    if (treinoDiaA) {
      await ensureTreinoCheckin({
        alunoId: alunoBruno.id,
        professorId: professorExemplo.id,
        planoTreinoId: planoTreino.id,
        treinoDiaId: treinoDiaA.id,
        exercicios: treinoDiaA.exercicios.map((exercicio, index) => ({
          treinoDiaExercicioId: exercicio.id,
          exercicioId: exercicio.exercicioId,
          cargaReal: exercicio.cargaSugerida ? exercicio.cargaSugerida + 2 : undefined,
          repeticoesReal: index === 0 ? "10-10-9-8" : "10-10-10",
        })),
      })
    }

    const arroz = await ensureAlimento({
      nome: "Arroz branco cozido",
      origem: OrigemAlimento.EXTERNO,
      calorias100g: 128,
      proteinas100g: 2.5,
      carboidratos100g: 28.1,
      gorduras100g: 0.2,
      fibras100g: 1.6,
      fonteExterna: "TACO",
      externalId: "seed-taco-arroz-branco",
    })

    const frango = await ensureAlimento({
      nome: "Peito de frango grelhado",
      origem: OrigemAlimento.EXTERNO,
      calorias100g: 159,
      proteinas100g: 32,
      carboidratos100g: 0,
      gorduras100g: 2.5,
      fibras100g: 0,
      fonteExterna: "TACO",
      externalId: "seed-taco-frango-grelhado",
    })

    const banana = await ensureAlimento({
      nome: "Banana prata",
      origem: OrigemAlimento.EXTERNO,
      calorias100g: 98,
      proteinas100g: 1.3,
      carboidratos100g: 26,
      gorduras100g: 0.1,
      fibras100g: 2,
      fonteExterna: "TACO",
      externalId: "seed-taco-banana-prata",
    })

    const aveia = await ensureAlimento({
      nome: "Aveia em flocos",
      origem: OrigemAlimento.SISTEMA,
      calorias100g: 394,
      proteinas100g: 13.9,
      carboidratos100g: 66.6,
      gorduras100g: 8.5,
      fibras100g: 9.1,
    })

    const ovo = await ensureAlimento({
      nome: "Ovo cozido",
      origem: OrigemAlimento.EXTERNO,
      calorias100g: 146,
      proteinas100g: 13.3,
      carboidratos100g: 0.6,
      gorduras100g: 9.5,
      fibras100g: 0,
      fonteExterna: "USDA",
      externalId: "seed-usda-ovo-cozido",
    })

    const planoDieta = await ensurePlanoDieta({
      alunoId: alunoBruno.id,
      professorId: professorExemplo.id,
      arrozId: arroz.id,
      frangoId: frango.id,
      bananaId: banana.id,
      aveiaId: aveia.id,
      ovoId: ovo.id,
    })

    const dietaDia = planoDieta.dias.find((dia) => dia.ordem === 1)
    if (dietaDia) {
      await ensureDietaCheckin({
        alunoId: alunoBruno.id,
        professorId: professorExemplo.id,
        planoDietaId: planoDieta.id,
        dietaDiaId: dietaDia.id,
        refeicoes: dietaDia.refeicoes.map((refeicao) => ({
          dietaRefeicaoId: refeicao.id,
        })),
      })
    }

    await ensureLeadData({
      adminUserId: adminUser.id,
      alunoUserId: alunoAnaUser.id,
    })
  }

  const [
    usersCount,
    professoresCount,
    alunosCount,
    historicosCount,
    planosTreinoCount,
    treinoCheckinsCount,
    alimentosCount,
    planosDietaCount,
    dietaCheckinsCount,
    inviteCodesCount,
    leadLinksCount,
    leadClicksCount,
    leadAttributionsCount,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.professor.count(),
    prisma.aluno.count(),
    prisma.alunoHistorico.count(),
    prisma.planoTreino.count(),
    prisma.treinoCheckin.count(),
    prisma.alimento.count(),
    prisma.planoDieta.count(),
    prisma.dietaCheckin.count(),
    prisma.inviteCode.count(),
    prisma.leadLink.count(),
    prisma.leadClickEvent.count(),
    prisma.leadAttribution.count(),
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
  console.log(`Alimentos: ${alimentosCount}`)
  console.log(`Planos de dieta: ${planosDietaCount}`)
  console.log(`Check-ins de dieta: ${dietaCheckinsCount}`)
  console.log(`Convites: ${inviteCodesCount}`)
  console.log(`Lead links: ${leadLinksCount}`)
  console.log(`Lead clicks: ${leadClicksCount}`)
  console.log(`Lead attributions: ${leadAttributionsCount}`)
  console.log("=".repeat(64))

  console.log("\nCredenciais padrao")
  console.log(`Admin: ${ADMIN_EMAIL} / ${ADMIN_PASSWORD}`)
  console.log(
    `Professor padrao: ${PROFESSOR_PADRAO_EMAIL} / ${PROFESSOR_PADRAO_PASSWORD}`,
  )

  if (isDevLike) {
    console.log(`Professor exemplo: ${PROFESSOR_EXEMPLO_EMAIL} / ${PROFESSOR_EXEMPLO_PASSWORD}`)
    console.log(`Aluno exemplo 1: ${ALUNO_ANA_EMAIL} / ${ALUNO_ANA_PASSWORD}`)
    console.log(`Aluno exemplo 2: ${ALUNO_BRUNO_EMAIL} / ${ALUNO_BRUNO_PASSWORD}`)
  }

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
