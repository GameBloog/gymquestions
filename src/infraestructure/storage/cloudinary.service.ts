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
  private static uploadStream(
    buffer: Buffer,
    options: {
      folder: string
      resource_type: "image" | "raw"
      format?: string
      access_mode?: "public"
      type?: "upload"
    },
  ): Promise<UploadResult> {
    return new Promise<UploadResult>((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        options,
        (error, result) => {
          if (error) return reject(error)
          if (!result) return reject(new Error("Falha no upload"))

          resolve({
            url: result.secure_url,
            publicId: result.public_id,
          })
        },
      )

      uploadStream.end(buffer)
    })
  }

  static async uploadFotoShape(
    buffer: Buffer,
    alunoId: string,
  ): Promise<UploadResult> {
    try {
      const compressedBuffer = await sharp(buffer)
        .resize(800, null, { withoutEnlargement: true })
        .jpeg({ quality: 80 })
        .toBuffer()

      const result = await this.uploadStream(compressedBuffer, {
        folder: `gym/alunos/${alunoId}/fotos`,
        resource_type: "image",
        format: "jpg",
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
    tipo: "treino" | "dieta",
  ): Promise<UploadResult> {
    try {
      const result = await this.uploadStream(buffer, {
        folder: `gym/alunos/${alunoId}/${tipo}s`,
        resource_type: "raw",
        format: "pdf",
        access_mode: "public",
        type: "upload",
      })

      return result
    } catch (error) {
      console.error("Erro ao fazer upload do PDF:", error)
      throw new AppError("Erro ao fazer upload do arquivo", 500)
    }
  }

  static async uploadExerciseExecutionGif(
    buffer: Buffer,
    exercicioId: string,
    mimetype: string,
  ): Promise<UploadResult> {
    try {
      const format = mimetype === "image/webp" ? "webp" : "gif"

      return await this.uploadStream(buffer, {
        folder: `gym/exercicios/${exercicioId}/execucao`,
        resource_type: "image",
        format,
      })
    } catch (error) {
      console.error("Erro ao fazer upload do gif de execução:", error)
      throw new AppError("Erro ao fazer upload do gif de execução", 500)
    }
  }

  static async uploadExerciseEquipmentImage(
    buffer: Buffer,
    exercicioId: string,
  ): Promise<UploadResult> {
    try {
      const compressedBuffer = await sharp(buffer)
        .resize(1200, null, { withoutEnlargement: true })
        .jpeg({ quality: 82 })
        .toBuffer()

      return await this.uploadStream(compressedBuffer, {
        folder: `gym/exercicios/${exercicioId}/aparelho`,
        resource_type: "image",
        format: "jpg",
      })
    } catch (error) {
      console.error("Erro ao fazer upload da imagem do aparelho:", error)
      throw new AppError("Erro ao fazer upload da imagem do aparelho", 500)
    }
  }

  static async deleteFile(
    publicId: string,
    resourceType: "image" | "raw" = "image",
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
