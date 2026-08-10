import { v2 as cloudinary } from "cloudinary"
import { randomUUID } from "node:crypto"
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

export type DeleteFileResult = "deleted" | "not_found"

export interface SignedUploadParams {
  uploadUrl: string
  apiKey: string
  // Todos os campos aqui entram na assinatura e precisam ser reenviados pelo
  // cliente exatamente como vieram - qualquer divergencia invalida.
  params: Record<string, string | number>
  signature: string
  publicId: string
}

export class CloudinaryService {
  private static uploadStream(
    buffer: Buffer,
    options: {
      folder: string
      resource_type: "image" | "raw"
      format?: string
      access_mode?: "public" | "authenticated"
      type?: "upload" | "authenticated"
    },
  ): Promise<UploadResult> {
    return new Promise<UploadResult>((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        options,
        (error, result) => {
          if (error) return reject(error)
          if (!result) return reject(new Error("Falha no upload"))

          resolve({
            url: result.secure_url || `cloudinary://${result.public_id}`,
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
        folder: "gym/private/fotos-shape",
        resource_type: "image",
        format: "jpg",
        access_mode: "authenticated",
        type: "authenticated",
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
        folder: `gym/private/arquivos-aluno/${tipo}s`,
        resource_type: "raw",
        format: "pdf",
        access_mode: "authenticated",
        type: "authenticated",
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

  // --- Upload assinado direto do navegador ---------------------------------
  //
  // O arquivo vai do navegador para o Cloudinary sem passar pela Lambda. Isso
  // existe porque o caminho API Gateway -> Lambda tem teto de 6MB de payload
  // sincrono, e o conteudo binario ainda e inflado ~33% pela codificacao
  // base64 no meio - o teto util cai para ~4,5MB. Enviando direto, o tamanho
  // do arquivo deixa de ser limitado pela infraestrutura da API.
  //
  // O que impede um cliente de gravar onde quiser: o `public_id` e escolhido
  // AQUI, no servidor, e entra na assinatura. Alterar qualquer parametro
  // assinado invalida a assinatura, e o Cloudinary recusa. O cliente escolhe
  // apenas o conteudo do arquivo.
  static signExerciseMediaUpload(input: {
    exercicioId: string
    kind: "execucao" | "aparelho"
    mimetype: string
  }): SignedUploadParams {
    const timestamp = Math.floor(Date.now() / 1000)

    // randomUUID evita que reenviar a mesma midia sobrescreva o asset anterior
    // antes de o banco apontar para o novo - a troca continua sendo atomica no
    // updateMany, e o asset velho so morre depois, pela fila de limpeza.
    const publicId = `gym/exercicios/${input.exercicioId}/${input.kind}/${randomUUID()}`

    // Espelha o que o sharp fazia no caminho antigo: aparelho era
    // resize(1200, withoutEnlargement) + jpeg(82); execucao nao era
    // recomprimido, so tinha o formato forcado. c_limit e o equivalente de
    // withoutEnlargement (nunca amplia, so reduz).
    const isEquipment = input.kind === "aparelho"
    const format = isEquipment
      ? "jpg"
      : input.mimetype === "image/webp"
        ? "webp"
        : "gif"

    const paramsToSign: Record<string, string | number> = {
      public_id: publicId,
      timestamp,
      format,
      ...(isEquipment ? { transformation: "c_limit,w_1200,q_82" } : {}),
    }

    const signature = cloudinary.utils.api_sign_request(
      paramsToSign,
      env.CLOUDINARY_API_SECRET,
    )

    return {
      uploadUrl: `https://api.cloudinary.com/v1_1/${env.CLOUDINARY_CLOUD_NAME}/image/upload`,
      apiKey: env.CLOUDINARY_API_KEY,
      params: paramsToSign,
      signature,
      publicId,
    }
  }

  // Confirmacao nao acredita na palavra do cliente: consulta o Cloudinary para
  // provar que o asset existe naquele public_id e pegar a URL real. Sem isso,
  // um cliente poderia confirmar sem nunca ter enviado nada, e o banco ficaria
  // apontando para uma URL morta.
  static async findUploadedResource(
    publicId: string,
    resourceType: "image" | "raw" = "image",
  ): Promise<UploadResult | null> {
    try {
      const resource = (await cloudinary.api.resource(publicId, {
        resource_type: resourceType,
      })) as { secure_url?: string; public_id?: string }

      if (!resource?.public_id) {
        return null
      }

      return {
        url: resource.secure_url || `cloudinary://${resource.public_id}`,
        publicId: resource.public_id,
      }
    } catch (error) {
      const httpCode = (error as { http_code?: number })?.http_code

      if (httpCode === 404) {
        return null
      }

      console.error("Erro ao consultar arquivo enviado:", error)
      throw new AppError("Erro ao confirmar o arquivo enviado", 500)
    }
  }

  static async deleteFile(
    publicId: string,
    resourceType: "image" | "raw" = "image",
  ): Promise<DeleteFileResult> {
    try {
      const result = await cloudinary.uploader.destroy(publicId, {
        resource_type: resourceType,
      }) as { result?: string }

      return result.result === "not found" ? "not_found" : "deleted"
    } catch (error) {
      console.error("Erro ao deletar arquivo:", error)
      throw new AppError("Erro ao deletar arquivo armazenado", 500)
    }
  }

  static signedUrl(
    publicId: string,
    resourceType: "image" | "raw" = "image",
    expiresInSeconds = 300,
  ): string {
    return cloudinary.utils.private_download_url(publicId, "", {
      resource_type: resourceType,
      type: "authenticated",
      expires_at: Math.floor(Date.now() / 1000) + expiresInSeconds,
      attachment: false,
    })
  }
}
