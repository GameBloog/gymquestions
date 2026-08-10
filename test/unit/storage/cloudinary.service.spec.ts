import { describe, it, expect, vi, afterEach } from "vitest"
import { v2 as cloudinary } from "cloudinary"
import { CloudinaryService } from "../../../src/infraestructure/storage/cloudinary.service"
import { AppError } from "../../../src/shared/errors/app-error"

describe("CloudinaryService", () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe("signExerciseMediaUpload", () => {
    const input = {
      exercicioId: "11111111-1111-1111-1111-111111111111",
      kind: "aparelho" as const,
      mimetype: "image/png",
    }

    it("prende o destino ao exercício e ao kind, com sufixo único", () => {
      const primeiro = CloudinaryService.signExerciseMediaUpload(input)
      const segundo = CloudinaryService.signExerciseMediaUpload(input)

      expect(primeiro.publicId).toMatch(
        /^gym\/exercicios\/11111111-1111-1111-1111-111111111111\/aparelho\//,
      )
      // Sufixo único evita que o reenvio sobrescreva o asset ainda referenciado
      // pelo banco antes de a troca ser efetivada.
      expect(primeiro.publicId).not.toBe(segundo.publicId)
    })

    it("assina o public_id, de modo que trocá-lo invalida a assinatura", () => {
      const assinado = CloudinaryService.signExerciseMediaUpload(input)

      const reassinadoComOutroDestino = cloudinary.utils.api_sign_request(
        { ...assinado.params, public_id: "gym/outro-lugar/livre" },
        process.env.CLOUDINARY_API_SECRET as string,
      )

      expect(reassinadoComOutroDestino).not.toBe(assinado.signature)
    })

    it("reproduz a compressão que o sharp fazia no aparelho", () => {
      const assinado = CloudinaryService.signExerciseMediaUpload(input)

      expect(assinado.params.transformation).toBe("c_limit,w_1200,q_82")
      expect(assinado.params.format).toBe("jpg")
    })

    it("não recomprime a demonstração de execução e respeita o formato", () => {
      const gif = CloudinaryService.signExerciseMediaUpload({
        ...input,
        kind: "execucao",
        mimetype: "image/gif",
      })
      const webp = CloudinaryService.signExerciseMediaUpload({
        ...input,
        kind: "execucao",
        mimetype: "image/webp",
      })

      expect(gif.params.transformation).toBeUndefined()
      expect(gif.params.format).toBe("gif")
      expect(webp.params.format).toBe("webp")
    })
  })

  describe("findUploadedResource", () => {
    it("devolve null quando o asset não existe, em vez de estourar", async () => {
      vi.spyOn(cloudinary.api, "resource").mockRejectedValue({ http_code: 404 })

      await expect(
        CloudinaryService.findUploadedResource("gym/exercicios/x/execucao/y"),
      ).resolves.toBeNull()
    })

    it("converte falha inesperada em erro sem vazar o provedor", async () => {
      vi.spyOn(cloudinary.api, "resource").mockRejectedValue(
        new Error("provider leaked gym/exercicios/secret-path"),
      )
      vi.spyOn(console, "error").mockImplementation(() => undefined)

      await expect(
        CloudinaryService.findUploadedResource("gym/exercicios/x/execucao/y"),
      ).rejects.toMatchObject<AppError>({
        message: "Erro ao confirmar o arquivo enviado",
        statusCode: 500,
      })
    })
  })

  describe("deleteFile", () => {
    it("should propagate deletion failures without exposing the public id", async () => {
      vi.spyOn(cloudinary.uploader, "destroy").mockRejectedValue(
        new Error("provider leaked gym/private/fotos-shape/raw-public-id")
      )
      vi.spyOn(console, "error").mockImplementation(() => undefined)

      await expect(
        CloudinaryService.deleteFile("gym/private/fotos-shape/raw-public-id")
      ).rejects.toMatchObject<AppError>({
        message: "Erro ao deletar arquivo armazenado",
        statusCode: 500,
      })
    })
  })
})
