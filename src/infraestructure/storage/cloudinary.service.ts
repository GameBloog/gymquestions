import { v2 as cloudinary } from "cloudinary"
import { env } from "@/env"
import sharp from "sharp"
import { AppError } from "@/shared/errors/app-error"

cloudinary.config({
  cloud_name: env.CLOUDINARY_CLOUD_NAME,
  api_key: env.CLOUDINARY_API_KEY,
  api_secret: env.CLOUDINARY_API_SECRET,
})

export interface UploadResult {
  url: string
  publicId: string
}

export class CloudinaryService {

  static async uploadFotoShape(
    buffer: Buffer,
    alunoId: string
  ): Promise<UploadResult> {
    try {
      const compressedBuffer = await sharp(buffer)
        .resize(800, null, { withoutEnlargement: true })
        .jpeg({ quality: 80 })
        .toBuffer()

      const result = await new Promise<UploadResult>((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          {
            folder: `gym/alunos/${alunoId}/fotos`,
            resource_type: "image",
            format: "jpg",
          },
          (error, result) => {
            if (error) return reject(error)
            if (!result) return reject(new Error("Falha no upload"))

            resolve({
              url: result.secure_url,
              publicId: result.public_id,
            })
          }
        )

        uploadStream.end(compressedBuffer)
      })

      return result
    } catch (error) {
      console.error("Erro ao fazer upload da foto:", error)
      throw new AppError("Erro ao fazer upload da foto", 500)
    }
  }


  static async uploadPDF(
    buffer: Buffer,
    alunoId: string,
    tipo: "treino" | "dieta"
  ): Promise<UploadResult> {
    try {
      const result = await new Promise<UploadResult>((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          {
            folder: `gym/alunos/${alunoId}/${tipo}s`,
            resource_type: "raw",
            format: "pdf",
          },
          (error, result) => {
            if (error) return reject(error)
            if (!result) return reject(new Error("Falha no upload"))

            resolve({
              url: result.secure_url,
              publicId: result.public_id,
            })
          }
        )

        uploadStream.end(buffer)
      })

      return result
    } catch (error) {
      console.error("Erro ao fazer upload do PDF:", error)
      throw new AppError("Erro ao fazer upload do arquivo", 500)
    }
  }


  static async deleteFile(
    publicId: string,
    resourceType: "image" | "raw" = "image"
  ): Promise<void> {
    try {
      await cloudinary.uploader.destroy(publicId, {
        resource_type: resourceType,
      })
    } catch (error) {
      console.error("Erro ao deletar arquivo:", error)
    }
  }
}
