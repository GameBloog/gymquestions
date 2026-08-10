import { sign, verify } from "jsonwebtoken"
import type { SignOptions, VerifyOptions } from "jsonwebtoken"
import { env } from "../../env"

// Audiencia propria, separada do token de sessao. Os dois sao assinados com
// JWT_SECRET, entao sem esta distincao um token de upload seria aceito por
// JwtHelper.verify (e vice-versa). O middleware de auth ja exige usuario
// existente no banco, o que limita o estrago, mas depender disso seria
// depender de um detalhe de outra camada.
const UPLOAD_AUDIENCE = "exercise-media-upload"

// Curto de proposito: o token so precisa sobreviver ao tempo entre pedir a
// assinatura e o navegador terminar de enviar o arquivo ao Cloudinary.
const UPLOAD_TOKEN_TTL_SECONDS = 900

export interface UploadTokenPayload {
  exercicioId: string
  kind: "execucao" | "aparelho"
  publicId: string
}

export class UploadTokenHelper {
  static generate(payload: UploadTokenPayload): string {
    const signOptions: SignOptions = {
      expiresIn: UPLOAD_TOKEN_TTL_SECONDS,
      algorithm: "HS256",
      audience: UPLOAD_AUDIENCE,
    }

    return sign(payload, env.JWT_SECRET, signOptions)
  }

  static verify(token: string): UploadTokenPayload {
    const verifyOptions: VerifyOptions = {
      algorithms: ["HS256"],
      audience: UPLOAD_AUDIENCE,
    }

    return verify(token, env.JWT_SECRET, verifyOptions) as UploadTokenPayload
  }
}
