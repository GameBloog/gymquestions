import { describe, it, expect, vi, afterEach } from "vitest"
import { v2 as cloudinary } from "cloudinary"
import { CloudinaryService } from "../../../src/infraestructure/storage/cloudinary.service"
import { AppError } from "../../../src/shared/errors/app-error"

describe("CloudinaryService", () => {
  afterEach(() => {
    vi.restoreAllMocks()
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
