import { describe, it, expect, beforeEach, afterAll, vi, afterEach } from "vitest"
import {
  CheckinStatus,
  DataSubjectRequestStatus,
  DataSubjectRequestType,
  ObjetivoDieta,
} from "@prisma/client"
import { PrivacyService } from "../../../src/application/use-cases/privacy/privacy-service"
import { CloudinaryService } from "../../../src/infraestructure/storage/cloudinary.service"
import {
  cleanDatabase,
  createTestAdmin,
  createTestAluno,
  createTestProfessor,
  prismaTest,
  teardownTestDatabase,
} from "../../helpers/test-helpers"

describe("PrivacyService", () => {
  const service = new PrivacyService()

  beforeEach(async () => {
    await cleanDatabase()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  afterAll(async () => {
    await teardownTestDatabase()
  })

  it("should publish legal documents without legal review disclaimer", async () => {
    const current = await service.getCurrentDocuments()

    for (const document of current.documents) {
      expect(document.content).toContain(
        "Este documento apresenta as regras e praticas vigentes",
      )
      expect(document.content).not.toMatch(/revisado por advogado/i)
      expect(document.content).not.toMatch(/publicacao definitiva/i)
    }
  })

  it("should export complete student workout and diet structures with professor generated data", async () => {
    const { user: professorUser, professor } = await createTestProfessor()
    const { user, aluno } = await createTestAluno(professor.id)

    const exercicio = await prismaTest.exercicio.create({
      data: {
        nome: "Supino reto",
        descricao: "Exercicio de peito",
        grupamentoMuscular: "PEITO",
        professorId: professor.id,
      },
    })

    const planoTreino = await prismaTest.planoTreino.create({
      data: {
        alunoId: aluno.id,
        professorId: professor.id,
        nome: "Treino completo",
        observacoes: "Plano elaborado pelo professor",
      },
    })

    const treinoDia = await prismaTest.treinoDia.create({
      data: {
        planoTreinoId: planoTreino.id,
        titulo: "Dia A",
        ordem: 1,
        observacoes: "Foco em peito",
      },
    })

    const treinoDiaExercicio = await prismaTest.treinoDiaExercicio.create({
      data: {
        treinoDiaId: treinoDia.id,
        exercicioId: exercicio.id,
        ordem: 1,
        series: 4,
        repeticoes: "8-10",
        observacoes: "Controlar descida",
      },
    })

    const treinoCheckin = await prismaTest.treinoCheckin.create({
      data: {
        alunoId: aluno.id,
        professorId: professor.id,
        planoTreinoId: planoTreino.id,
        treinoDiaId: treinoDia.id,
        status: CheckinStatus.CONCLUIDO,
        comentarioAluno: "Treino concluido",
        comentarioProfessor: "Aumentar carga na proxima semana",
      },
    })

    await prismaTest.treinoExercicioCheckin.create({
      data: {
        checkinId: treinoCheckin.id,
        treinoDiaExercicioId: treinoDiaExercicio.id,
        exercicioId: exercicio.id,
        concluido: true,
        cargaReal: 40,
        repeticoesReal: "10",
        comentarioAluno: "Boa execucao",
      },
    })

    const alimento = await prismaTest.alimento.create({
      data: {
        nome: "Arroz branco",
        calorias100g: 130,
        proteinas100g: 2.7,
        carboidratos100g: 28,
        gorduras100g: 0.3,
        professorId: professor.id,
      },
    })

    const planoDieta = await prismaTest.planoDieta.create({
      data: {
        alunoId: aluno.id,
        professorId: professor.id,
        nome: "Dieta completa",
        objetivo: ObjetivoDieta.MANTER,
        caloriasMeta: 2200,
        proteinasMetaG: 150,
        carboidratosMetaG: 250,
        gordurasMetaG: 70,
        observacoes: "Plano alimentar elaborado pelo professor",
      },
    })

    const dietaDia = await prismaTest.dietaDia.create({
      data: {
        planoDietaId: planoDieta.id,
        titulo: "Dia 1",
        ordem: 1,
        observacoes: "Dia base",
      },
    })

    const refeicao = await prismaTest.dietaRefeicao.create({
      data: {
        dietaDiaId: dietaDia.id,
        nome: "Almoco",
        ordem: 1,
        horario: "12:00",
        observacoes: "Priorizar proteina",
      },
    })

    await prismaTest.dietaRefeicaoItem.create({
      data: {
        dietaRefeicaoId: refeicao.id,
        alimentoId: alimento.id,
        ordem: 1,
        quantidadeGramas: 100,
        calorias: 130,
        proteinas: 2.7,
        carboidratos: 28,
        gorduras: 0.3,
      },
    })

    const dietaCheckin = await prismaTest.dietaCheckin.create({
      data: {
        alunoId: aluno.id,
        professorId: professor.id,
        planoDietaId: planoDieta.id,
        dietaDiaId: dietaDia.id,
        status: CheckinStatus.CONCLUIDO,
        observacaoDia: "Segui o plano",
        comentarioProfessor: "Manter distribuicao atual",
      },
    })

    await prismaTest.dietaRefeicaoCheckin.create({
      data: {
        checkinId: dietaCheckin.id,
        dietaRefeicaoId: refeicao.id,
        concluida: true,
        observacaoAluno: "Comi tudo",
      },
    })

    await prismaTest.alunoHistorico.create({
      data: {
        alunoId: aluno.id,
        pesoKg: 74,
        observacoes: "Registro feito pelo professor",
        registradoPor: professorUser.id,
      },
    })

    const exported = await service.exportUserData(user.id)
    const exportedAluno = exported.user.alunoProfile

    if (!exportedAluno) {
      throw new Error("Aluno nao exportado")
    }

    expect(exportedAluno.professor.user.nome).toBe(professorUser.nome)
    expect(exportedAluno.historico[0].registradoPorUser.nome).toBe(
      professorUser.nome,
    )

    const exportedWorkout = exportedAluno.planosTreino[0]
    expect(exportedWorkout.professor.user.nome).toBe(professorUser.nome)
    expect(exportedWorkout.dias[0].exercicios[0].exercicio.nome).toBe(
      "Supino reto",
    )
    expect(exportedWorkout.dias[0].exercicios[0].observacoes).toBe(
      "Controlar descida",
    )
    expect(exportedWorkout.checkins[0].comentarioProfessor).toBe(
      "Aumentar carga na proxima semana",
    )
    expect(exportedWorkout.checkins[0].exercicios[0].exercicio.nome).toBe(
      "Supino reto",
    )

    const exportedDiet = exportedAluno.planosDieta[0]
    expect(exportedDiet.professor.user.nome).toBe(professorUser.nome)
    expect(exportedDiet.dias[0].refeicoes[0].itens[0].alimento.nome).toBe(
      "Arroz branco",
    )
    expect(exportedDiet.dias[0].refeicoes[0].observacoes).toBe(
      "Priorizar proteina",
    )
    expect(exportedDiet.checkins[0].comentarioProfessor).toBe(
      "Manter distribuicao atual",
    )
    expect(
      exportedDiet.checkins[0].refeicoes[0].dietaRefeicao.itens[0].alimento.nome,
    ).toBe("Arroz branco")
  })

  it("should mark delete processing as failed when remote file deletion is incomplete", async () => {
    const admin = await createTestAdmin()
    const { professor } = await createTestProfessor()
    const { user, aluno } = await createTestAluno(professor.id)

    const foto = await prismaTest.fotoShape.create({
      data: {
        alunoId: aluno.id,
        url: "https://res.cloudinary.com/private/foto.jpg",
        publicId: "gym/private/fotos-shape/sensitive-public-id",
      },
    })
    const request = await prismaTest.dataSubjectRequest.create({
      data: {
        userId: user.id,
        type: DataSubjectRequestType.DELETE,
      },
    })

    vi.spyOn(CloudinaryService, "deleteFile").mockRejectedValue(
      new Error("provider failure with sensitive-public-id")
    )

    const updated = await service.processRequest(
      request.id,
      admin.id,
      DataSubjectRequestStatus.COMPLETED,
      "Concluir exclusao"
    )

    expect(updated.status).toBe(DataSubjectRequestStatus.FAILED)
    expect(updated.response).toContain("Exclusao incompleta")
    expect(updated.response).toContain("1 arquivo")
    expect(updated.response).not.toContain("sensitive-public-id")

    const anonymizedUser = await prismaTest.user.findUnique({
      where: { id: user.id },
    })
    expect(anonymizedUser?.blockedAt).toBeInstanceOf(Date)
    expect(anonymizedUser?.anonymizedAt).toBeInstanceOf(Date)
    expect(anonymizedUser?.email).not.toBe(user.email)

    expect(await prismaTest.fotoShape.findUnique({ where: { id: foto.id } })).toBeNull()

    const partialAudit = await prismaTest.privacyAuditEvent.findFirst({
      where: {
        subjectId: user.id,
        action: "USER_ERASURE_PARTIAL",
      },
    })
    expect(partialAudit?.metadata).toEqual({
      failures: [`foto:${foto.id}`],
    })
  })
})
