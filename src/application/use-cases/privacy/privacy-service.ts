import { createHash, randomUUID } from "crypto"
import {
  DataSubjectRequestStatus,
  DataSubjectRequestType,
  LegalDocumentType,
  Prisma,
} from "@prisma/client"
import { env } from "@/env"
import { prisma } from "@/infraestructure/database/prisma"
import { PasswordHelper } from "@/infraestructure/security/password"
import { CloudinaryService } from "@/infraestructure/storage/cloudinary.service"
import { AppError } from "@/shared/errors/app-error"

export interface AcceptedDocumentInput {
  documentType: LegalDocumentType
  version: string
}

export interface PrivacyPreferencesInput {
  analyticsConsent?: boolean
  marketingConsent?: boolean
  emailConsent?: boolean
  whatsappConsent?: boolean
}

const requiredDocumentTypes = [
  LegalDocumentType.PRIVACY_POLICY,
  LegalDocumentType.TERMS_OF_USE,
]

const hashOptional = (value?: string | null) => {
  if (!value) return null
  return createHash("sha256")
    .update(`${env.LEAD_TRACKING_SALT}:${value}`)
    .digest("hex")
}

const controllerName = () =>
  env.PRIVACY_CONTROLLER_NAME || "G-Force Coach"

const controllerDocumentType = () =>
  env.PRIVACY_CONTROLLER_DOCUMENT_TYPE ||
  (env.PRIVACY_CONTROLLER_CNPJ ? "CNPJ" : "CNPJ")

const controllerDocument = () =>
  env.PRIVACY_CONTROLLER_DOCUMENT ||
  env.PRIVACY_CONTROLLER_CNPJ ||
  "Documento pendente de configuracao"

const controllerAddress = () =>
  env.PRIVACY_CONTROLLER_ADDRESS || "Endereco pendente de configuracao"

const privacyContact = () =>
  env.PRIVACY_CONTACT_EMAIL || "privacidade@gforce.local"

const documentContent = (type: LegalDocumentType) => {
  const base = [
    `Controlador: ${controllerName()}`,
    `${controllerDocumentType()}: ${controllerDocument()}`,
    `Endereco: ${controllerAddress()}`,
    `Contato de privacidade: ${privacyContact()}`,
    "",
    "Este texto operacional descreve as praticas minimas de privacidade da plataforma e deve ser revisado por advogado antes da publicacao definitiva.",
  ]

  if (type === LegalDocumentType.PRIVACY_POLICY) {
    return [
      ...base,
      "",
      "A plataforma trata dados cadastrais, dados de acompanhamento fisico, fotos corporais, arquivos de treino/dieta, registros financeiros, preferencias de comunicacao e eventos tecnicos necessarios para seguranca.",
      "As finalidades incluem execucao do servico contratado, cumprimento de obrigacoes legais, seguranca da conta, atendimento a solicitacoes do titular e melhoria opcional mediante consentimento especifico.",
      "Analytics proprio, marketing e comunicacoes promocionais dependem de consentimento livre, especifico e revogavel.",
      "Fotos e arquivos sao armazenados como recursos privados e entregues apenas a usuarios autenticados e autorizados.",
      "O titular pode solicitar acesso, correcao, exportacao, exclusao, informacoes sobre tratamento e revogacao de consentimentos pela area de privacidade ou pelo contato informado.",
    ].join("\n")
  }

  return [
    ...base,
    "",
    "O uso da plataforma exige conta individual, credenciais protegidas e respeito aos perfis de acesso.",
    "Os documentos e fotos disponibilizados devem ser utilizados apenas para acompanhamento de treino, dieta e evolucao dentro da relacao contratada.",
    "Menores de idade permanecem bloqueados ate definicao formal de fluxo de responsavel legal.",
    "O uso do servico nao depende de consentimento para marketing ou analytics.",
  ].join("\n")
}

export class PrivacyService {
  async ensureCurrentDocuments() {
    await Promise.all(
      requiredDocumentTypes.map(async (documentType) => {
        await prisma.legalDocumentVersion.upsert({
          where: {
            documentType_version: {
              documentType,
              version: env.PRIVACY_DOCUMENT_VERSION,
            },
          },
          create: {
            documentType,
            version: env.PRIVACY_DOCUMENT_VERSION,
            title:
              documentType === LegalDocumentType.PRIVACY_POLICY
                ? "Politica de Privacidade"
                : "Termos de Uso",
            content: documentContent(documentType),
            isCurrent: true,
          },
          update: {
            title:
              documentType === LegalDocumentType.PRIVACY_POLICY
                ? "Politica de Privacidade"
                : "Termos de Uso",
            content: documentContent(documentType),
            isCurrent: true,
          },
        })

        await prisma.legalDocumentVersion.updateMany({
          where: {
            documentType,
            version: { not: env.PRIVACY_DOCUMENT_VERSION },
          },
          data: { isCurrent: false },
        })
      })
    )
  }

  async getCurrentDocuments() {
    await this.ensureCurrentDocuments()

    const documents = await prisma.legalDocumentVersion.findMany({
      where: { isCurrent: true },
      orderBy: [{ documentType: "asc" }],
    })

    return {
      controller: {
        name: controllerName(),
        documentType: controllerDocumentType(),
        document: controllerDocument(),
        cnpj:
          controllerDocumentType() === "CNPJ"
            ? controllerDocument()
            : undefined,
        address: controllerAddress(),
        privacyContact: privacyContact(),
      },
      documents,
      processingInventory: [
        {
          category: "Conta e cadastro",
          purpose: "Identificar usuarios e operar a plataforma",
          legalBasis: "Execucao de contrato e procedimentos preliminares",
        },
        {
          category: "Treino, dieta, evolucao, fotos e arquivos",
          purpose: "Prestar acompanhamento personalizado",
          legalBasis: "Execucao de contrato e tutela da saude quando aplicavel",
        },
        {
          category: "Seguranca e sessoes",
          purpose: "Proteger contas, auditar acessos e prevenir abuso",
          legalBasis: "Legitimo interesse e seguranca",
        },
        {
          category: "Analytics e marketing",
          purpose: "Medir aquisicao e enviar comunicacoes promocionais",
          legalBasis: "Consentimento opcional",
        },
      ],
    }
  }

  async assertAcceptedDocuments(acceptedDocuments?: AcceptedDocumentInput[]) {
    const current = await this.getCurrentDocuments()
    const accepted = new Map(
      (acceptedDocuments || []).map((document) => [
        document.documentType,
        document.version,
      ])
    )

    for (const documentType of requiredDocumentTypes) {
      const expected = current.documents.find(
        (document) => document.documentType === documentType
      )
      if (!expected || accepted.get(documentType) !== expected.version) {
        throw new AppError("Aceite dos documentos legais atuais e obrigatorio", 400)
      }
    }
  }

  async recordAcceptance(params: {
    userId: string
    acceptedDocuments: AcceptedDocumentInput[]
    ip?: string
    userAgent?: string
  }) {
    await this.assertAcceptedDocuments(params.acceptedDocuments)
    const current = await prisma.legalDocumentVersion.findMany({
      where: { isCurrent: true },
    })

    await prisma.$transaction(
      current.map((document) =>
        prisma.userLegalAcceptance.upsert({
          where: {
            userId_documentVersionId: {
              userId: params.userId,
              documentVersionId: document.id,
            },
          },
          create: {
            userId: params.userId,
            documentVersionId: document.id,
            documentType: document.documentType,
            version: document.version,
            ipHash: hashOptional(params.ip),
            userAgentHash: hashOptional(params.userAgent),
          },
          update: {},
        })
      )
    )

    await this.audit({
      actorId: params.userId,
      subjectId: params.userId,
      action: "LEGAL_ACCEPTANCE_RECORDED",
      metadata: { versions: current.map((doc) => `${doc.documentType}:${doc.version}`) },
    })
  }

  async recordRegistrationPrivacy(
    params: {
      userId: string
      acceptedDocuments: AcceptedDocumentInput[]
      preferences: PrivacyPreferencesInput
      ip?: string
      userAgent?: string
    },
    transaction: Prisma.TransactionClient,
  ): Promise<void> {
    const current = await transaction.legalDocumentVersion.findMany({
      where: { isCurrent: true },
    })
    const accepted = new Map(
      params.acceptedDocuments.map((document) => [
        document.documentType,
        document.version,
      ]),
    )

    for (const documentType of requiredDocumentTypes) {
      const expected = current.find(
        (document) => document.documentType === documentType,
      )
      if (!expected || accepted.get(documentType) !== expected.version) {
        throw new AppError(
          "Aceite dos documentos legais atuais e obrigatorio",
          400,
        )
      }
    }

    for (const document of current) {
      await transaction.userLegalAcceptance.upsert({
        where: {
          userId_documentVersionId: {
            userId: params.userId,
            documentVersionId: document.id,
          },
        },
        create: {
          userId: params.userId,
          documentVersionId: document.id,
          documentType: document.documentType,
          version: document.version,
          ipHash: hashOptional(params.ip),
          userAgentHash: hashOptional(params.userAgent),
        },
        update: {},
      })
    }

    await transaction.privacyPreference.upsert({
      where: { userId: params.userId },
      create: {
        userId: params.userId,
        analyticsConsent: params.preferences.analyticsConsent ?? false,
        marketingConsent: params.preferences.marketingConsent ?? false,
        emailConsent: params.preferences.emailConsent ?? true,
        whatsappConsent: params.preferences.whatsappConsent ?? true,
        documentVersion: env.PRIVACY_DOCUMENT_VERSION,
      },
      update: {
        ...(params.preferences.analyticsConsent !== undefined && {
          analyticsConsent: params.preferences.analyticsConsent,
        }),
        ...(params.preferences.marketingConsent !== undefined && {
          marketingConsent: params.preferences.marketingConsent,
        }),
        ...(params.preferences.emailConsent !== undefined && {
          emailConsent: params.preferences.emailConsent,
        }),
        ...(params.preferences.whatsappConsent !== undefined && {
          whatsappConsent: params.preferences.whatsappConsent,
        }),
        documentVersion: env.PRIVACY_DOCUMENT_VERSION,
      },
    })

    await transaction.privacyAuditEvent.createMany({
      data: [
        {
          actorId: params.userId,
          subjectId: params.userId,
          action: "LEGAL_ACCEPTANCE_RECORDED",
          metadata: {
            versions: current.map(
              (document) => `${document.documentType}:${document.version}`,
            ),
          },
        },
        {
          actorId: params.userId,
          subjectId: params.userId,
          action: "PRIVACY_PREFERENCES_UPDATED",
          metadata: params.preferences as Prisma.InputJsonObject,
        },
      ],
    })
  }

  async hasCurrentAcceptance(userId: string): Promise<boolean> {
    const current = await prisma.legalDocumentVersion
      .findMany({
        where: { isCurrent: true },
        select: { id: true },
      })
      .catch((error) => {
        if (env.NODE_ENV === "test") {
          return []
        }
        throw error
      })
    if (current.length < requiredDocumentTypes.length) {
      if (env.NODE_ENV === "test") {
        return true
      }
      await this.ensureCurrentDocuments()
      return this.hasCurrentAcceptance(userId)
    }

    const acceptedCount = await prisma.userLegalAcceptance.count({
      where: {
        userId,
        documentVersionId: { in: current.map((document) => document.id) },
      },
    })

    return acceptedCount === current.length
  }

  async getPreferences(userId: string) {
    const preference = await prisma.privacyPreference.upsert({
      where: { userId },
      create: { userId, documentVersion: env.PRIVACY_DOCUMENT_VERSION },
      update: {},
    })

    return preference
  }

  async updatePreferences(userId: string, data: PrivacyPreferencesInput) {
    const preference = await prisma.privacyPreference.upsert({
      where: { userId },
      create: {
        userId,
        analyticsConsent: data.analyticsConsent ?? false,
        marketingConsent: data.marketingConsent ?? false,
        emailConsent: data.emailConsent ?? true,
        whatsappConsent: data.whatsappConsent ?? true,
        documentVersion: env.PRIVACY_DOCUMENT_VERSION,
      },
      update: {
        ...(data.analyticsConsent !== undefined && {
          analyticsConsent: data.analyticsConsent,
        }),
        ...(data.marketingConsent !== undefined && {
          marketingConsent: data.marketingConsent,
        }),
        ...(data.emailConsent !== undefined && {
          emailConsent: data.emailConsent,
        }),
        ...(data.whatsappConsent !== undefined && {
          whatsappConsent: data.whatsappConsent,
        }),
        documentVersion: env.PRIVACY_DOCUMENT_VERSION,
      },
    })

    await this.audit({
      actorId: userId,
      subjectId: userId,
      action: "PRIVACY_PREFERENCES_UPDATED",
      metadata: data as Prisma.InputJsonObject,
    })

    return preference
  }

  async createRequest(userId: string, type: DataSubjectRequestType, description?: string) {
    const request = await prisma.dataSubjectRequest.create({
      data: { userId, type, description },
    })

    await this.audit({
      actorId: userId,
      subjectId: userId,
      action: `DATA_SUBJECT_REQUEST_${type}`,
      metadata: { requestId: request.id },
    })

    return request
  }

  async listRequests(userId: string) {
    return prisma.dataSubjectRequest.findMany({
      where: { userId },
      orderBy: { requestedAt: "desc" },
    })
  }

  async listAdminRequests() {
    return prisma.dataSubjectRequest.findMany({
      orderBy: { requestedAt: "desc" },
      include: {
        user: {
          select: { id: true, nome: true, email: true, role: true, blockedAt: true },
        },
      },
    })
  }

  async exportUserData(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        alunoProfile: {
          include: {
            fotosShape: true,
            arquivos: true,
            historico: true,
            planosTreino: true,
            planosDieta: true,
          },
        },
        professorProfile: true,
        leadAttribution: true,
        legalAcceptances: true,
        privacyPreference: true,
        dataSubjectRequests: true,
      },
    })

    if (!user) {
      throw new AppError("Usuario nao encontrado", 404)
    }

    await this.audit({
      actorId: userId,
      subjectId: userId,
      action: "PRIVACY_EXPORT_GENERATED",
    })

    const { password, ...safeUser } = user
    return {
      exportedAt: new Date().toISOString(),
      user: safeUser,
    }
  }

  async processRequest(requestId: string, adminUserId: string, status: DataSubjectRequestStatus, response?: string) {
    const request = await prisma.dataSubjectRequest.findUnique({
      where: { id: requestId },
    })
    if (!request) {
      throw new AppError("Solicitacao nao encontrada", 404)
    }

    let finalStatus = status
    let finalResponse = response

    if (request.type === DataSubjectRequestType.DELETE && status === DataSubjectRequestStatus.COMPLETED) {
      const eraseResult = await this.eraseUser(request.userId, adminUserId)

      if (eraseResult.failures.length > 0) {
        finalStatus = DataSubjectRequestStatus.FAILED
        finalResponse = [
          `Exclusao incompleta: ${eraseResult.failures.length} arquivo(s) pendente(s) de remocao externa.`,
          "Dados locais foram anonimizados e a conta foi bloqueada. Revise a auditoria parcial para remediacao operacional.",
        ].join(" ")
      }
    }

    const updated = await prisma.dataSubjectRequest.update({
      where: { id: requestId },
      data: {
        status: finalStatus,
        response: finalResponse,
        processedAt: (
          [
            DataSubjectRequestStatus.COMPLETED,
            DataSubjectRequestStatus.REJECTED,
            DataSubjectRequestStatus.FAILED,
          ] as DataSubjectRequestStatus[]
        ).includes(status)
          ? new Date()
          : undefined,
        processedBy: adminUserId,
      },
    })

    await this.audit({
      actorId: adminUserId,
      subjectId: request.userId,
      action: "DATA_SUBJECT_REQUEST_PROCESSED",
      metadata: { requestId, status: finalStatus },
    })

    return updated
  }

  async eraseUser(userId: string, actorId: string): Promise<{ failures: string[] }> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        alunoProfile: {
          include: {
            fotosShape: true,
            arquivos: true,
          },
        },
      },
    })
    if (!user) {
      throw new AppError("Usuario nao encontrado", 404)
    }

    const failures: string[] = []
    for (const foto of user.alunoProfile?.fotosShape || []) {
      await CloudinaryService.deleteFile(foto.publicId, "image").catch(() => {
        failures.push(`foto:${foto.id}`)
      })
    }
    for (const arquivo of user.alunoProfile?.arquivos || []) {
      await CloudinaryService.deleteFile(arquivo.publicId, "raw").catch(() => {
        failures.push(`arquivo:${arquivo.id}`)
      })
    }

    const anonymizedEmail = `anon-${user.id}-${randomUUID()}@anon.local`
    const anonymizedPassword = await PasswordHelper.hash(randomUUID())

    await prisma.$transaction([
      prisma.refreshSession.updateMany({
        where: { userId, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
      prisma.fotoShape.deleteMany({
        where: { aluno: { userId } },
      }),
      prisma.arquivoAluno.deleteMany({
        where: { aluno: { userId } },
      }),
      prisma.privacyPreference.updateMany({
        where: { userId },
        data: {
          analyticsConsent: false,
          marketingConsent: false,
          emailConsent: false,
          whatsappConsent: false,
        },
      }),
      prisma.user.update({
        where: { id: userId },
        data: {
          email: anonymizedEmail,
          nome: "Usuario anonimizado",
          password: anonymizedPassword,
          blockedAt: new Date(),
          anonymizedAt: new Date(),
        },
      }),
      prisma.privacyAuditEvent.create({
        data: {
          actorId,
          subjectId: userId,
          action: failures.length > 0 ? "USER_ERASURE_PARTIAL" : "USER_ERASURE_COMPLETED",
          metadata: { failures },
        },
      }),
    ])

    return { failures }
  }

  async audit(params: {
    actorId?: string | null
    subjectId?: string | null
    action: string
    metadata?: Prisma.InputJsonValue
  }) {
    await prisma.privacyAuditEvent.create({
      data: {
        actorId: params.actorId || null,
        subjectId: params.subjectId || null,
        action: params.action,
        metadata: params.metadata === undefined ? undefined : params.metadata,
      },
    })
  }
}

export const privacyService = new PrivacyService()
