import { OnboardingStatus, type UserRole } from "@prisma/client"
import { prisma } from "@/infraestructure/database/prisma"
import { AppError } from "@/shared/errors/app-error"

type SupportedOnboardingRole = "PROFESSOR" | "ALUNO"

interface AuthContext {
  userId: string
  role: UserRole
}

interface ChecklistItem {
  key: string
  label: string
  description: string
  completed: boolean
}

const flowVersions: Record<SupportedOnboardingRole, string> = {
  PROFESSOR: "professor-v1",
  ALUNO: "aluno-v1",
}

const flowSteps: Record<SupportedOnboardingRole, string[]> = {
  PROFESSOR: [
    "welcome",
    "dashboard_metrics",
    "dashboard_feedbacks",
    "students_list",
    "student_create",
    "student_form",
    "evolution",
    "workouts",
    "exercises",
    "diet",
    "foods",
    "photos",
    "finance",
    "finish",
  ],
  ALUNO: [
    "welcome",
    "dashboard",
    "workout",
    "exercise_execution",
    "diet",
    "meal_checkin",
    "feedback",
    "profile_form",
    "photos",
    "evolution",
    "finish",
  ],
}

const ensureSupportedRole = (role: UserRole): SupportedOnboardingRole => {
  if (role === "PROFESSOR" || role === "ALUNO") return role
  throw new AppError("Onboarding não disponível para este perfil", 403)
}

export class OnboardingService {
  async get(auth: AuthContext) {
    const role = ensureSupportedRole(auth.role)
    const flowVersion = flowVersions[role]
    const state = await this.findOrCreateState(auth.userId, role, flowVersion)
    const checklist = await this.getChecklist(auth.userId, role, state.completedChecklistItems)
    const checklistCompleted = checklist.length > 0 && checklist.every((item) => item.completed)
    const context = await this.getContext(auth.userId, role)

    return {
      flow: {
        role,
        version: flowVersion,
        steps: flowSteps[role],
      },
      state,
      checklist,
      checklistCompleted,
      context,
      shouldStart:
        state.status === OnboardingStatus.NOT_STARTED ||
        state.status === OnboardingStatus.IN_PROGRESS,
    }
  }

  async progress(auth: AuthContext, currentStepKey: string) {
    const role = ensureSupportedRole(auth.role)
    const flowVersion = flowVersions[role]
    if (!flowSteps[role].includes(currentStepKey)) {
      throw new AppError("Passo de onboarding inválido", 400)
    }

    return prisma.userOnboardingState.upsert({
      where: {
        userId_role_flowVersion: {
          userId: auth.userId,
          role,
          flowVersion,
        },
      },
      create: {
        userId: auth.userId,
        role,
        flowVersion,
        status: OnboardingStatus.IN_PROGRESS,
        currentStepKey,
        startedAt: new Date(),
      },
      update: {
        status: OnboardingStatus.IN_PROGRESS,
        currentStepKey,
        startedAt: new Date(),
      },
    })
  }

  async complete(auth: AuthContext) {
    return this.updateStatus(auth, OnboardingStatus.COMPLETED, {
      completedAt: new Date(),
      currentStepKey: "finish",
    })
  }

  async dismiss(auth: AuthContext) {
    return this.updateStatus(auth, OnboardingStatus.DISMISSED, {
      dismissedAt: new Date(),
    })
  }

  async restart(auth: AuthContext) {
    const role = ensureSupportedRole(auth.role)
    const flowVersion = flowVersions[role]
    return prisma.userOnboardingState.upsert({
      where: {
        userId_role_flowVersion: {
          userId: auth.userId,
          role,
          flowVersion,
        },
      },
      create: {
        userId: auth.userId,
        role,
        flowVersion,
        status: OnboardingStatus.IN_PROGRESS,
        currentStepKey: "welcome",
        startedAt: new Date(),
        restartedAt: new Date(),
      },
      update: {
        status: OnboardingStatus.IN_PROGRESS,
        currentStepKey: "welcome",
        startedAt: new Date(),
        completedAt: null,
        dismissedAt: null,
        restartedAt: new Date(),
      },
    })
  }

  async completeChecklistItem(auth: AuthContext, key: string) {
    const role = ensureSupportedRole(auth.role)
    const flowVersion = flowVersions[role]
    const allowedKeys = this.checklistKeys(role)
    if (!allowedKeys.includes(key)) {
      throw new AppError("Item de checklist inválido", 400)
    }

    const state = await this.findOrCreateState(auth.userId, role, flowVersion)
    if (state.completedChecklistItems.includes(key)) {
      return state
    }

    return prisma.userOnboardingState.update({
      where: { id: state.id },
      data: {
        completedChecklistItems: [...state.completedChecklistItems, key],
      },
    })
  }

  private async findOrCreateState(userId: string, role: SupportedOnboardingRole, flowVersion: string) {
    return prisma.userOnboardingState.upsert({
      where: {
        userId_role_flowVersion: {
          userId,
          role,
          flowVersion,
        },
      },
      create: {
        userId,
        role,
        flowVersion,
        status: OnboardingStatus.NOT_STARTED,
      },
      update: {},
    })
  }

  private async updateStatus(
    auth: AuthContext,
    status: OnboardingStatus,
    data: Record<string, Date | string | null>,
  ) {
    const role = ensureSupportedRole(auth.role)
    const flowVersion = flowVersions[role]
    return prisma.userOnboardingState.upsert({
      where: {
        userId_role_flowVersion: {
          userId: auth.userId,
          role,
          flowVersion,
        },
      },
      create: {
        userId: auth.userId,
        role,
        flowVersion,
        status,
        startedAt: new Date(),
        ...data,
      },
      update: {
        status,
        ...data,
      },
    })
  }

  private checklistKeys(role: SupportedOnboardingRole) {
    return role === "PROFESSOR"
      ? [
          "CREATE_FIRST_STUDENT",
          "REGISTER_FIRST_ASSESSMENT",
          "CREATE_FIRST_WORKOUT",
          "CREATE_FIRST_DIET",
          "ANSWER_FIRST_FEEDBACK",
        ]
      : [
          "OPEN_FIRST_WORKOUT",
          "COMPLETE_FIRST_EXERCISE",
          "REGISTER_FIRST_MEAL",
          "SEND_FIRST_FEEDBACK",
          "SEND_FIRST_PHOTO",
        ]
  }

  private async getContext(userId: string, role: SupportedOnboardingRole) {
    if (role === "PROFESSOR") {
      const professor = await prisma.professor.findUnique({
        where: { userId },
        select: {
          id: true,
          alunos: {
            select: { id: true },
            orderBy: { createdAt: "desc" },
            take: 1,
          },
        },
      })

      return {
        professorId: professor?.id ?? null,
        firstAlunoId: professor?.alunos[0]?.id ?? null,
      }
    }

    const aluno = await prisma.aluno.findUnique({
      where: { userId },
      select: { id: true },
    })

    return {
      alunoId: aluno?.id ?? null,
    }
  }

  private async getChecklist(
    userId: string,
    role: SupportedOnboardingRole,
    completedChecklistItems: string[],
  ): Promise<ChecklistItem[]> {
    if (role === "PROFESSOR") {
      return this.getProfessorChecklist(userId)
    }
    return this.getAlunoChecklist(userId, completedChecklistItems)
  }

  private async getProfessorChecklist(userId: string): Promise<ChecklistItem[]> {
    const professor = await prisma.professor.findUnique({
      where: { userId },
      select: { id: true },
    })
    if (!professor) {
      return []
    }

    const [
      alunoCount,
      historicoCount,
      treinoCount,
      dietaCount,
      feedbackCount,
    ] = await Promise.all([
      prisma.aluno.count({ where: { professorId: professor.id } }),
      prisma.alunoHistorico.count({
        where: { aluno: { professorId: professor.id } },
      }),
      prisma.planoTreino.count({ where: { professorId: professor.id } }),
      prisma.planoDieta.count({ where: { professorId: professor.id } }),
      Promise.all([
        prisma.treinoCheckin.count({
          where: {
            professorId: professor.id,
            comentarioProfessor: { not: null },
          },
        }),
        prisma.dietaCheckin.count({
          where: {
            professorId: professor.id,
            comentarioProfessor: { not: null },
          },
        }),
      ]).then(([treino, dieta]) => treino + dieta),
    ])

    return [
      {
        key: "CREATE_FIRST_STUDENT",
        label: "Criar primeiro aluno",
        description: "Cadastre um aluno para liberar prescrição e acompanhamento.",
        completed: alunoCount > 0,
      },
      {
        key: "REGISTER_FIRST_ASSESSMENT",
        label: "Registrar primeira avaliação",
        description: "Adicione medidas para criar uma linha de base de evolução.",
        completed: historicoCount > 0,
      },
      {
        key: "CREATE_FIRST_WORKOUT",
        label: "Criar primeiro treino",
        description: "Monte um plano de treino ativo para um aluno.",
        completed: treinoCount > 0,
      },
      {
        key: "CREATE_FIRST_DIET",
        label: "Criar primeira dieta",
        description: "Crie um plano alimentar com metas e refeições.",
        completed: dietaCount > 0,
      },
      {
        key: "ANSWER_FIRST_FEEDBACK",
        label: "Responder primeiro feedback",
        description: "Registre um comentário de professor em treino ou dieta.",
        completed: feedbackCount > 0,
      },
    ]
  }

  private async getAlunoChecklist(
    userId: string,
    completedChecklistItems: string[],
  ): Promise<ChecklistItem[]> {
    const aluno = await prisma.aluno.findUnique({
      where: { userId },
      select: { id: true },
    })
    if (!aluno) {
      return []
    }

    const [
      exerciseCount,
      mealCount,
      feedbackCount,
      photoCount,
    ] = await Promise.all([
      prisma.treinoExercicioCheckin.count({
        where: {
          concluido: true,
          checkin: { alunoId: aluno.id },
        },
      }),
      prisma.dietaRefeicaoCheckin.count({
        where: {
          concluida: true,
          checkin: { alunoId: aluno.id },
        },
      }),
      Promise.all([
        prisma.treinoCheckin.count({
          where: { alunoId: aluno.id, comentarioAluno: { not: null } },
        }),
        prisma.dietaCheckin.count({
          where: { alunoId: aluno.id, observacaoDia: { not: null } },
        }),
      ]).then(([treino, dieta]) => treino + dieta),
      prisma.fotoShape.count({ where: { alunoId: aluno.id } }),
    ])

    return [
      {
        key: "OPEN_FIRST_WORKOUT",
        label: "Abrir primeiro treino",
        description: "Acesse a tela de treino para conhecer o plano do dia.",
        completed: completedChecklistItems.includes("OPEN_FIRST_WORKOUT"),
      },
      {
        key: "COMPLETE_FIRST_EXERCISE",
        label: "Concluir primeiro exercício",
        description: "Marque um exercício como concluído para gerar histórico.",
        completed: exerciseCount > 0,
      },
      {
        key: "REGISTER_FIRST_MEAL",
        label: "Registrar primeira refeição",
        description: "Marque uma refeição feita no check-in alimentar.",
        completed: mealCount > 0,
      },
      {
        key: "SEND_FIRST_FEEDBACK",
        label: "Enviar primeiro feedback",
        description: "Deixe um comentário no treino ou uma observação alimentar.",
        completed: feedbackCount > 0,
      },
      {
        key: "SEND_FIRST_PHOTO",
        label: "Enviar primeira foto",
        description: "Envie uma foto de evolução para comparação futura.",
        completed: photoCount > 0,
      },
    ]
  }
}

export const onboardingService = new OnboardingService()
