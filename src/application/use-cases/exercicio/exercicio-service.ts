import { type GrupamentoMuscular, OrigemExercicio } from "@prisma/client"
import { env } from "@/env"
import { prisma } from "@/infraestructure/database/prisma"
import { AppError } from "@/shared/errors/app-error"
import { UserRole } from "@/domain/entities/user"
import { CloudinaryService } from "@/infraestructure/storage/cloudinary.service"
import {
  UploadTokenHelper,
  type UploadTokenPayload,
} from "@/infraestructure/security/upload-token"
import { PrismaStorageCleanupRepository } from "@/infraestructure/database/respositories/prisma-storage-cleanup-repository"
import { EnqueueStorageDeletionUseCase } from "../storage-cleanup/enqueue-storage-deletion"
import {
  StorageDeletionCategory,
  StorageResourceType,
} from "@/domain/entities/storage-cleanup"

interface AuthContext {
  userId: string
  role: UserRole
}

interface ListExerciciosInput {
  q?: string
  grupamento?: GrupamentoMuscular
}

interface CreateExercicioInput {
  nome: string
  descricao?: string
  grupamentoMuscular: GrupamentoMuscular
}

interface ImportExercicioExternoInput {
  externalId: string
  nome: string
  descricao?: string
  grupamentoMuscular: GrupamentoMuscular
  externalSource: string
}

interface ExercicioExterno {
  externalId: string
  nome: string
  descricao?: string
  grupamentoMuscular: GrupamentoMuscular
  externalSource: string
}

type ExercicioMediaKind = "execucao" | "aparelho"

const fallbackExternalExercises: ExercicioExterno[] = [
  {
    externalId: "fallback-1",
    nome: "Supino Reto",
    descricao: "Exercício composto para peitoral.",
    grupamentoMuscular: "PEITO",
    externalSource: "fallback",
  },
  {
    externalId: "fallback-2",
    nome: "Agachamento Livre",
    descricao: "Exercício composto para membros inferiores.",
    grupamentoMuscular: "PERNAS",
    externalSource: "fallback",
  },
  {
    externalId: "fallback-3",
    nome: "Remada Curvada",
    descricao: "Exercício para dorsais e estabilizadores.",
    grupamentoMuscular: "COSTAS",
    externalSource: "fallback",
  },
]

const EXTERNAL_FETCH_TIMEOUT_MS = 3500
const storageDeletion = new EnqueueStorageDeletionUseCase(
  new PrismaStorageCleanupRepository(),
)
const normalizeSearch = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()

export class ExercicioService {
  async listExercicios(
    auth: AuthContext,
    input: ListExerciciosInput,
  ) {
    const where = {
      AND: [
        input.q
          ? {
              nome: {
                contains: input.q,
                mode: "insensitive" as const,
              },
            }
          : {},
        input.grupamento ? { grupamentoMuscular: input.grupamento } : {},
        auth.role === UserRole.ADMIN
          ? {}
          : {
              OR: [
                { origem: OrigemExercicio.SISTEMA },
                { origem: OrigemExercicio.EXTERNO },
                { origem: OrigemExercicio.PROFESSOR },
              ],
            },
      ],
    }

    return prisma.exercicio.findMany({
      where,
      orderBy: [{ nome: "asc" }],
    })
  }

  async createProfessorExercicio(auth: AuthContext, input: CreateExercicioInput) {
    if (auth.role === UserRole.ADMIN) {
      return prisma.exercicio.create({
        data: {
          nome: input.nome,
          descricao: input.descricao,
          grupamentoMuscular: input.grupamentoMuscular,
          origem: OrigemExercicio.SISTEMA,
          professorId: null,
        },
      })
    }

    const professorId = await this.resolveProfessorId(auth)
    if (!professorId) {
      throw new AppError("Professor não encontrado para criar exercício", 404)
    }

    return prisma.exercicio.create({
      data: {
        nome: input.nome,
        descricao: input.descricao,
        grupamentoMuscular: input.grupamentoMuscular,
        origem: OrigemExercicio.PROFESSOR,
        professorId,
      },
    })
  }

  async importExternalExercicio(
    auth: AuthContext,
    input: ImportExercicioExternoInput,
  ) {
    const professorId = await this.resolveProfessorId(auth)

    const existing = await prisma.exercicio.findFirst({
      where: {
        origem: OrigemExercicio.EXTERNO,
        externalId: input.externalId,
        externalSource: input.externalSource,
      },
    })

    if (existing) {
      return existing
    }

    return prisma.exercicio.create({
      data: {
        nome: input.nome,
        descricao: input.descricao,
        grupamentoMuscular: input.grupamentoMuscular,
        origem: OrigemExercicio.EXTERNO,
        externalId: input.externalId,
        externalSource: input.externalSource,
        professorId: professorId ?? null,
      },
    })
  }

  async searchExternalExercicios(q?: string, limit = 20): Promise<ExercicioExterno[]> {
    const normalizedQuery = q ? normalizeSearch(q) : ""

    try {
      const response = await fetch(
        `${env.EXERCISE_API_BASE_URL}/exerciseinfo/?language=2&limit=200`,
        {
          signal: AbortSignal.timeout(EXTERNAL_FETCH_TIMEOUT_MS),
        },
      )

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      const payload = (await response.json()) as {
        results?: Array<{
          id: number
          name?: string
          description?: string
          category?: { name?: string }
        }>
      }

      const mapped = (payload.results || [])
        .map((item) => ({
          externalId: String(item.id),
          nome: item.name?.trim() || "Exercício sem nome",
          descricao: this.stripHtml(item.description || "") || undefined,
          grupamentoMuscular: this.mapCategoryToGrupamento(item.category?.name),
          externalSource: "wger",
        }))
        .filter(
          (item) =>
            !q || normalizeSearch(item.nome).includes(normalizedQuery),
        )
        .slice(0, limit)

      if (mapped.length > 0) {
        return mapped
      }

      const fallbackFiltered = fallbackExternalExercises
        .filter(
          (item) =>
            !q || normalizeSearch(item.nome).includes(normalizedQuery),
        )
        .slice(0, limit)

      if (fallbackFiltered.length > 0) {
        return fallbackFiltered
      }

      return q ? [] : fallbackExternalExercises.slice(0, limit)
    } catch (error) {
      console.error("[exercicios] Falha ao buscar API externa:", error)
      const fallbackFiltered = fallbackExternalExercises
        .filter(
          (item) =>
            !q || normalizeSearch(item.nome).includes(normalizedQuery),
        )
        .slice(0, limit)

      if (fallbackFiltered.length > 0) {
        return fallbackFiltered
      }

      return q ? [] : fallbackExternalExercises.slice(0, limit)
    }
  }

  // Autorizacao, existencia do exercicio e tipo de arquivo aceito valem para
  // os dois caminhos de upload (multipart e assinado). Concentrado aqui para
  // que o caminho assinado nao possa, por esquecimento, aceitar um mimetype
  // que o multipart recusa.
  private async authorizeExerciseMediaEdit(
    auth: AuthContext,
    input: { exercicioId: string; kind: ExercicioMediaKind; mimetype: string },
  ) {
    if (auth.role === UserRole.ALUNO) {
      throw new AppError("Alunos não podem editar mídia de exercícios", 403)
    }

    const exercicio = await prisma.exercicio.findUnique({
      where: { id: input.exercicioId },
    })

    if (!exercicio) {
      throw new AppError("Exercício não encontrado", 404)
    }

    if (
      input.kind === "execucao" &&
      !["image/gif", "image/webp"].includes(input.mimetype)
    ) {
      throw new AppError("Use GIF ou WebP para a demonstração de execução", 400)
    }

    if (
      input.kind === "aparelho" &&
      !["image/jpeg", "image/png", "image/webp"].includes(input.mimetype)
    ) {
      throw new AppError("Use JPG, PNG ou WebP para a foto do aparelho", 400)
    }

    const currentPublicId =
      input.kind === "execucao"
        ? exercicio.executionGifPublicId
        : exercicio.equipmentImagePublicId

    return { exercicio, currentPublicId }
  }

  // Passo 1 do upload assinado: devolve ao navegador os parametros que ele
  // precisa postar direto no Cloudinary, mais um token que amarra aquele
  // public_id a este exercicio/kind. O token e o que impede a confirmacao de
  // apontar para um asset arbitrario da conta.
  async createExerciseMediaUploadSignature(
    auth: AuthContext,
    input: {
      exercicioId: string
      kind: ExercicioMediaKind
      mimetype: string
    },
  ) {
    await this.authorizeExerciseMediaEdit(auth, input)

    const signed = CloudinaryService.signExerciseMediaUpload({
      exercicioId: input.exercicioId,
      kind: input.kind,
      mimetype: input.mimetype,
    })

    return {
      uploadUrl: signed.uploadUrl,
      apiKey: signed.apiKey,
      params: signed.params,
      signature: signed.signature,
      uploadToken: UploadTokenHelper.generate({
        exercicioId: input.exercicioId,
        kind: input.kind,
        publicId: signed.publicId,
      }),
    }
  }

  // Passo 2: o navegador ja enviou o arquivo e volta com o token. Nada do que
  // o cliente diz sobre o asset e aceito - o public_id sai do token, e a URL
  // sai da consulta ao Cloudinary.
  async confirmExerciseMediaUpload(
    auth: AuthContext,
    input: {
      exercicioId: string
      kind: ExercicioMediaKind
      uploadToken: string
    },
  ) {
    let tokenPayload: UploadTokenPayload

    try {
      tokenPayload = UploadTokenHelper.verify(input.uploadToken)
    } catch {
      throw new AppError("Token de upload inválido ou expirado", 400)
    }

    // O token prova quem autorizou, mas a rota diz sobre qual exercicio a
    // confirmacao e. Divergencia significa token de outro upload sendo
    // reaproveitado aqui.
    if (
      tokenPayload.exercicioId !== input.exercicioId ||
      tokenPayload.kind !== input.kind
    ) {
      throw new AppError("Token de upload não corresponde a esta mídia", 400)
    }

    const { currentPublicId } = await this.authorizeExerciseMediaEdit(auth, {
      exercicioId: input.exercicioId,
      kind: input.kind,
      // O mimetype ja foi validado ao assinar, e o formato final foi fixado na
      // propria assinatura - o cliente nao teve como muda-lo.
      mimetype: input.kind === "execucao" ? "image/gif" : "image/jpeg",
    })

    const uploadResult = await CloudinaryService.findUploadedResource(
      tokenPayload.publicId,
    )

    if (!uploadResult) {
      throw new AppError("Arquivo não encontrado no armazenamento", 404)
    }

    return this.persistExerciseMedia({
      exercicioId: input.exercicioId,
      kind: input.kind,
      uploadResult,
      currentPublicId,
    })
  }

  async uploadExerciseMedia(
    auth: AuthContext,
    input: {
      exercicioId: string
      kind: ExercicioMediaKind
      buffer: Buffer
      mimetype: string
    },
  ) {
    const { currentPublicId } = await this.authorizeExerciseMediaEdit(auth, input)

    const uploadResult =
      input.kind === "execucao"
        ? await CloudinaryService.uploadExerciseExecutionGif(
            input.buffer,
            input.exercicioId,
            input.mimetype,
          )
        : await CloudinaryService.uploadExerciseEquipmentImage(
            input.buffer,
            input.exercicioId,
          )

    return this.persistExerciseMedia({
      exercicioId: input.exercicioId,
      kind: input.kind,
      uploadResult,
      currentPublicId,
    })
  }

  // Extraido de uploadExerciseMedia para que o caminho de upload assinado
  // (confirmExerciseMediaUpload) reuse exatamente a mesma troca atomica e a
  // mesma compensacao, em vez de reimplementa-las e divergir com o tempo.
  private async persistExerciseMedia(input: {
    exercicioId: string
    kind: ExercicioMediaKind
    uploadResult: { url: string; publicId: string }
    currentPublicId: string | null
  }) {
    const { uploadResult, currentPublicId } = input

    const updateResult = await prisma.exercicio
      .updateMany({
        where: {
          id: input.exercicioId,
          ...(input.kind === "execucao"
            ? { executionGifPublicId: currentPublicId }
            : { equipmentImagePublicId: currentPublicId }),
        },
        data:
          input.kind === "execucao"
            ? {
                executionGifUrl: uploadResult.url,
                executionGifPublicId: uploadResult.publicId,
              }
            : {
                equipmentImageUrl: uploadResult.url,
                equipmentImagePublicId: uploadResult.publicId,
              },
      })
      .catch(async (error) => {
        await storageDeletion.deleteNowOrEnqueue({
          resourceCategory: StorageDeletionCategory.COMPENSATION_UPLOAD,
          resourceType: StorageResourceType.IMAGE,
          publicId: uploadResult.publicId,
          relatedRecordId: input.exercicioId,
        })

        throw error
      })

    if (updateResult.count !== 1) {
      await storageDeletion.deleteNowOrEnqueue({
        resourceCategory: StorageDeletionCategory.COMPENSATION_UPLOAD,
        resourceType: StorageResourceType.IMAGE,
        publicId: uploadResult.publicId,
        relatedRecordId: input.exercicioId,
      })

      throw new AppError("Mídia do exercício foi alterada por outra requisição", 409)
    }

    if (currentPublicId) {
      await storageDeletion.deleteNowOrEnqueue({
        resourceCategory: StorageDeletionCategory.EXERCISE_MEDIA,
        resourceType: StorageResourceType.IMAGE,
        publicId: currentPublicId,
        relatedRecordId: input.exercicioId,
      })
    }

    const updated = await prisma.exercicio.findUnique({
      where: { id: input.exercicioId },
    })

    if (!updated) {
      throw new AppError("Exercício não encontrado", 404)
    }

    return updated
  }

  async clearExerciseMedia(
    auth: AuthContext,
    input: {
      exercicioId: string
      kind: ExercicioMediaKind
    },
  ) {
    if (auth.role === UserRole.ALUNO) {
      throw new AppError("Alunos não podem editar mídia de exercícios", 403)
    }

    const exercicio = await prisma.exercicio.findUnique({
      where: { id: input.exercicioId },
    })

    if (!exercicio) {
      throw new AppError("Exercício não encontrado", 404)
    }

    const currentPublicId =
      input.kind === "execucao"
        ? exercicio.executionGifPublicId
        : exercicio.equipmentImagePublicId

    const updated = await prisma.exercicio.update({
      where: { id: input.exercicioId },
      data:
        input.kind === "execucao"
          ? {
              executionGifUrl: null,
              executionGifPublicId: null,
            }
          : {
              equipmentImageUrl: null,
              equipmentImagePublicId: null,
            },
    })

    if (currentPublicId) {
      await storageDeletion.deleteNowOrEnqueue({
        resourceCategory: StorageDeletionCategory.EXERCISE_MEDIA,
        resourceType: StorageResourceType.IMAGE,
        publicId: currentPublicId,
        relatedRecordId: input.exercicioId,
      })
    }

    return updated
  }

  private async resolveProfessorId(auth: AuthContext): Promise<string | null> {
    if (auth.role === UserRole.PROFESSOR) {
      const professor = await prisma.professor.findUnique({
        where: { userId: auth.userId },
      })

      if (!professor) {
        throw new AppError("Professor não encontrado", 404)
      }

      return professor.id
    }

    if (auth.role === UserRole.ALUNO) {
      const aluno = await prisma.aluno.findUnique({
        where: { userId: auth.userId },
      })

      if (!aluno) {
        throw new AppError("Aluno não encontrado", 404)
      }

      return aluno.professorId
    }

    return null
  }

  private mapCategoryToGrupamento(categoryName?: string): GrupamentoMuscular {
    const normalized = (categoryName || "").toLowerCase()

    if (normalized.includes("chest") || normalized.includes("peito")) return "PEITO"
    if (normalized.includes("back") || normalized.includes("costas")) return "COSTAS"
    if (normalized.includes("leg") || normalized.includes("perna")) return "PERNAS"
    if (normalized.includes("shoulder") || normalized.includes("ombro")) return "OMBRO"
    if (normalized.includes("biceps") || normalized.includes("bíceps")) return "BICEPS"
    if (normalized.includes("triceps") || normalized.includes("tríceps")) return "TRICEPS"
    if (normalized.includes("abs") || normalized.includes("abdom")) return "ABDOMEN"
    if (normalized.includes("glute")) return "GLUTEOS"
    if (normalized.includes("cardio")) return "CARDIO"

    return "OUTRO"
  }

  private stripHtml(value: string): string {
    return value.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim()
  }
}
