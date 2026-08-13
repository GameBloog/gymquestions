import { afterEach, describe, expect, it, vi } from "vitest"
import { ExercicioService } from "../../../src/application/use-cases/exercicio/exercicio-service"
import { CloudinaryService } from "../../../src/infraestructure/storage/cloudinary.service"
import { UploadTokenHelper } from "../../../src/infraestructure/security/upload-token"
import { prisma } from "../../../src/infraestructure/database/prisma"
import { UserRole } from "../../../src/domain/entities/user"

const EXERCICIO_ID = "11111111-1111-1111-1111-111111111111"

const baseExercise = {
  id: EXERCICIO_ID,
  nome: "Supino",
  descricao: null,
  grupamentoMuscular: "PEITO",
  executionGifUrl: "https://cdn.test/old.gif",
  executionGifPublicId: "old-public-id",
  equipmentImageUrl: null,
  equipmentImagePublicId: null,
  origem: "SISTEMA",
  externalId: null,
  externalSource: null,
  professorId: null,
  createdAt: new Date(),
  updatedAt: new Date(),
}

const admin = { userId: "admin-1", role: UserRole.ADMIN }

describe("Upload assinado de mídia de exercício", () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe("assinatura", () => {
    it("recusa aluno antes de assinar qualquer coisa", async () => {
      const assinar = vi.spyOn(CloudinaryService, "signExerciseMediaUpload")

      await expect(
        new ExercicioService().createExerciseMediaUploadSignature(
          { userId: "aluno-1", role: UserRole.ALUNO },
          { exercicioId: EXERCICIO_ID, kind: "execucao", mimetype: "image/gif" },
        ),
      ).rejects.toMatchObject({ statusCode: 403 })

      expect(assinar).not.toHaveBeenCalled()
    })

    it("aplica ao caminho assinado a mesma restrição de formato do multipart", async () => {
      vi.spyOn(prisma.exercicio, "findUnique").mockResolvedValue(
        baseExercise as never,
      )

      await expect(
        new ExercicioService().createExerciseMediaUploadSignature(admin, {
          exercicioId: EXERCICIO_ID,
          kind: "execucao",
          mimetype: "image/jpeg",
        }),
      ).rejects.toMatchObject({
        message: "Use GIF ou WebP para a demonstração de execução",
        statusCode: 400,
      })
    })

    it("nunca devolve o api_secret junto com os parâmetros", async () => {
      vi.spyOn(prisma.exercicio, "findUnique").mockResolvedValue(
        baseExercise as never,
      )

      const resposta =
        await new ExercicioService().createExerciseMediaUploadSignature(admin, {
          exercicioId: EXERCICIO_ID,
          kind: "execucao",
          mimetype: "image/gif",
        })

      expect(JSON.stringify(resposta)).not.toContain(
        process.env.CLOUDINARY_API_SECRET as string,
      )
      expect(resposta.uploadToken).toBeTruthy()
    })
  })

  describe("confirmação", () => {
    it("recusa token inválido", async () => {
      await expect(
        new ExercicioService().confirmExerciseMediaUpload(admin, {
          exercicioId: EXERCICIO_ID,
          kind: "execucao",
          uploadToken: "nao-e-um-token",
        }),
      ).rejects.toMatchObject({
        message: "Token de upload inválido ou expirado",
        statusCode: 400,
      })
    })

    // Esta é a garantia central do desenho: o public_id sai do token, então um
    // token emitido para outro exercício não serve para gravar aqui.
    it("recusa token emitido para outro exercício", async () => {
      const tokenDeOutro = UploadTokenHelper.generate({
        exercicioId: "22222222-2222-2222-2222-222222222222",
        kind: "execucao",
        publicId: "gym/exercicios/22222222-2222-2222-2222-222222222222/execucao/x",
      })

      await expect(
        new ExercicioService().confirmExerciseMediaUpload(admin, {
          exercicioId: EXERCICIO_ID,
          kind: "execucao",
          uploadToken: tokenDeOutro,
        }),
      ).rejects.toMatchObject({
        message: "Token de upload não corresponde a esta mídia",
        statusCode: 400,
      })
    })

    it("recusa token emitido para o outro kind do mesmo exercício", async () => {
      const tokenDeOutroKind = UploadTokenHelper.generate({
        exercicioId: EXERCICIO_ID,
        kind: "aparelho",
        publicId: `gym/exercicios/${EXERCICIO_ID}/aparelho/x`,
      })

      await expect(
        new ExercicioService().confirmExerciseMediaUpload(admin, {
          exercicioId: EXERCICIO_ID,
          kind: "execucao",
          uploadToken: tokenDeOutroKind,
        }),
      ).rejects.toMatchObject({ statusCode: 400 })
    })

    it("não grava nada quando o arquivo não chegou ao Cloudinary", async () => {
      vi.spyOn(prisma.exercicio, "findUnique").mockResolvedValue(
        baseExercise as never,
      )
      vi.spyOn(CloudinaryService, "findUploadedResource").mockResolvedValue(null)
      const updateMany = vi.spyOn(prisma.exercicio, "updateMany")

      await expect(
        new ExercicioService().confirmExerciseMediaUpload(admin, {
          exercicioId: EXERCICIO_ID,
          kind: "execucao",
          uploadToken: UploadTokenHelper.generate({
            exercicioId: EXERCICIO_ID,
            kind: "execucao",
            publicId: `gym/exercicios/${EXERCICIO_ID}/execucao/nunca-enviado`,
          }),
        }),
      ).rejects.toMatchObject({
        message: "Arquivo não encontrado no armazenamento",
        statusCode: 404,
      })

      expect(updateMany).not.toHaveBeenCalled()
    })

    it("usa a URL vinda do Cloudinary, não a informada pelo cliente", async () => {
      const atualizado = {
        ...baseExercise,
        executionGifUrl: "https://cdn.test/real.gif",
        executionGifPublicId: "novo-public-id",
      }

      vi.spyOn(prisma.exercicio, "findUnique")
        .mockResolvedValueOnce(baseExercise as never)
        .mockResolvedValueOnce(atualizado as never)
      vi.spyOn(CloudinaryService, "findUploadedResource").mockResolvedValue({
        url: "https://cdn.test/real.gif",
        publicId: "novo-public-id",
      })
      vi.spyOn(CloudinaryService, "deleteFile").mockResolvedValue("deleted")
      const updateMany = vi
        .spyOn(prisma.exercicio, "updateMany")
        .mockResolvedValue({ count: 1 } as never)

      const resultado = await new ExercicioService().confirmExerciseMediaUpload(
        admin,
        {
          exercicioId: EXERCICIO_ID,
          kind: "execucao",
          uploadToken: UploadTokenHelper.generate({
            exercicioId: EXERCICIO_ID,
            kind: "execucao",
            publicId: `gym/exercicios/${EXERCICIO_ID}/execucao/enviado`,
          }),
        },
      )

      expect(updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          data: {
            executionGifUrl: "https://cdn.test/real.gif",
            executionGifPublicId: "novo-public-id",
          },
        }),
      )
      expect(resultado.executionGifUrl).toBe("https://cdn.test/real.gif")
    })

    // A troca continua sendo condicionada ao public_id anterior. Duas
    // confirmações concorrentes não podem ambas vencer.
    it("mantém a concorrência otimista e compensa o asset órfão", async () => {
      vi.spyOn(prisma.exercicio, "findUnique").mockResolvedValue(
        baseExercise as never,
      )
      vi.spyOn(CloudinaryService, "findUploadedResource").mockResolvedValue({
        url: "https://cdn.test/perdido.gif",
        publicId: "publicid-perdido",
      })
      vi.spyOn(prisma.exercicio, "updateMany").mockResolvedValue({
        count: 0,
      } as never)
      const deleteFile = vi
        .spyOn(CloudinaryService, "deleteFile")
        .mockResolvedValue("deleted")

      await expect(
        new ExercicioService().confirmExerciseMediaUpload(admin, {
          exercicioId: EXERCICIO_ID,
          kind: "execucao",
          uploadToken: UploadTokenHelper.generate({
            exercicioId: EXERCICIO_ID,
            kind: "execucao",
            publicId: `gym/exercicios/${EXERCICIO_ID}/execucao/perdido`,
          }),
        }),
      ).rejects.toMatchObject({ statusCode: 409 })

      expect(deleteFile).toHaveBeenCalledWith(
        "publicid-perdido",
        expect.anything(),
      )
    })
  })
})
